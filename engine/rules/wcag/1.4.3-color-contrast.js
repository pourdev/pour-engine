// WCAG SC 1.4.3 Contrast (Minimum) (Level AA)
import {
  parseColor, contrastRatio, composite, effectiveBackground, backgroundObscured,
  backgroundImageSource, backgroundImagePaintRect, imageLuminanceRange, gradientLuminanceRange,
  rangeVerdict, isLargeText, cumulativeOpacity, opacityAnimating, restingOpacity, mediaRects,
  paintedBackdrop, opaquePanelRects, viewportVeil, textShadowHalo, textShadowNegligible,
  pseudoBackdropForText, backgroundColorSource,
} from '../../lib/contrast.js';

/** Display a ratio truncated (never rounded up): 4.495 must read "4.49",
 *  because "4.50:1 — below the 4.5:1 minimum" reads as a contradiction. */
const showRatio = (ratio) => (Math.floor(ratio * 100) / 100).toFixed(2);

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
  const paint = backgroundImagePaintRect(imageSource.element, dimensionless ? null : intrinsic);
  if (!paint) return { relation: 'unknown', intrinsic, dimensionless };
  return { relation: textIntersects(element, paint) ? 'under' : 'clear', intrinsic, dimensionless };
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
  // Nothing hints at hiding: skip the getBoundingClientRect layout read —
  // this runs for every text element on the page, and most are plainly shown.
  if (!clipped && Math.abs(indent) <= 1000) return false;
  const rect = element.getBoundingClientRect();
  if ((rect.width <= 1 || rect.height <= 1) && clipped) return true;
  if (Math.abs(indent) > rect.width && (clipped || Math.abs(indent) > 1000)) return true;
  return false;
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
  if (pseudo && pseudo !== 'unresolved' && pseudo.color?.a > 0) return true;
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

