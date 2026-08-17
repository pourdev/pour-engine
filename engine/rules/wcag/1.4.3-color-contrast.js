// WCAG SC 1.4.3 Contrast (Minimum) (Level AA)
import {
  parseColor, contrastRatio, composite, effectiveBackground, backgroundObscured,
  backgroundImageSource, backgroundImagePaintRect, imagePaintRectInBox, imageLuminanceRange,
  gradientLuminanceRange, rangeVerdict, rangeWithBackdrop, isLargeText, cumulativeOpacity,
  opacityAnimating, restingOpacity, mediaRects, inZeroClipSubtree,
  paintedBackdrop, opaquePanelRects, viewportVeil, textShadowHalo, textShadowNegligible,
  pseudoBackdropForText, filmedContrastBounds, backgroundColorSource, scrimPaint, applyOverlays,
  showRatio,
} from '../../lib/contrast.js';

/** The strict separator set for the pure-decoration exemption: pipes,
 *  interpuncts, slashes, dashes and guillemets — one glyph, optionally
 *  repeated ("···"). Deliberately excludes brackets, colons, stars and
 *  every character that carries grouping, rating or code meaning. */
const SEPARATOR_GLYPHS = /^([|¦·•∙‧/⁄\\‐‑‒–—―⁃«»‹›-])\1*$/;

/** Serialise a judged colour for the report and the checker link. Composited
 *  channels keep up to two decimals: rounding them to integers changes the
 *  pair enough that the checker scores a different ratio than the audit
 *  reported (4.21 vs 4.19 on a 70%-opacity footer). */
const channelText = (value) => String(Math.round(value * 100) / 100);
const asRgb = (color) => `rgb(${channelText(color.r)}, ${channelText(color.g)}, ${channelText(color.b)})`;

/** The one case a full-page veil still can't be judged for the author: the
 *  resting page and the dimmed one land on opposite sides of the threshold,
 *  so the verdict depends on whether the veil is transient or permanent. */
const veiledIncomplete = (resting, veiled) => ({
  status: 'incomplete',
  message: 'This text sits behind a translucent full-page overlay (a modal or loading veil), which changes its presented contrast'
    + (resting && veiled
      ? `: ${showRatio(resting)}:1 at rest, ${showRatio(veiled)}:1 as presented through the overlay, which straddles the threshold`
      : '')
    + ' — judge the page with the overlay dismissed, or the dimmed state by eye if the overlay is permanent.',
});

/**
 * Is a duplicate copy of the same text painted exactly on top of this
 * element? The gradient-text pattern ships two copies — a plain-colour
 * fallback underneath and a background-clip:text copy above it — and only
 * the top copy is ever seen; the covered one must not be judged.
 */
function coveredByTextTwin(element) {
  const doc = element.ownerDocument;
  if (typeof doc.elementsFromPoint !== 'function') return false;
  const text = element.textContent.trim();
  if (!text) return false;
  const rect = element.getBoundingClientRect();
  const win = doc.defaultView;
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  if (x < 0 || y < 0 || x >= win.innerWidth || y >= win.innerHeight) return false;
  const stack = doc.elementsFromPoint(x, y);
  const index = stack.indexOf(element);
  if (index <= 0) return false;
  return stack.slice(0, index).some((layer) =>
    !layer.contains(element) && !element.contains(layer) && layer.textContent.trim() === text);
}

/** Do any of the element's own text boxes MEANINGFULLY overlap the given
 *  rect? Slivers under 3px per axis don't count: wrapped text reports
 *  hanging trailing spaces as part of the line box, which "overlaps"
 *  right-edge icons without a single glyph being anywhere near them. */
function textIntersects(element, rect) {
  // Bounding-box prefilter: this now also runs for PASSING text on the
  // unverified-backdrop path, i.e. for most elements on long pages — the
  // Range machinery below must only spin up for genuine near-overlaps.
  const box = element.getBoundingClientRect();
  if (Math.min(box.right, rect.right) - Math.max(box.left, rect.left) < 3
    || Math.min(box.bottom, rect.bottom) - Math.max(box.top, rect.top) < 3) return false;
  const range = element.ownerDocument.createRange();
  for (const node of element.childNodes) {
    if (node.nodeType !== Node.TEXT_NODE || !node.textContent.trim()) continue;
    range.selectNodeContents(node);
    for (const r of range.getClientRects()) {
      const overlapX = Math.min(r.right, rect.right) - Math.max(r.left, rect.left);
      const overlapY = Math.min(r.bottom, rect.bottom) - Math.max(r.top, rect.top);
      if (overlapX >= 3 && overlapY >= 3) return true;
    }
  }
  return false;
}

/**
 * Where does this background image stand relative to the element's text?
 *   'clear'   — provably NOT under any text box (single no-repeat image
 *               whose paint rect misses them, e.g. an icon in padding)
 *   'under'   — provably overlapping a text box
 *   'unknown' — geometry not statically computable (repeats, cover,
 *               stacked layers) — judged conservatively by the caller
 * `intrinsic` rides along so the caller can reason about icon-sized images.
 */
