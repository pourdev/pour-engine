// WCAG SC 1.4.1 Use of Color (Level A)
import { parseColor, contrastRatio, composite, effectiveBackground, backgroundImageSource } from '../../lib/contrast.js';

// Split a computed list value ("a, b(c, d), e") on the commas OUTSIDE
// parentheses: gradients and colour functions carry commas of their own.
const splitList = (value) => (value ?? '').split(/,(?![^(]*\))/).map((part) => part.trim());

const SIDES = ['Top', 'Right', 'Bottom', 'Left'];

// A border side paints only when it has width, a style and a visible
// colour. 2026-08-25 overnight audit: "border-bottom: 1px solid transparent"
// is the reveal-on-hover idiom and paints nothing at rest, and F73 says a cue
// "only provided on hover" still fails, so alpha is required here exactly as
// the background test already required it.
const sidePaints = (s, side) => parseFloat(s[`border${side}Width`]) > 0
  && s[`border${side}Style`] !== 'none'
  && (parseColor(s[`border${side}Color`])?.a ?? 0) > 0;

// A box-shadow paints only when some layer has a visible colour and a
// non-zero geometry: "0 0 0 0 currentColor" and a fully transparent shadow
// are the same hover-reveal idiom as the transparent border (2026-08-25
// overnight audit). Chrome's computed value reads "rgb(a)(...) x y blur
// spread [inset]" per layer.
function boxShadowPaints(boxShadow) {
  if (!boxShadow || boxShadow === 'none') return false;
  return splitList(boxShadow).some((layer) => {
    const colorText = layer.match(/[a-z-]+\([^)]*\)/)?.[0];
    const color = colorText ? parseColor(colorText) : null;
    if (color && color.a === 0) return false;
    const lengths = layer.replace(colorText ?? '', '').match(/-?[\d.]+(?=px)/g) ?? [];
    return !(lengths.length && lengths.every((n) => parseFloat(n) === 0));
  });
}

// Does a background-image paint anything at rest? 'no' when every layer is
// sized to nothing (the "background-size: 0 1px, grown on hover" underline
// idiom, 2026-08-25 overnight audit), 'unclear' when a no-repeat layer is
// parked outside the box so its resting geometry cannot be settled from
// computed style, 'yes' otherwise.
function backgroundImagePaints(s, rect) {
  if (!s.backgroundImage || s.backgroundImage === 'none') return 'no';
  const images = splitList(s.backgroundImage);
  const sizes = splitList(s.backgroundSize);
  const repeats = splitList(s.backgroundRepeat);
  const positions = splitList(s.backgroundPosition);
  let verdict = 'no';
  images.forEach((image, i) => {
    if (image === 'none') return;
    const size = sizes[i % sizes.length] || 'auto';
    if (/(^|\s)0(px|%)?(\s|$)/.test(size)) return; // a zero dimension paints nothing
    const repeat = repeats[i % repeats.length] || 'repeat';
    const position = positions[i % positions.length] || '0% 0%';
    if (repeat.includes('no-repeat')) {
      const outside = position.split(/\s+/).some((component, axis) => {
        const n = parseFloat(component);
        if (Number.isNaN(n)) return false;
        if (component.endsWith('%')) return n < 0 || n > 100;
        const extent = axis === 0 ? rect?.width : rect?.height;
        return n < 0 || (Number.isFinite(extent) && n > extent);
      });
      if (outside) { if (verdict === 'no') verdict = 'unclear'; return; }
    }
    verdict = 'yes';
  });
  return verdict;
}