// Bracket the verdict by sampling what's actually painted: image pixels
// (same-origin/CORS only) or gradient colour stops. Returns an outcome,
// PAINTS_NOTHING, or null when nothing here can be sampled at all (stacked
// layers, translucent gradient stops) and the caller must say so itself.
async function sampledVerdict(source, foreground, required, doc, overlays = []) {
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
  // Translucent text takes its presented colour from the very pixels
  // beneath it — a luminance range of the backdrop cannot bracket the
  // blend (dimmed white over a dark photo reads mid-grey, not white).
  // Asserting either way from sampling would be a coin toss.
  if (foreground.a < 1) {
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
  // div included deliberately: real-world layouts put lots of text in bare
  // divs; the own-text check below keeps wrapper divs out of the results.
  selector:
    'p, span, a, li, td, th, dt, dd, h1, h2, h3, h4, h5, h6, label, button, legend, caption, ' +
    'figcaption, div, blockquote, small, strong, em, b, i, code, pre, time, cite, q, summary',
  visibility: 'visual', // contrast is seen by sighted users even in aria-hidden content
  async evaluate(element, { ownText }) {
    if (!ownText(element)) return { status: 'pass' }; // no text of its own to judge

    // The criterion exempts "inactive user interface components".
    if (element.closest(':disabled, [aria-disabled="true"]')) return { status: 'pass' };

    const style = getComputedStyle(element);
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
      const { relation, intrinsic, dimensionless } = await imageVsText(imageSource, element, doc);
      if (relation !== 'clear') {
        // imageSource.overlays are the translucent layers painted between the
        // image and this text (hero scrims, tint panels). Judging the raw
        // image pixels would describe a page the user never sees.
        let sampled = await sampledVerdict(imageSource, foreground, required, doc, imageSource.overlays);
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
          if (sampled?.status === 'fail'
            && (dimensionless || (intrinsic.width <= 32 && intrinsic.height <= 32) || carrierBox.height <= 40)) {
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

    let background = effectiveBackground(element);

    // Browser-truth paint order at the text's own sample point: sees and
    // RESOLVES backdrops painted by non-ancestors (positioned siblings,
    // hero panels, overlay scrims) that the ancestor walk cannot — instead
    // of merely flagging them for a human.
    const painted = paintedBackdrop(element);
    // A translucent viewport-scale veil is painted ON TOP of this text
    // (modal scrim, loading overlay, consent dimmer): the user sees the
    // text through it, so the resting colours are not the presented ones —
    // and if the veil is transient, the resting state is what should be
    // judged. Either way this is a human call, in both verdict directions.
    if (painted?.scrim) {
      return {
        status: 'incomplete',
        message: 'This text sits behind a translucent full-page overlay (a modal or loading veil), which changes its presented contrast — judge the page with the overlay dismissed, or the dimmed state by eye if the overlay is permanent.',
      };
    }
    // Offscreen text can't be hit-tested against the veil — but a FIXED
    // translucent overlay follows the viewport, so it dims scrolled-away
    // content just the same. (The veil's own contents are fixed too, hence
    // in-viewport, hence never routed through this branch.)
    if (painted === 'offscreen') {
      const veil = viewportVeil(doc);
      if (veil && !veil.contains(element)) {
        return {
          status: 'incomplete',
          message: 'This text sits behind a translucent full-page overlay (a modal or loading veil), which changes its presented contrast — judge the page with the overlay dismissed, or the dimmed state by eye if the overlay is permanent.',
        };
      }
    }
    // Pseudo-element paint sits above everything the hit-test and the walk
    // can report, and neither can see it — so it is resolved before them and
    // wins. Geometry-only, so it settles offscreen text too, where the
    // hit-test is blind and the walk would otherwise assert the track colour
    // of a control the text visibly is not sitting on.
    const pseudoBack = pseudoBackdropForText(element);
    if (pseudoBack === 'unresolved') {
      return {
        status: 'incomplete',
        message: 'A pseudo-element with its own background paints in this element\'s chain, but its position can\'t be computed — so whether it sits behind this text is unknown. Check the contrast by eye.',
      };
    }
    // Gradient/image paint from a pseudo-element: bracket it by sampling,
    // exactly as an element's own background-image is bracketed.
    if (pseudoBack?.image) {
      const sampled = await sampledVerdict(pseudoBack.image, foreground, required, doc);
      // PAINTS_NOTHING: the pseudo-element's image is fully transparent, so
      // it never displaced the background the walk resolved.
      if (sampled !== PAINTS_NOTHING) {
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
    if (pseudoBack?.color) {
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
    if (ratio >= required) {
      return backdropHazard('pass', backgroundVerified) ?? { status: 'pass' };
    }

    // About to assert a fail — make sure the resolved colour is what the
    // user actually sees. Cheap layout reads run only on this path.
    const rect = element.getBoundingClientRect();
    // Zero-area text paints nothing (collapsed badges, empty counters).
    if (!rect.width || !rect.height) return { status: 'pass' };
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
        if (haloRatio >= required) return { status: 'pass' };
        return {
          status: 'fail',
          message: `Contrast is ${showRatio(haloRatio)}:1 against this text's own outline and ${showRatio(ratio)}:1 against the background — below the ${required}:1 WCAG minimum for this text size.`,
          fix: `Increase the difference between the text colour and its text-shadow outline (or the background) until the ratio reaches ${required}:1.`,
          data: {
            foreground: style.color,
            background: `rgb(${Math.round(halo.r)}, ${Math.round(halo.g)}, ${Math.round(halo.b)})`,
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
    const asRgb = (color) => `rgb(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)})`;
    const foregroundRgb = asRgb(foreground);
    const backgroundRgb = asRgb(background);
    const foregroundCss = style.color !== foregroundRgb ? style.color : null;
    const backgroundSource = backgroundColorSource(element);
    const backgroundCss = backgroundSource && backgroundSource !== backgroundRgb ? backgroundSource : null;
    const authored = [
      foregroundCss && `the text as ${foregroundCss}`,
      backgroundCss && `the background as ${backgroundCss}`,
    ].filter(Boolean).join(' and ');

    return {
      status: 'fail',
      message: `Contrast is ${showRatio(ratio)}:1 — below the ${required}:1 WCAG minimum for this text size.`,
      fix: `Darken the text or lighten the background until the ratio reaches ${required}:1 (currently ${foregroundRgb} on ${backgroundRgb}).`
        + (authored ? ` Your CSS writes ${authored}, so searching it for the sRGB values above won't find them.` : ''),
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
  tags: ['wcag2aa', 'wcag143'],
  help: 'Text must have sufficient contrast against its background',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html',
  thresholds: { normal: 4.5, large: 3 },
});