async function imageVsText(imageSource, element, doc) {
  const url = imageSource.css.match(/url\(["']?(.*?)["']?\)/)?.[1];
  let intrinsic = null;
  if (url) {
    try { intrinsic = await imageLuminanceRange(new URL(url, doc.baseURI).href); } catch { /* unknowable */ }
  }
  // Browsers report 300×150 for SVGs with no intrinsic dimensions — a
  // sentinel, not a size. Geometry computed from it is fiction, so the
  // paint rect must not use it (icon SVGs would "cover" all the text).
  const dimensionless = !intrinsic || !intrinsic.width
    || (intrinsic.width === 300 && intrinsic.height === 150);
  // A gradient has no intrinsic size and never will, but that is not the
  // same as an unknown paint area: with the default background-size it fills
  // its carrier's painting box exactly. Lumping it in with "we cannot tell
  // how big this is" meant a gradient could never earn a definite verdict,
  // however large the panel it covers. Its scale is the carrier's, unless
  // background-size names something small, which is the one way a gradient
  // really is icon-scale (a tiny repeated swatch).
  const isGradient = !url && imageSource.css.includes('gradient(');
  let sizedSmall = false;
  if (isGradient) {
    const size = getComputedStyle(imageSource.element).backgroundSize ?? '';
    const px = [...size.matchAll(/(\d+(?:\.\d+)?)px/g)].map((m) => parseFloat(m[1]));
    sizedSmall = px.length > 0 && px.every((value) => value <= 40);
  }
  const paint = backgroundImagePaintRect(imageSource.element, dimensionless ? null : intrinsic);
  if (!paint) return { relation: 'unknown', intrinsic, dimensionless, isGradient, sizedSmall };
  return {
    relation: textIntersects(element, paint) ? 'under' : 'clear',
    intrinsic, dimensionless, isGradient, sizedSmall,
  };
}

/**
 * Text that screen readers announce but sighted users never see — 1.4.3 only
 * applies to visually presented text, so these patterns are exempt:
 *   - image-replacement: text-indent flings the line box off-canvas
 *     (e.g. GOV.UK search buttons use text-indent: -5000px over an icon)
 *   - sr-only: a ≤1px box with the text clipped away
 *   - font-size: 0, fully transparent text, opacity: 0
 */
function textVisuallyHidden(element, style, foreground) {
  if (foreground?.a === 0) return true;
  if (parseFloat(style.fontSize) === 0) return true;
  if (parseFloat(style.opacity) === 0) return true;
  const indent = parseFloat(style.textIndent) || 0;
  const clipped = /hidden|clip/.test(`${style.overflow} ${style.overflowX} ${style.overflowY}`)
    || style.clipPath !== 'none' || (style.clip !== 'auto' && style.position === 'absolute');
  // Nothing on the element itself hints at hiding: the recipe may still sit
  // on a WRAPPER (a chart's sr-only data table hides the table; the judged
  // cell inside computes clip: auto) — the ancestor walk is cached per
  // container, so this stays affordable on every text element.
  if (!clipped && Math.abs(indent) <= 1000) return inZeroClipSubtree(element);
  const rect = element.getBoundingClientRect();
  if ((rect.width <= 1 || rect.height <= 1) && clipped) return true;
  if (Math.abs(indent) > rect.width && (clipped || Math.abs(indent) > 1000)) return true;
  return inZeroClipSubtree(element);
}

// Turn a luminance-range bracket into a rule outcome (or null = can't tell).
function verdictFromRange(range, foreground, required, what) {
  if (!range) return null;
  const { verdict, worst, best } = rangeVerdict(foreground, range, required);
  if (verdict === 'pass') return { status: 'pass' };
  if (verdict === 'fail') {
    return {
      status: 'fail',
      message: `Contrast against the ${what} behind this text is at best ${showRatio(best)}:1 — below the ${required}:1 minimum against every part of it.`,
      fix: 'Change the text colour, or place a solid overlay between the text and the image.',
    };
  }
  return {
    status: 'incomplete',
    message: `The ${what} behind this text has both light and dark areas (contrast ranges ${showRatio(worst)}–${showRatio(best)}:1 for this text) — whether it passes depends on the exact overlap, check by eye.`,
  };
}

/**
 * Is there translucent paint over the background image that the ancestor walk
 * could NOT have collected? Two shapes dominate real hero banners: a
 * ::before/::after scrim, and an absolutely-positioned sibling laid over the
 * photo. Neither is on the text's ancestor chain, so backgroundImageSource
 * never sees them, and judging the raw image pixels would describe a page the
 * user is not looking at. Ancestor scrims are excluded here because they are
 * already composited into the sampled pixels.
 */
function unaccountedScrim(element, imageCarrier) {
  const pseudo = pseudoBackdropForText(element);
  if (pseudo?.color?.a > 0) return true;
  const doc = element.ownerDocument;
  if (typeof doc.elementsFromPoint !== 'function') return false;
  const rect = element.getBoundingClientRect();
  const win = doc.defaultView;
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  if (x < 0 || y < 0 || x >= win.innerWidth || y >= win.innerHeight) return false;
  const stack = doc.elementsFromPoint(x, y);
  const start = stack.indexOf(element);
  if (start === -1) return false;
  return stack.slice(start + 1).some((layer) => {
    if (layer.contains(element) || layer === imageCarrier) return false; // ancestor chain: already composited
    const color = parseColor(getComputedStyle(layer).backgroundColor);
    return color && color.a > 0;
  });
}

/** An image layer with no opaque pixels: it covers the background without
 *  changing it, so the callers step over it rather than reporting on it. */
const PAINTS_NOTHING = Symbol('fully transparent image layer');

/** The flat paint directly beneath a carrier's background-image: the
 *  carrier's own background-color composited over whatever resolves behind
 *  the carrier. This is what shows through the image's transparent pixels.
 *  Null when it is itself unknowable (another image or an unresolvable
 *  chain behind) — the sampling then has no floor to extend its range with. */
function paintUnderImage(carrier) {
  const color = parseColor(getComputedStyle(carrier).backgroundColor);
  if (color && color.a >= 1) return color;
  const parent = carrier.parentElement ?? carrier.getRootNode()?.host ?? null;
  const behind = parent ? effectiveBackground(parent) : null;
  if (!behind) return null;
  return color && color.a > 0 ? composite(color, behind) : behind;
}

// Bracket the verdict by sampling what's actually painted: image pixels
// (same-origin/CORS only) or gradient colour stops. Returns an outcome,
// PAINTS_NOTHING, or null when nothing here can be sampled at all (stacked
// layers, translucent gradient stops) and the caller must say so itself.
// `under` is the colour painted beneath the sampled layer, when the caller
// knows it: an image with see-through pixels shows that colour wherever the
// ink is absent, so the judged range must include it — and without it no
// verdict can be asserted from such an image at all.
async function sampledVerdict(source, foreground, required, doc, overlays = [], under = null) {
  if (!source) return null;
  let range = null;
  let what = 'image';
  if (source.tagName === 'IMG') {
    range = await imageLuminanceRange(source.currentSrc || source.src, overlays);
  } else {
    const css = source.css ?? getComputedStyle(source).backgroundImage;
    if (!css || css === 'none') return null;
    if ((css.match(/url\(/g) ?? []).length + (css.match(/gradient\(/g) ?? []).length > 1) return null; // stacked layers: too complex
    const url = css.match(/url\(["']?(.*?)["']?\)/)?.[1];
    if (url) {
      let absolute;
      try { absolute = new URL(url, doc.baseURI).href; } catch { return null; }
      range = await imageLuminanceRange(absolute, overlays);
    } else if (css.includes('gradient(')) {
      range = gradientLuminanceRange(css, overlays);
      what = 'gradient';
    } else {
      return null;
    }
  }
  // Checked before the text's own alpha: there is no blend to reason about
  // when the layer paints nothing.
  if (range?.transparent) return PAINTS_NOTHING;
  // See-through pixels reveal the layer beneath: widen the range with it
  // when it is known; when it isn't, the ink pixels alone prove nothing —
  // a mostly-transparent illustration sampled dark was failing text that
  // really sat on the white showing through it.
  if (range?.hasAlpha) {
    range = rangeWithBackdrop(range, under, overlays);
    if (!range) {
      return {
        status: 'incomplete',
        message: `The ${what} behind this text has transparent regions, so parts of the text sit on whatever is painted beneath it, and that layer could not be resolved — check the contrast by eye.`,
      };
    }
  }
  // Translucent text takes its presented colour from the very pixels
  // beneath it, so a luminance range of the backdrop cannot be read straight
  // off: dimmed white over a dark photo reads mid-grey, not white.
  //
  // It CAN still be bracketed, by compositing the text over each end of the
  // backdrop's range and judging each blend against the backdrop it was
  // blended with. That bracket is sound in one direction only. Ratio is not
  // monotonic in backdrop luminance — as the composited text passes through
  // the backdrop's own luminance the ratio collapses toward 1:1 — so an
  // interior point can be WORSE than both ends but never better. Both ends
  // failing therefore proves the whole range fails; both ends passing proves
  // nothing about the middle, and stays a human call.
  if (foreground.a < 1) {
    const ends = [range?.minColor, range?.maxColor].filter(Boolean);
    if (ends.length === 2) {
      const ratios = ends.map((backdrop) => contrastRatio(composite(foreground, backdrop), backdrop));
      if (ratios.every((ratio) => ratio < required)) {
        const best = Math.max(...ratios);
        return {
          status: 'fail',
          message: `This text is translucent, so it blends with what is behind it: against every part of that backdrop the blend reaches at best ${showRatio(best)}:1, below the ${required}:1 minimum.`,
          fix: 'Raise the text opacity, change its colour, or put a solid layer between the text and the backdrop.',
          data: { ratio: Number(showRatio(best)), required },
        };
      }
    }
    return {
      status: 'incomplete',
      message: 'This text is translucent over an image or gradient, so its presented colour depends on the pixels beneath — contrast must be checked by eye.',
    };
  }
  // An image we tried to read and couldn't: that is a specific, reportable
  // fact, and the only one of these paths where cross-origin is the cause.
  if (!range && what === 'image') {
    return {
      status: 'incomplete',
      message: 'The image painted behind this text can’t be read: it is cross-origin, or it failed to load, so a script can’t sample its colours. Check the contrast by eye.',
    };
  }
  return verdictFromRange(range, foreground, required, what);
}

/**
 * Both contrast criteria run the same machinery with different thresholds:
 * 1.4.3 Contrast (Minimum), AA — 4.5:1, or 3:1 for large text
 * 1.4.6 Contrast (Enhanced), AAA — 7:1, or 4.5:1 for large text
 */
export function createContrastRule({ id, tags, help, helpUrl, thresholds }) {
  return {
  id,
  impact: 'serious',
  tags,
  help,
  helpUrl,
  // Every element except the ones whose text is judged elsewhere or isn't
  // CSS-colour text at all: a tag allow-list silently skipped visible text
  // in anything it forgot (form, center, font, custom elements — Hacker
  // News writes "Search:" directly inside <form>), and the own-text check
  // below keeps the empty wrappers out of the results either way. Form
  // controls stay out because control-contrast judges their text; SVG/MathML
  // stay out because their glyphs are painted by fill, not color.
  selector:
    '*:not(script):not(style):not(noscript):not(title):not(option):not(optgroup)' +
    ':not(input):not(textarea):not(select):not(svg):not(svg *):not(math):not(math *)',
  visibility: 'visual', // contrast is seen by sighted users even in aria-hidden content
  async evaluate(element, { ownText }) {
    if (!ownText(element)) return { status: 'pass' }; // no text of its own to judge

    // The criterion exempts "inactive user interface components".
    if (element.closest(':disabled, [aria-disabled="true"]')) return { status: 'pass' };

    // A shadow HOST's own text renders through its shadow tree: when a
    // <slot> projects it, the text inherits styles from the slot's
    // shadow-side parent, NOT from the host — a consent banner's shadow
    // <p> painted the slotted copy near-white while the host computed
    // black, and the host-styled pair was one no user ever sees. With no
    // slot to project it, the host's own text does not render at all.
    // (Closed shadow roots are undetectable; those hosts keep the old
    // behaviour.)
    let styleSource = element;
    if (element.shadowRoot) {
      const ownTextNode = [...element.childNodes]
        .find((node) => node.nodeType === 3 && node.textContent.trim());
      const slot = ownTextNode?.assignedSlot ?? null;
      if (!slot) return { status: 'pass' }; // unprojected: not rendered
      styleSource = slot;
    }
    const style = getComputedStyle(styleSource);

    // A lone separator glyph between inline items is 1.4.3 "pure
    // decoration": it does the job a border does (and borders carry no
    // text-contrast requirement), and the ARIA Authoring Practices tell
    // authors to draw exactly these separators in CSS or aria-hidden them.
    // Strictly bounded — one repeated glyph from a fixed separator set,
    // inline, outside code and interactive content, with rendered content
    // on BOTH sides — so Python's `>>>` prompt, code operators, maths in
    // prose and meaning-bearing brackets all keep their verdicts.
    if (SEPARATOR_GLYPHS.test(ownText(element))
      && style.display.startsWith('inline')
      && !element.closest('code, pre, samp, kbd, var, a[href], button, [role="button"], [role="link"], [role="menuitem"], [role="tab"], [role="option"]')) {
      const hasContent = (start, dir) => {
        for (let node = start; node; node = node[dir]) {
          if (node.nodeType === 3 && node.textContent.trim()) return true;
          if (node.nodeType === 1 && (node.textContent.trim()
            || node.matches('img, svg, video, canvas, input, select, button'))) return true;
        }
        return false;
      };
      if (hasContent(element.previousSibling, 'previousSibling')
        && hasContent(element.nextSibling, 'nextSibling')) {
        return { status: 'pass' };
      }
    }

    // Controls conveying "disabled" without the attribute: pointer-events:
    // none on an interactive element is functional inertness — the low
    // contrast IS the disabled styling (carousel arrows at the end of
    // their range, steppers at their limit). But only for COMPACT widgets:
    // a card-sized inert link full of prose (an inactive carousel slide) is
    // content someone is expected to read, and whether "temporarily
    // non-interactive" makes it an exempt inactive component under 1.4.3 is
    // a human judgement — never a silent pass.
    const control = element.closest('button, a[href], input, select, [role="button"], [role="link"], [role="option"], [role="tab"]');
    if (control && getComputedStyle(control).pointerEvents === 'none') {
      if ((control.textContent || '').trim().length <= 80) return { status: 'pass' };
      return {
        status: 'incomplete',
        message: 'This text sits inside a non-interactive (pointer-events: none) control with substantial content — a disabled control\'s dimmed text is exempt from contrast, but an inactive content slide is not. Judge which this is by eye.',
      };
    }

    // The colour that actually paints the glyphs. -webkit-text-fill-color
    // overrides color when set; background-clip: text paints the text with
    // the background layers instead — judged by their colours, not color.
    const fill = parseColor(style.webkitTextFillColor);
    const clipsText = /\btext\b/.test(style.webkitBackgroundClip ?? '') || /\btext\b/.test(style.backgroundClip ?? '');
    if (clipsText) {
      const behind = effectiveBackground(element.parentElement ?? element);
      const fgRange = style.backgroundImage !== 'none' ? gradientLuminanceRange(style.backgroundImage) : null;
      if (fgRange && behind) {
        // Symmetric bracket: text luminance spans the gradient's stops.
        const required = isLargeText(style) ? thresholds.large : thresholds.normal;
        return verdictFromRange(fgRange, behind, required, 'gradient painting this text') ?? {
          status: 'incomplete',
          message: 'This text is painted with its background layer (background-clip: text) — contrast must be checked by eye.',
        };
      }
      return {
        status: 'incomplete',
        message: 'This text is painted with its background layer (background-clip: text) — contrast must be checked by eye.',
      };
    }
    let foreground = fill && style.webkitTextFillColor !== style.color ? fill : parseColor(style.color);
    // Visually hidden text (sr-only, image replacement) has no visual
    // presentation for contrast to apply to — screen readers still read it.
    if (textVisuallyHidden(element, style, foreground)) return { status: 'pass' };
    if (!foreground) {
      return { status: 'incomplete', message: 'The text colour could not be parsed — check contrast by eye.' };
    }
    const required = isLargeText(style) ? thresholds.large : thresholds.normal;
    const doc = element.ownerDocument;

    // Judge the opacity the text RESTS at, not a transient frame. Elements
    // with a RUNNING opacity animation anywhere up the flat tree are judged
    // at the animation's landing value (a fill-forwards entrance ending at
    // full is judged at full; one parking at 30% is judged dim — inactive
    // carousel slides). Unknowable landings (infinite loops, no-fill) are
    // judged at full — never failing text on a frame that won't persist.
    // Near-zero resting opacity means the text isn't visually presented.
    const opacity = opacityAnimating(element) ? restingOpacity(element) : cumulativeOpacity(element);
    if (opacity < 0.05) return { status: 'pass' };
    if (opacity < 1) foreground = { ...foreground, a: foreground.a * opacity };

    // A background image on an ancestor: sample its pixels and bracket —
    // but only when it's actually painted under this text. Icon-in-padding
    // images (external-link arrows etc.) don't affect the text's contrast.
    const imageSource = backgroundImageSource(element);
    if (imageSource) {
      const { relation, intrinsic, dimensionless, isGradient, sizedSmall } = await imageVsText(imageSource, element, doc);
      if (relation !== 'clear') {
        // imageSource.overlays are the translucent layers painted between the
        // image and this text (hero scrims, tint panels). Judging the raw
        // image pixels would describe a page the user never sees.
        let sampled = await sampledVerdict(imageSource, foreground, required, doc, imageSource.overlays,
          paintUnderImage(imageSource.element));
        // A layer with no opaque pixels changes nothing about what is behind
        // the glyphs, so it must not block the verdict: fall through and
        // judge the background that actually paints.
        if (sampled !== PAINTS_NOTHING) {
          // Scrims the ancestor walk cannot reach (pseudo-elements, positioned
          // siblings) leave the sampled range describing the wrong pixels, so
          // neither verdict is safe to assert from it.
          if (sampled && unaccountedScrim(element, imageSource.element)) {
            sampled = {
              status: 'incomplete',
              message: 'This text sits over a background image with a translucent overlay painted on top of it (a pseudo-element or positioned scrim), so the colour behind the glyphs is the blend of the two — check the contrast by eye.',
            };
          }
          // Icon-scale images: bullets, arrows, and decorations painted
          // beside or beneath a corner of the text — their pixels may flag
          // for eyes, never assert a failure. Icon-scale means: no reliable
          // intrinsic size, an intrinsically tiny image, OR a background
          // carrier whose own box is line-height-sized (contain/cover paint
          // can never exceed the carrier — a 512px nominal SVG painted on an
          // inline link is still an icon). Only backdrop-scale images earn a
          // definite fail from sampling.
          const carrierBox = imageSource.element.getBoundingClientRect();
          const iconScale = isGradient
            ? (sizedSmall || carrierBox.height <= 40)
            : (dimensionless || (intrinsic.width <= 32 && intrinsic.height <= 32) || carrierBox.height <= 40);
          if (sampled?.status === 'fail' && iconScale) {
            return {
              status: 'incomplete',
              message: 'A small background icon is painted on this element — if it sits beside the text rather than under it, judge the contrast against the plain background by eye.',
            };
          }
          return sampled ?? {
            status: 'incomplete',
            message: 'The background here is several stacked image or gradient layers, which a script can’t sample. Contrast must be checked by eye.',
          };
        }
      }
    }

    // For slotted host text, the walk starts at the slot: its flat-tree
    // chain (slot → shadow parents → host → light ancestors) is the one the
    // text actually paints in; effectiveBackground crosses the shadow
    // boundary via getRootNode().host on its own.
    let background = effectiveBackground(styleSource);

    // Browser-truth paint order at the text's own sample point: sees and
    // RESOLVES backdrops painted by non-ancestors (positioned siblings,
    // hero panels, overlay scrims) that the ancestor walk cannot — instead
    // of merely flagging them for a human.
    const painted = paintedBackdrop(element);
    // A translucent viewport-scale veil is painted ON TOP of this text
    // (modal scrim, loading overlay, consent dimmer): the user sees the text
    // through it, so the resting colours are not the presented ones — and if
    // the veil is transient, the resting state is what should be judged.
    // TWO states, then, and the honest question is whether they disagree.
    // A consent dimmer over failing body text fails dimmed AND at rest; the
    // veil changes nothing a human could rule differently, so a verdict is
    // owed. Abstaining on sight instead silenced contrast across every page
    // that greets a visitor with a cookie modal — which is most of the web.
    // Only genuine disagreement between the two states is a human call.
    let veilPaint = null;
    let scrimLayers = painted?.scrim ?? null;
    // Offscreen text can't be hit-tested against the veil — but a FIXED
    // translucent overlay follows the viewport, so it dims scrolled-away
    // content just the same. (The veil's own contents are fixed too, hence
    // in-viewport, hence never routed through this branch.)
    if (!scrimLayers && painted === 'offscreen') {
      const veil = viewportVeil(doc);
      if (veil && !veil.contains(element)) scrimLayers = [veil];
    }
    if (scrimLayers) {
      veilPaint = scrimPaint(scrimLayers);
      // A veil whose paint can't be reduced to flat colour (backdrop-filter,
      // blend mode) leaves the dimmed state uncomputable: still a human call.
      if (!veilPaint) return veiledIncomplete();
    }
    // Pseudo-element paint sits above everything the hit-test and the walk
    // can report, and neither can see it — so it is resolved before them and
    // wins. Geometry-only, so it settles offscreen text too, where the
    // hit-test is blind and the walk would otherwise assert the track colour
    // of a control the text visibly is not sitting on.
    //
    // Unplaceable pseudo paint no longer abstains on sight: it arrives as
    // `film`, an upper bound on its alpha, and the flat-colour verdict below
    // is bracketed against it — asserted only when black and white films,
    // behind the text or over it, all land the same side of the threshold.
    // A 3.5%-opacity fixed grain overlay (the full-page texture pattern)
    // otherwise sent every element on the page to the review lane, and a
    // genuine 4.1:1 failure drowned among 163 siblings that were fine.
    const pseudoResolved = pseudoBackdropForText(element);
    const film = pseudoResolved?.film ?? 0;
    let pseudoBack = pseudoResolved?.color || pseudoResolved?.image ? pseudoResolved : null;
    // The pseudo's BOX covering the text says nothing about its IMAGE doing
    // so: a no-repeat url() paints its intrinsic rect inside that box (a
    // menu item's ::before arrow icon in a box that spans the whole item).
    // When that rect is computable and provably misses every text box, the
    // icon sits beside the text, not behind it — the layer is not a
    // backdrop at all. And an icon-sized image that IS under a text corner
    // may flag for eyes, never assert: the same discipline the element
    // background-image path has always applied.
    let pseudoIconScale = false;
    if (pseudoBack?.image?.meta && pseudoBack.image.box) {
      const pseudoUrl = pseudoBack.image.css.match(/url\(["']?(.*?)["']?\)/)?.[1];
      if (pseudoUrl && pseudoBack.image.meta.repeat === 'no-repeat') {
        let pseudoIntrinsic = null;
        try { pseudoIntrinsic = await imageLuminanceRange(new URL(pseudoUrl, doc.baseURI).href); } catch { /* unknowable */ }
        const dimensionless = !pseudoIntrinsic || !pseudoIntrinsic.width
          || (pseudoIntrinsic.width === 300 && pseudoIntrinsic.height === 150);
        const paint = imagePaintRectInBox(pseudoBack.image.box, pseudoBack.image.meta, dimensionless ? null : pseudoIntrinsic);
        if (paint && !paint.empty && !textIntersects(element, paint)) {
          pseudoBack = null; // paints clear of the glyphs — judge what's beneath
        } else {
          pseudoIconScale = dimensionless
            || (pseudoIntrinsic.width <= 32 && pseudoIntrinsic.height <= 32);
        }
      }
    }
    const filmIncomplete = {
      status: 'incomplete',
      message: 'A pseudo-element with its own background paints in this element\'s chain, but its position can\'t be computed — so whether it sits behind this text is unknown. Check the contrast by eye.',
    };
    // Sampled pixels, veils and text-shadow halos can't be film-bracketed
    // (the film may sit between the sample and the glyphs): those verdicts
    // keep the human call they had when any unplaceable paint abstained.
    if (film > 0 && (pseudoBack?.image || painted?.image || painted === 'unresolved'
      || veilPaint || (style.textShadow && style.textShadow !== 'none'))) {
      return filmIncomplete;
    }
    // An image backdrop under a veil would have to be sampled a second time,
    // dimmed, to answer whether the two states agree. Not worth a second pass
    // over the pixels of every hero photo behind a cookie modal: these keep
    // the human call they have always had.
    if (veilPaint && (pseudoBack?.image || painted?.image)) return veiledIncomplete();
    // A pseudo layer that sits BEYOND intermediate paint (an element between
    // the text and the pseudo's host carries its own opaque background or
    // image): whether the pseudo paints behind these glyphs or is covered by
    // that nearer paint is a stacking-order question this engine deliberately
    // does not model. Image paint can't be bracketed against the walked
    // colour, so it stays a human call.
    if (pseudoBack?.image && pseudoBack.beyondPaint) {
      return {
        status: 'incomplete',
        message: 'An ancestor\'s pseudo-element paints an image or gradient where this text is, but other backgrounds sit between them — which one is behind the glyphs depends on paint order, so check the contrast by eye.',
      };
    }
    // Gradient/image paint from a pseudo-element: bracket it by sampling,
    // exactly as an element's own background-image is bracketed.
    if (pseudoBack?.image) {
      // Beneath the pseudo's paint sits its own host's background — a
      // ::before draws above the host's background and below everything
      // else, so the host's resolved colour is what shows through any
      // transparent pixels the image has.
      const sampled = await sampledVerdict(pseudoBack.image, foreground, required, doc, [],
        effectiveBackground(pseudoBack.image.element));
      // PAINTS_NOTHING: the pseudo-element's image is fully transparent, so
      // it never displaced the background the walk resolved.
      if (sampled !== PAINTS_NOTHING) {
        if (sampled?.status === 'fail' && pseudoIconScale) {
          return {
            status: 'incomplete',
            message: 'A small icon is painted by a pseudo-element on this element — if it sits beside the text rather than under it, judge the contrast against the plain background by eye.',
          };
        }
        return sampled ?? {
          status: 'incomplete',
          message: 'A pseudo-element paints an image or gradient behind this text, so its real background isn’t the computed colour — contrast must be checked by eye.',
        };
      }
    }
    if (painted?.image && !pseudoBack) {
      const sampled = await sampledVerdict(painted.image, foreground, required, doc);
      if (sampled !== PAINTS_NOTHING) {
        return sampled ?? {
          status: 'incomplete',
          message: 'An image or overlapping element is painted behind this text, so its real background isn’t the computed colour — contrast must be checked by eye.',
        };
      }
    }
    // Only a hit-test-resolved backdrop is VERIFIED paint truth. Anything
    // else (offscreen sample point, element invisible to its own hit-test —
    // stretched-link overlays do this) leaves the walked-up colour a guess
    // that overlapping media or panels may contradict, in either direction.
    let backgroundVerified = false;
    if (painted?.color) {
      background = painted.color;
      backgroundVerified = true;
    } else if (painted === 'unresolved') {
      // The hit-test couldn't see the element (shadow retargeting, hidden
      // mid-audit…): keep the previous overlay detection so the known
      // hazards still reach a human instead of a wrong assertion.
      const obscuring = backgroundObscured(element);
      if (obscuring && obscuring !== 'unverifiable') {
        const sampled = await sampledVerdict(obscuring, foreground, required, doc);
        if (sampled !== PAINTS_NOTHING) {
          return sampled ?? {
            status: 'incomplete',
            message: 'An image or overlapping element is painted behind this text, so its real background isn’t the computed colour — contrast must be checked by eye.',
          };
        }
      }
    }
    if (pseudoBack?.color && pseudoBack.beyondPaint) {
      // Paint sits between this text and the pseudo's host, so the pseudo
      // may equally be covered by it (the common case: a decorative
      // full-bleed wash on body under sections with their own backgrounds).
      // Bracket instead of choosing: a verdict is only provable when the
      // walked background and the pseudo-as-backdrop land the same side of
      // the threshold; disagreement is a genuine human call.
      const candidate = pseudoBack.color.a >= 1 || !background
        ? pseudoBack.color
        : composite(pseudoBack.color, background);
      if (!background) {
        return { status: 'incomplete', message: 'The background could not be determined — check contrast by eye.' };
      }
      const overWalked = foreground.a < 1 ? composite(foreground, background) : foreground;
      const overPseudo = foreground.a < 1 ? composite(foreground, candidate) : foreground;
      if ((contrastRatio(overWalked, background) >= required)
        !== (contrastRatio(overPseudo, candidate) >= required)) {
        return {
          status: 'incomplete',
          message: 'An ancestor\'s pseudo-element paints where this text is, but other backgrounds sit between them — which colour is behind the glyphs depends on paint order, and the two candidates disagree on the verdict. Check the contrast by eye.',
        };
      }
      // Both candidates agree: judge against the walked background below.
      // The backdrop stays UNVERIFIED — the hazard bracket still applies.
    } else if (pseudoBack?.color) {
      // Opaque pill: it IS the backdrop. Translucent paint composites over
      // whatever the walk resolved beneath it. Either way the geometry is
      // computed, not guessed, so this counts as verified paint truth.
      background = pseudoBack.color.a >= 1 || !background
        ? pseudoBack.color
        : composite(pseudoBack.color, background);
      backgroundVerified = true;
    }
    if (!background) {
      return { status: 'incomplete', message: 'The background could not be determined — check contrast by eye.' };
    }

    // Semi-transparent text is really text-colour blended into the background.
    if (foreground.a < 1) foreground = composite(foreground, background);

    // The scroll-independent hazard bracket for UNVERIFIED backgrounds:
    // could something painted where this text is make the walked-up colour
    // the wrong one? Media (photos, video) makes the real backdrop
    // unknowable in both directions — a dark card colour under a pale photo
    // must not assert a pass any more than a fail. Opaque non-ancestor
    // panels only demote the verdict when one would actually flip it.
    // `blindOnly`: a hit-test-VERIFIED backdrop is still wrong when
    // pointer-events:none media or panels paint where the text is — those
    // layers never appear in elementsFromPoint stacks (Stripe's animated
    // gradient canvas under its hero heading is exactly this shape), so
    // even verified verdicts must be bracketed against them.
    const backdropHazard = (direction, blindOnly) => {
      // An element's OWN opaque background sits directly beneath its own
      // text: no non-descendant layer can paint between the two, and
      // descendant media is already excluded below — so however the page
      // stacks around it, the resolved colour is the presented one. Without
      // this, every below-the-fold category chip painted over a card
      // thumbnail (white-on-red at a flat 3.99:1) sat in the review lane
      // because the offscreen hit-test could not verify what geometry
      // already proves.
      const ownPaint = parseColor(style.backgroundColor);
      if (ownPaint && ownPaint.a >= 1) return null;
      // One box read for the element, then pure rect math per candidate —
      // this runs for every unverified element on the page.
      const box = element.getBoundingClientRect();
      const near = (r) => Math.min(box.right, r.right) - Math.max(box.left, r.left) >= 3
        && Math.min(box.bottom, r.bottom) - Math.max(box.top, r.top) >= 3;
      const overMedia = mediaRects(doc).some(({ element: media, rect: mediaRect, hitTestBlind }) =>
        (!blindOnly || hitTestBlind) && near(mediaRect)
        && !media.contains(element) && !element.contains(media)
        && textIntersects(element, mediaRect));
      if (overMedia) {
        return {
          status: 'incomplete',
          message: 'This text overlaps an image or video, so its real background can’t be computed — contrast must be checked by eye.',
        };
      }
      const flipping = opaquePanelRects(doc).some(({ element: panel, rect, color, hitTestBlind }) =>
        (!blindOnly || hitTestBlind) && near(rect)
        && !panel.contains(element) && !element.contains(panel)
        && textIntersects(element, rect)
        && (contrastRatio(foreground, color) >= required) !== (direction === 'pass'));
      if (flipping) {
        return {
          status: 'incomplete',
          message: 'This text overlaps a coloured block that isn’t its DOM ancestor, so its real background is ambiguous — check contrast by eye.',
        };
      }
      return null;
    };

    const ratio = contrastRatio(foreground, background);
    // Bracket the verdict against any unplaceable pseudo paint: only when
    // every colour and placement the film could take leaves the ratio on one
    // side of the threshold is the verdict provable. A 3.5% grain film can
    // never rescue 4.1:1, so that fails outright; a 50% veil could rescue or
    // ruin anything, so it stays the human call it always was.
    if (film > 0) {
      const bounds = filmedContrastBounds(foreground, background, film);
      const decided = (bounds.min >= required) === (bounds.max >= required)
        && !(bounds.crossed && bounds.min >= required);
      if (!decided) return filmIncomplete;
    }
    // The dimmed state, when a veil is up: it paints over the glyphs and
    // their background alike, so both composite through the same layers.
    // Dimming is not monotonic on ratio (it can rescue or ruin a pairing),
    // which is exactly why both states are measured rather than assumed.
    const veiled = (fg, bg) => contrastRatio(applyOverlays(fg, veilPaint), applyOverlays(bg, veilPaint));
    if (veilPaint) {
      const veiledRatio = veiled(foreground, background);
      if ((veiledRatio >= required) !== (ratio >= required)) {
        return veiledIncomplete(ratio, veiledRatio);
      }
    }
    if (ratio >= required) {
      return backdropHazard('pass', backgroundVerified) ?? { status: 'pass' };
    }

    // About to assert a fail — make sure the resolved colour is what the
    // user actually sees. Cheap layout reads run only on this path.
    const rect = element.getBoundingClientRect();
    // Zero-area text paints nothing (collapsed badges, empty counters).
    if (!rect.width || !rect.height) return { status: 'pass' };
    // Text parked wholly left of or above the document is unreachable by any
    // scroll position (skip links pre-focus, sr-only labels at left:-10000px,
    // panels slid out at negative offsets): it is not visually presented, so
    // 1.4.3 has nothing to judge. Scrolling can only reach coordinates >= 0
    // in LTR documents; RTL pages legitimately extend leftward, so they keep
    // the old behavior.
    {
      const win = doc.defaultView;
      if (win && getComputedStyle(doc.documentElement).direction !== 'rtl'
        && (rect.right + win.scrollX <= 0 || rect.bottom + win.scrollY <= 0)) {
        return { status: 'pass' };
      }
    }
    // A text-shadow can supply the contrast (technique G18 measures the
    // letters against their halo): white text with a solid dark outline
    // passes however the fill compares to the backdrop. A parseable solid
    // halo gets a verdict; only genuinely ambiguous shadows go to a human,
    // and faint diffuse glows stop blocking the verdict entirely.
    if (style.textShadow && style.textShadow !== 'none') {
      const fontSize = parseFloat(style.fontSize) || 16;
      const halo = textShadowHalo(style.textShadow, fontSize);
      if (halo) {
        const haloRatio = contrastRatio(foreground, halo);
        // A veil dims the glyphs and their own outline together: the halo
        // verdict has to survive both states, exactly as the background one does.
        if (veilPaint) {
          const veiledHalo = veiled(foreground, halo);
          if ((veiledHalo >= required) !== (haloRatio >= required)) {
            return veiledIncomplete(haloRatio, veiledHalo);
          }
        }
        if (haloRatio >= required) return { status: 'pass' };
        return {
          status: 'fail',
          message: `Contrast is ${showRatio(haloRatio)}:1 against this text's own outline and ${showRatio(ratio)}:1 against the background — below the ${required}:1 WCAG minimum for this text size.`,
          fix: `Increase the difference between the text colour and its text-shadow outline (or the background) until the ratio reaches ${required}:1.`,
          data: {
            // The judged (composited) colour, not style.color: the checker
            // link must score the pair the viewer actually sees.
            foreground: asRgb(foreground),
            background: asRgb(halo),
            ratio: Number(showRatio(haloRatio)),
            required,
          },
        };
      }
      if (!textShadowNegligible(style.textShadow, fontSize)) {
        return {
          status: 'incomplete',
          message: `Contrast against the background is ${showRatio(ratio)}:1, but this text has a text-shadow — if the shadow forms a solid halo, contrast may be measured against it instead. Check by eye.`,
        };
      }
      // Negligible glow: judged like plain text on its background.
    }
    // Text in EXACTLY its background colour is an author hiding technique
    // (icon links with colour-matched labels) at least as often as it is a
    // defect — either way nothing is "low contrast": it's invisible.
    if (Math.round(foreground.r) === Math.round(background.r)
      && Math.round(foreground.g) === Math.round(background.g)
      && Math.round(foreground.b) === Math.round(background.b)) {
      return {
        status: 'incomplete',
        message: 'This text is exactly the same colour as its background — invisible. If that\'s a hiding technique for screen-reader-only labels, use the clip pattern instead; if the text is meant to be seen, this is a serious defect.',
      };
    }
    // A duplicate of the same text painted on top (gradient-text fallback
    // copies): the user reads the top copy, which is judged on its own.
    if (coveredByTextTwin(element)) return { status: 'pass' };
    {
      const hazard = backdropHazard('fail', backgroundVerified);
      if (hazard) return hazard;
    }
    // Both colours in sRGB, which is the space the ratio was computed in and
    // the one an interactive checker accepts. The author's own syntax is
    // carried alongside, never instead: a page written in oklch() or
    // color(srgb …) would otherwise be handed an rgb() value that appears
    // nowhere in its stylesheet.
    const foregroundRgb = asRgb(foreground);
    const backgroundRgb = asRgb(background);
    // …but only when the authored string is the judged colour in another
    // spelling. An authored colour that differs in VALUE (translucent text,
    // an ancestor's opacity dimming the glyphs) still names what to search
    // the stylesheet for, yet must never reach the checker link: the checker
    // would score a pair the page never renders, showing a passing ratio for
    // this very failure.
    const sameValue = (css, judged) => {
      const parsed = parseColor(css);
      return parsed != null && parsed.a >= 1 && asRgb(parsed) === judged;
    };
    const authoredFg = style.color !== foregroundRgb ? style.color : null;
    const backgroundSource = backgroundColorSource(element);
    const authoredBg = backgroundSource && backgroundSource !== backgroundRgb ? backgroundSource : null;
    const foregroundCss = authoredFg && sameValue(authoredFg, foregroundRgb) ? authoredFg : null;
    const backgroundCss = authoredBg && sameValue(authoredBg, backgroundRgb) ? authoredBg : null;
    const authored = [
      authoredFg && `the text as ${authoredFg}`,
      authoredBg && `the background as ${authoredBg}`,
    ].filter(Boolean).join(' and ');
    // Say WHY the rendered colour differs when the mechanism is provable, so
    // the author learns the cause along with the finding.
    const parsedAuthoredFg = authoredFg && !foregroundCss ? parseColor(authoredFg) : null;
    const dimmedNote = parsedAuthoredFg
      ? (opacity < 1
        ? ` The gap is opacity: this element or an ancestor renders at ${Math.round(opacity * 100)}% opacity, dimming the text to the sRGB value above.`
        : (parsedAuthoredFg.a < 1
          ? ' The text colour is translucent, so it composites with the background into the sRGB value above.'
          : ''))
      : '';

    // When the colour pair already clears the LARGE-scale minimum, the miss
    // is about scale, not colour: name the boundary (14pt bold / 18pt), or
    // a bold-but-just-under button reads as the checker ignoring its weight.
    const largeScaleNote = (() => {
      if (required !== thresholds.normal || ratio < thresholds.large) return '';
      const sizePx = parseFloat(style.fontSize) || 0;
      const weightNum = parseInt(style.fontWeight, 10) || 400;
      const shown = `${Math.round(sizePx * 10) / 10}px`;
      if (weightNum >= 700 && sizePx < 56 / 3) {
        return ` This text is bold at ${shown}; bold text counts as large scale from 18.67px (14pt), where the ${thresholds.large}:1 minimum would apply and these colours would pass.`;
      }
      if (weightNum < 700 && sizePx >= 56 / 3 && sizePx < 24) {
        return ` At ${shown} regular weight this is not large scale; from 24px (18pt), or bold at this size, the ${thresholds.large}:1 minimum would apply and these colours would pass.`;
      }
      return '';
    })();
    return {
      status: 'fail',
      message: `Contrast is ${showRatio(ratio)}:1 — below the ${required}:1 WCAG minimum for this text size.${largeScaleNote}`,
      fix: `Darken the text or lighten the background until the ratio reaches ${required}:1 (currently ${foregroundRgb} on ${backgroundRgb}).`
        + (authored ? ` Your CSS writes ${authored}, so searching it for the sRGB values above won't find them.` : '')
        + dimmedNote,
      // The exact pair, for the UIs to link out to an interactive checker.
      data: {
        foreground: foregroundRgb,
        background: backgroundRgb,
        ...(foregroundCss ? { foregroundCss } : {}),
        ...(backgroundCss ? { backgroundCss } : {}),
        ratio: Number(showRatio(ratio)),
        required,
      },
    };
  },
  };
}

export default createContrastRule({
  id: 'color-contrast',
  name: 'Text contrast',
  tags: ['wcag2aa', 'wcag143'],
  help: 'Text must have sufficient contrast against its background',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html',
  thresholds: { normal: 4.5, large: 3 },
});