// Read one ::before / ::after box on the link. 2026-08-25 overnight audit:
// querySelectorAll never yields pseudo-elements, so the everyday "custom
// underline" (an absolutely positioned 2px bar in ::after) was invisible to
// this rule. Returns 'cue' when the pseudo provably paints a shape at rest,
// 'glyph' when it draws text or an icon (a judgment by eye), 'unclear' when
// it paints something whose box computed style cannot measure, and null when
// it paints nothing (no content, collapsed by scaleX(0), zero box, hidden).
function pseudoCue(element, which) {
  let p;
  try { p = getComputedStyle(element, which); } catch { return null; }
  const content = p.content;
  if (!content || content === 'none' || content === 'normal' || p.display === 'none') return null;
  if (p.visibility !== 'visible' || parseFloat(p.opacity) === 0) return null;
  const matrix = (p.transform ?? 'none').match(/^matrix(3d)?\((.*)\)$/);
  if (matrix) {
    const n = matrix[2].split(',').map(parseFloat);
    const [a, b, c, d] = matrix[1] ? [n[0], n[1], n[4], n[5]] : n;
    if ((a === 0 && b === 0) || (c === 0 && d === 0)) return null; // scaleX(0) / scaleY(0): grown on hover
  }
  const width = parseFloat(p.width);
  const height = parseFloat(p.height);
  const glyph = (/^["'].+["']$/s.test(content) && parseFloat(p.fontSize) > 0)
    || /^(url|counter|counters|attr|image-set)\(/.test(content);
  const paintedBackground = (parseColor(p.backgroundColor)?.a ?? 0) > 0
    || backgroundImagePaints(p, Number.isNaN(width) ? null : { width, height }) === 'yes';
  const paintedBorder = SIDES.some((side) => sidePaints(p, side));
  if (paintedBackground || paintedBorder) {
    if (Number.isNaN(width) || Number.isNaN(height)) return glyph ? 'glyph' : 'unclear';
    const extra = (edges) => edges.reduce((sum, edge) => sum + (parseFloat(p[edge]) || 0), 0);
    const boxWidth = width + extra(['paddingLeft', 'paddingRight', 'borderLeftWidth', 'borderRightWidth']);
    const boxHeight = height + extra(['paddingTop', 'paddingBottom', 'borderTopWidth', 'borderBottomWidth']);
    if (boxWidth > 0 && boxHeight > 0) return 'cue';
  }
  if (glyph) {
    // A 1px clip box is the sr-only pattern: text for a screen reader, not a glyph anyone sees.
    if (!Number.isNaN(width) && !Number.isNaN(height) && width <= 1 && height <= 1) return null;
    return 'glyph';
  }
  return null;
}

const GRAPHIC = 'svg, img, picture, canvas, video, object, embed';

export default {
  id: 'link-in-text-block',
  name: 'Link distinction in text',
  impact: 'serious',
  tags: ['wcag2a', 'wcag141'],
  help: 'Links inside text must be distinguishable by more than colour',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html',
  // Only running prose counts as a "text block". <li> is included because
  // footers and credits routinely write sentences as list items ("built by
  // the <a>team</a> with help from <a>contributors</a>"), and those links are
  // embedded in prose exactly as 1.4.1 means it. Pure link lists (navs,
  // blogrolls) are still excluded, but by the ownText guard below rather than
  // by tag: in <li><a>Home</a></li> the item has no text of its own.
  // <div> was measured too and added nothing on any test site, so it stays
  // out rather than widening the blast radius for no gain.
  selector: 'p a[href], dd a[href], blockquote a[href], td a[href], li a[href]',
  visibility: 'visual', // colour distinction is a purely visual concern
  evaluate(element, { ownText }) {
    const parent = element.closest('p, dd, blockquote, td, li');
    if (!element.textContent.trim() || !parent) return { status: 'pass' };
    // Needs real surrounding text to blend into (1.4.1 is about links
    // embedded in prose, not a link that IS the content).
    if (ownText(parent).replace(/\s+/g, '').length < 10) return { status: 'pass' };

    const style = getComputedStyle(element);
    const parentStyle = getComputedStyle(parent);
    const weight = (s) => parseInt(s.fontWeight, 10) || 400;
    const slanted = (s) => /italic|oblique/.test(s.fontStyle ?? '');
    const parentSize = parseFloat(parentStyle.fontSize) || 16;
    // A cue counts wherever it is painted: sites routinely reset
    // text-decoration on the anchor and underline (or embolden) an inner
    // span that carries the text, so every visible text-bearing element in
    // the link vouches, not just the anchor. The >1px rect floor keeps
    // 1×1 sr-only clip spans from vouching for a cue nobody can see.
    // Empty descendants with a real box (an icon font's <i>, a decorative
    // span) vouch for painted shapes only, never for text properties.
    const cueBearers = [{ s: style, el: element, text: true }];
    // 2026-08-25 overnight audit: a rendered graphic inside the link (an
    // external-link arrow, a chevron, a download icon) is "some other means"
    // in F73's words, but whether it reads as part of the link is a judgment
    // by eye, so it demotes a colour-only verdict to review, never to pass.
    let graphic = false;
    for (const el of element.querySelectorAll('*')) {
      const rects = [...el.getClientRects()].filter((r) => r.width > 1 && r.height > 1);
      if (!rects.length) continue;
      if (el.matches(GRAPHIC)) {
        if (rects.some((r) => r.width >= 4 && r.height >= 4)) graphic = true;
        continue;
      }
      if (el.closest(GRAPHIC)) continue; // svg internals
      cueBearers.push({ s: getComputedStyle(el), el, text: !!el.textContent.trim() });
    }
    let unclear = false;
    for (const { s, el, text } of cueBearers) {
      if (text && (s.textDecorationLine ?? s.textDecoration ?? '').includes('underline')) return { status: 'pass' };
      // Underline substitutes count as non-colour cues too: border-bottom
      // "underlines", box-shadow underlines, and background chips/pills all
      // mark the link by shape, not colour alone.
      if (sidePaints(s, 'Bottom')) return { status: 'pass' };
      if (boxShadowPaints(s.boxShadow)) return { status: 'pass' };
      const ownBackground = parseColor(s.backgroundColor);
      if (ownBackground && ownBackground.a > 0) return { status: 'pass' };
      const painted = backgroundImagePaints(s, el.getBoundingClientRect()); // gradient/image underline technique
      if (painted === 'yes') return { status: 'pass' };
      if (painted === 'unclear') unclear = true;
      if (!text) continue;
      // A clear weight difference is a non-colour distinction too.
      if (Math.abs(weight(s) - weight(parentStyle)) >= 300) return { status: 'pass' };
      // 2026-08-25 overnight audit: F73's own list of other means names
      // "italicized" without qualification, so italic or oblique against
      // upright prose (either way round) is a cue in its own right.
      if (slanted(s) !== slanted(parentStyle)) return { status: 'pass' };
    }
    // A weight step of 200–299 (600-semibold links in 400 prose, the common
    // case) is a REAL non-colour cue, just not a clear one: whether it reads
    // as "bolded" (F73's word) depends on the face and the size, which is a
    // judgment by eye, not arithmetic. Adjudicated on the 2026-08-16 corpus
    // run (PostgreSQL ×32, visibly semibold): asserting fail overclaims,
    // passing waves through faces where the step is invisible — so it goes
    // to review. Below 200 the step is imperceptible at body sizes and earns
    // nothing.
    const textBearers = cueBearers.filter((b) => b.text).map((b) => b.s);
    const weightStep = Math.max(...textBearers.map((s) => Math.abs(weight(s) - weight(parentStyle))));
    // G182 also names "changes to the font size" as a cue. How large a step
    // reads as one is a judgment by eye, so a step of at least 2px and a
    // tenth of the prose size goes to the same review band as semibold
    // (2026-08-25 overnight audit).
    const sizeStep = Math.max(...textBearers.map((s) => Math.abs((parseFloat(s.fontSize) || parentSize) - parentSize)));
    const sizeCue = sizeStep >= 2 && sizeStep / parentSize >= 0.1;

    let linkColor = parseColor(style.color);
    let textColor = parseColor(parentStyle.color);
    if (!linkColor || !textColor) return { status: 'pass' };
    // 2026-08-25 overnight audit: a translucent colour is presented
    // composited over its backdrop (rgba(0,0,0,.3) in black prose on white
    // is a light grey, about 10:1 from the prose), and G183's ratio is a
    // property of the colours as presented. Composite both sides over the
    // effective background before the equality test and the ratio; over an
    // image there is no colour to composite against, so abstain.
    if ((linkColor.a ?? 1) < 1 || (textColor.a ?? 1) < 1) {
      if (backgroundImageSource(element)) {
        return {
          status: 'incomplete',
          message: 'This link has no underline and its colour is translucent over a background image or gradient, so its colour difference from the surrounding text depends on the pixels behind it. Check by eye that something other than colour identifies it as a link.',
          fix: 'Underline links inside text (text-decoration: underline), or add a non-colour indicator.',
        };
      }
      const backdrop = effectiveBackground(element);
      if (!backdrop) {
        return {
          status: 'incomplete',
          message: 'This link has no underline and its colour is translucent, but the background it composites over could not be determined. Check by eye that something other than colour identifies it as a link.',
          fix: 'Underline links inside text (text-decoration: underline), or add a non-colour indicator.',
        };
      }
      const over = (color) => ((color.a ?? 1) < 1 ? composite(color, backdrop) : color);
      linkColor = over(linkColor);
      textColor = over(textColor);
    }

    // A link styled to look NO different from the surrounding prose is not
    // a 1.4.1 failure — Understanding 1.4.1, in its own words: "a hyperlink
    // which has been styled to appear no different than neighboring static
    // text would not fail this success criterion, as there would be no
    // color differentiation between the actionable hyperlink text and the
    // adjacent static text." Colour conveys nothing when there is no colour
    // difference. A terrible link, but no WCAG criterion requires links to
    // look like links, and asserting one invents spec text (measured live:
    // hsbc.co.uk's footer, rgb(215,216,214) on both link and prose).
    // Channel equality, NOT the luminance ratio: a hue-only difference at
    // equal luminance also lands at 1.00:1, and that is the clearest F73
    // failure there is — the two cases are opposites and the ratio cannot
    // tell them apart. (Compared after compositing, so both sides are the
    // opaque colours actually presented.)
    const same = (x, y) => Math.round(x) === Math.round(y);
    if (same(linkColor.r, textColor.r) && same(linkColor.g, textColor.g) && same(linkColor.b, textColor.b)) {
      return { status: 'pass' };
    }

    const ratio = contrastRatio(linkColor, textColor);
    // WCAG technique G183: 3:1 against the surrounding text is a sufficient
    // colour difference for identifying a link.
    if (ratio >= 3) return { status: 'pass' };

    // 2026-08-25 overnight audit: text-decoration propagates from an
    // ancestor to its inline descendants and a descendant's "none" cannot
    // cancel it, so <u><a style="text-decoration:none"> is underlined. Walk
    // up to (but excluding) the block: an ancestor that wraps only the link
    // underlines the link; one that also wraps prose underlines the prose
    // too and singles nothing out, so it earns nothing.
    for (let ancestor = element.parentElement; ancestor && ancestor !== parent; ancestor = ancestor.parentElement) {
      if (!(getComputedStyle(ancestor).textDecorationLine ?? '').includes('underline')) continue;
      if (ancestor.textContent.replace(/\s+/g, '') === element.textContent.replace(/\s+/g, '')) return { status: 'pass' };
      break;
    }
    // Generated content on the anchor: read only now, on the failing path,
    // so passing links never pay for the two extra style reads.
    for (const which of ['::after', '::before']) {
      const verdict = pseudoCue(element, which);
      if (verdict === 'cue') return { status: 'pass' };
      if (verdict === 'glyph') graphic = true;
      if (verdict === 'unclear') unclear = true;
    }

    // LAST, because it's the expensive check (tree walk + line geometry)
    // and only failing candidates should ever pay for it: a link occupying
    // its own line (<br>-separated address blocks, one-link-per-line
    // footers) has no surrounding words to blend into — nothing is
    // conveyed by colour.
    //
    // Measured per LINE FRAGMENT, never on the bounding box. A link that
    // wraps has one fragment per line, and the middle of the box that
    // encloses them falls in the leading BETWEEN the lines, where no text
    // can ever be — so a box-midpoint test exempts every wrapped link in
    // prose, which is the opposite of what the check is for. F73 scopes
    // this criterion by whether a link sits within text, and says nothing
    // about lines: one fragment sharing its line with words is enough.
    const fragments = [...element.getClientRects()].filter((r) => r.width > 0 && r.height > 0);
    if (fragments.length) {
      const mids = fragments.map((r) => r.top + r.height / 2);
      const walker = element.ownerDocument.createTreeWalker(parent, NodeFilter.SHOW_TEXT);
      const range = element.ownerDocument.createRange();
      let sharesLine = false;
      for (let node = walker.nextNode(); node && !sharesLine; node = walker.nextNode()) {
        if (!node.textContent.trim() || element.contains(node)) continue;
        range.selectNodeContents(node);
        for (const r of range.getClientRects()) {
          if (r.width > 0 && mids.some((mid) => r.top <= mid && r.bottom >= mid)) { sharesLine = true; break; }
        }
      }
      if (!sharesLine) return { status: 'pass' };
    }
    const shown = ratio.toFixed(2);
    const reviewFix = 'Underline links inside text (text-decoration: underline), or add another clear non-colour indicator.';
    if (graphic) {
      return {
        status: 'incomplete',
        message: `This link has no underline and only ${shown}:1 colour difference from the surrounding text, but it carries an icon or image. Judge by eye whether the graphic reads as part of the link and marks it out from the prose; if it does not, this fails SC 1.4.1.`,
        fix: reviewFix,
      };
    }
    if (unclear) {
      return {
        status: 'incomplete',
        message: `This link has no underline and only ${shown}:1 colour difference from the surrounding text, but a generated box or background image is painted on it whose size at rest could not be measured. Check by eye whether it draws a visible underline or shape; if nothing shows until hover, this fails SC 1.4.1.`,
        fix: reviewFix,
      };
    }
    if (weightStep >= 200) {
      return {
        status: 'incomplete',
        message: `This link has no underline and only ${shown}:1 colour difference from the surrounding text, but its font weight differs from the prose by ${weightStep}: a visible non-colour cue that falls short of a clear bold step. Judge by eye whether the weight alone identifies it as a link in this face and size; if it does not, this fails SC 1.4.1.`,
        fix: 'Underline links inside text (text-decoration: underline), raise the weight difference to a clear bold step, or add another non-colour indicator.',
      };
    }
    if (sizeCue) {
      return {
        status: 'incomplete',
        message: `This link has no underline and only ${shown}:1 colour difference from the surrounding text, but its font size differs from the prose by ${sizeStep.toFixed(1).replace(/\.0$/, '')}px, one of the cues G182 names. Judge by eye whether the size alone identifies it as a link; if it does not, this fails SC 1.4.1.`,
        fix: reviewFix,
      };
    }
    return {
      status: 'fail',
      // The measured fact is the ratio against G183's threshold, and that is
      // all this says. Naming a group who "can't see it" overclaims: a
      // saturated red against near-white misses 3:1 on luminance while
      // staying perfectly distinct to most people, including most red-green
      // colour blindness, where the red darkens and the gap widens.
      message: ratio < 1.01
        ? 'This link has no underline and its colour differs from the surrounding text in hue alone, with no luminance difference: the distinction disappears entirely without colour vision, the exact failure F73 describes.'
        : `This link has no underline and only ${shown}:1 colour difference from the surrounding text, below the 3:1 WCAG technique G183 asks for when colour is the only thing marking a link.`,
      fix: 'Underline links inside text (text-decoration: underline), or add a non-colour indicator.',
    };
  },
};
