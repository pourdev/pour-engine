// WCAG SC 1.4.1 Use of Color (Level A)
import { parseColor, contrastRatio } from '../../lib/contrast.js';

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
    // A cue counts wherever it is painted: sites routinely reset
    // text-decoration on the anchor and underline (or embolden) an inner
    // span that carries the text, so every visible text-bearing element in
    // the link vouches, not just the anchor. The >1px rect floor keeps
    // 1×1 sr-only clip spans from vouching for a cue nobody can see.
    const cueBearers = [style];
    for (const el of element.querySelectorAll('*')) {
      if (!el.textContent.trim()) continue;
      if ([...el.getClientRects()].some((r) => r.width > 1 && r.height > 1)) cueBearers.push(getComputedStyle(el));
    }
    for (const s of cueBearers) {
      if ((s.textDecorationLine ?? s.textDecoration ?? '').includes('underline')) return { status: 'pass' };
      // Underline substitutes count as non-colour cues too: border-bottom
      // "underlines", box-shadow underlines, and background chips/pills all
      // mark the link by shape, not colour alone.
      if (parseFloat(s.borderBottomWidth) > 0 && s.borderBottomStyle !== 'none') return { status: 'pass' };
      if (s.boxShadow && s.boxShadow !== 'none') return { status: 'pass' };
      const ownBackground = parseColor(s.backgroundColor);
      if (ownBackground && ownBackground.a > 0) return { status: 'pass' };
      if (s.backgroundImage !== 'none') return { status: 'pass' }; // gradient/image underline technique
      // A clear weight difference is a non-colour distinction too.
      if (Math.abs(weight(s) - weight(parentStyle)) >= 300) return { status: 'pass' };
    }
    // A weight step of 200–299 (600-semibold links in 400 prose, the common
    // case) is a REAL non-colour cue, just not a clear one: whether it reads
    // as "bolded" (F73's word) depends on the face and the size, which is a
    // judgment by eye, not arithmetic. Adjudicated on the 2026-08-16 corpus
    // run (PostgreSQL ×32, visibly semibold): asserting fail overclaims,
    // passing waves through faces where the step is invisible — so it goes
    // to review. Below 200 the step is imperceptible at body sizes and earns
    // nothing.
    const weightStep = Math.max(...cueBearers.map((s) => Math.abs(weight(s) - weight(parentStyle))));

    const linkColor = parseColor(style.color);
    const textColor = parseColor(parentStyle.color);
    if (!linkColor || !textColor) return { status: 'pass' };

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
    // tell them apart.
    if (linkColor.r === textColor.r && linkColor.g === textColor.g
      && linkColor.b === textColor.b && (linkColor.a ?? 1) === (textColor.a ?? 1)) {
      return { status: 'pass' };
    }

    const ratio = contrastRatio(linkColor, textColor);
    // WCAG technique G183: 3:1 against the surrounding text is a sufficient
    // colour difference for identifying a link.
    if (ratio >= 3) return { status: 'pass' };

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
    if (weightStep >= 200) {
      return {
        status: 'incomplete',
        message: `This link has no underline and only ${ratio.toFixed(2)}:1 colour difference from the surrounding text, but its font weight differs from the prose by ${weightStep}: a visible non-colour cue that falls short of a clear bold step. Judge by eye whether the weight alone identifies it as a link in this face and size; if it does not, this fails SC 1.4.1.`,
        fix: 'Underline links inside text (text-decoration: underline), raise the weight difference to a clear bold step, or add another non-colour indicator.',
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
        : `This link has no underline and only ${ratio.toFixed(2)}:1 colour difference from the surrounding text, below the 3:1 WCAG technique G183 asks for when colour is the only thing marking a link.`,
      fix: 'Underline links inside text (text-decoration: underline), or add a non-colour indicator.',
    };
  },
};
