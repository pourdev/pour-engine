// WCAG SC 1.4.11 Non-text Contrast (Level AA)
// The automatable slice: whether a form field's fill or border reaches 3:1
// against its surroundings. Verdicts are pass or NEEDS-REVIEW, never fail:
// per the Understanding document a boundary is only required when it is
// the visual information needed to IDENTIFY the field — a labelled field
// with placeholder text can conform with a faint border (#ccc borders are
// endemic, WebAIM's own search field included), and that judgment needs
// eyes. Focus-indicator contrast is not statically computable — manual.
import { parseColor, contrastRatio, composite, effectiveBackground, showRatio } from '../../lib/contrast.js';

export default {
  id: 'non-text-contrast',
  impact: 'serious',
  tags: ['wcag21aa', 'wcag1411'],
  help: 'Form fields and icons need a 3:1 visible boundary',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html',
  selector:
    'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="submit"])'
    + ':not([type="button"]):not([type="reset"]):not([type="image"]), select, textarea',
  visibility: 'visual',
  evaluate(element) {
    // Inactive controls are exempt (same carve-out 1.4.3 makes).
    // `:disabled`, not `element.disabled`: the property misses a control
    // disabled by an ancestor <fieldset disabled>, which 1.4.11 exempts as an
    // inactive user interface component.
    if (element.closest(':disabled, [aria-disabled="true"]')) return { status: 'pass' };
    // Zero-area controls (JS-widget hidden duplicates) paint no boundary
    // to judge.
    const ownRect = element.getBoundingClientRect();
    if (ownRect.width <= 1 || ownRect.height <= 1) return { status: 'pass' };
    const style = getComputedStyle(element);
    // A native default-styled control's boundary comes from the UA.
    if (style.appearance !== 'none' && element.tagName === 'SELECT') return { status: 'pass' };
    const surrounding = effectiveBackground(element.parentElement ?? element);
    if (!surrounding) {
      return { status: 'incomplete', message: 'The background around this field could not be determined — check the field has a visible boundary by eye.' };
    }
    // Every candidate boundary colour, translucents composited over the
    // surroundings so a 30%-white border on blue is judged as the lighter
    // blue the user actually sees.
    const boundaries = [];
    let translucentSeen = false;
    const fill = parseColor(style.backgroundColor);
    if (fill && fill.a > 0) {
      boundaries.push(fill.a >= 1 ? fill : composite(fill, surrounding));
      if (fill.a < 1) translucentSeen = true;
    }
    let hasBorder = false;
    for (const side of ['Top', 'Right', 'Bottom', 'Left']) {
      if (parseFloat(style[`border${side}Width`]) <= 0) continue;
      if (style[`border${side}Style`] === 'none') continue;
      hasBorder = true;
      const color = parseColor(style[`border${side}Color`]);
      if (!color || color.a === 0) continue;
      boundaries.push(color.a >= 1 ? color : composite(color, surrounding));
      if (color.a < 1) translucentSeen = true;
    }
    const best = Math.max(1, ...boundaries.map((color) => contrastRatio(color, surrounding)));
    if (best >= 3) return { status: 'pass' };
    // Box-shadow outlines and background images can also draw the boundary;
    // those aren't statically comparable — abstain rather than assert.
    if (style.boxShadow !== 'none' || style.backgroundImage !== 'none') {
      return {
        status: 'incomplete',
        message: 'This field’s boundary may come from a box-shadow or background image — check it reaches 3:1 against the page by eye.',
      };
    }
    // Translucent layers compound (a tinted fill under a tinted border):
    // the compositing above is per-layer, so a near-miss stays a human call.
    if (translucentSeen) {
      return {
        status: 'incomplete',
        message: `This field's boundary uses translucent colours and reaches about ${showRatio(best)}:1 against the page — near the 3:1 minimum; check by eye.`,
      };
    }
    // Input-group pattern: a borderless input inside a wrapper that carries
    // the visible boundary (border, or a fill contrasting with the page
    // around it). The FIELD the user perceives is the wrapper — but only a
    // SNUG wrapper counts: a page section's border is not a field boundary.
    // Snugness is the guard, so the walk continues through transparent
    // intermediate wrappers (autocomplete shells, JS mount points) as long
    // as each stays field-sized — a search plate three levels up is still
    // the field the user sees, while a page section fails the size check
    // long before any depth cap would matter.
    for (let wrapper = element.parentElement, depth = 0; wrapper && depth < 4; wrapper = wrapper.parentElement, depth++) {
      const wrapperRect = wrapper.getBoundingClientRect();
      if (wrapperRect.height > ownRect.height + 24 || wrapperRect.width > ownRect.width + 160) break;
      const wrapperStyle = getComputedStyle(wrapper);
      const wrapperHasBorder = ['Top', 'Right', 'Bottom', 'Left'].some((side) =>
        parseFloat(wrapperStyle[`border${side}Width`]) > 0 && wrapperStyle[`border${side}Style`] !== 'none'
        && (parseColor(wrapperStyle[`border${side}Color`])?.a ?? 0) > 0);
      if (wrapperHasBorder) return { status: 'pass' };
      const wrapperFill = parseColor(wrapperStyle.backgroundColor);
      if (wrapperFill && wrapperFill.a >= 1) {
        const around = effectiveBackground(wrapper.parentElement ?? wrapper);
        if (around && contrastRatio(wrapperFill, around) >= 3) return { status: 'pass' };
        break; // opaque wrapper IS the visual field and it doesn't contrast — judge as found
      }
    }
    // Per the Understanding document, a boundary is only REQUIRED when it
    // is the visual information needed to identify the field — a clearly
    // labelled field with placeholder text inside it can conform without
    // one. That judgment needs human eyes, so this rule never asserts.
    if (!hasBorder && (!fill || fill.a === 0)) {
      return {
        status: 'incomplete',
        message: 'This field has no border and no distinct fill — if its label and layout don’t already make it findable, low-vision users can’t locate it. Check by eye (3:1 boundary or clear identification needed).',
      };
    }
    return {
      status: 'incomplete',
      message: `This field's boundary reaches only ${showRatio(best)}:1 against the page — below the 3:1 minimum. That’s conformant ONLY if the field is identifiable without the boundary (visible label, placeholder position); check by eye.`,
    };
  },
};
