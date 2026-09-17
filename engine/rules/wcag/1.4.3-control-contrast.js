// WCAG SC 1.4.3 Contrast (Minimum) (Level AA) — form-control text.
// The main contrast rule judges flowed text; the text INSIDE controls
// (typed values, select options, and above all placeholder text — the
// endemic ~2.8:1 gray-on-white) was previously never measured by any rule.
import {
  parseColor, contrastRatio, composite, effectiveBackground, isLargeText,
  backgroundImageSource, cumulativeOpacity, opacityAnimating, restingOpacity, showRatio,
  hasPaintEffects, opacityGroupPaint, splitBackgroundLayers, sampledGradientRange, asRgb,
} from '../../lib/contrast.js';

export default {
  id: 'control-contrast',
  name: 'Form control contrast',
  impact: 'serious',
  tags: ['wcag2aa', 'wcag143'],
  help: 'Text inside form controls must have sufficient contrast',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html',
  selector:
    'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="range"])'
    + ':not([type="color"]):not([type="file"]):not([type="image"]), select, textarea',
  visibility: 'visual',
  evaluate(element) {
    // 1.4.3 exempts inactive controls.
    // `:disabled`, not `element.disabled`: the property reflects only the
    // element's own attribute, so a control inside <fieldset disabled> reads
    // false while the browser has it inactive and 1.4.3 exempts it.
    if (element.closest(':disabled, [aria-disabled="true"]')) return { status: 'pass' };
    // Zero-area controls (JS-widget hidden duplicates) present no text.
    const rect = element.getBoundingClientRect();
    if (rect.width <= 1 || rect.height <= 1) return { status: 'pass' };
    const style = getComputedStyle(element);
    // Text rendered at font-size 0 (icon buttons whose value is a
    // screen-reader label) is not visually presented — nothing to judge.
    if (parseFloat(style.fontSize) === 0) return { status: 'pass' };
    // A submit, button or reset input whose value attribute is present and
    // empty renders no label at all (HTML: the button's label is its value
    // when the attribute is present), the icon-button-with-aria-label
    // pattern. No glyph is presented, so there is nothing for 1.4.3 to
    // judge (2026-08-25 overnight audit).
    if (/^(submit|button|reset)$/i.test(element.getAttribute('type') ?? '')
      && element.hasAttribute('value') && element.getAttribute('value') === '') {
      return { status: 'pass' };
    }
    // Controls parked wholly left of or above the document are unreachable
    // by scrolling (sr-only duplicates): same exemption as the main rule.
    {
      const doc = element.ownerDocument;
      const win = doc.defaultView;
      if (win && getComputedStyle(doc.documentElement).direction !== 'rtl'
        && (rect.right + win.scrollX <= 0 || rect.bottom + win.scrollY <= 0)) {
        return { status: 'pass' };
      }
    }
    // Judge the opacity the text RESTS at, matching the main contrast rule:
    // a control faded out by an ancestor (fade-in-on-scroll, a collapsed
    // panel) presents no text at all, and one held at a low opacity presents
    // far less contrast than its declared colours suggest.
    const opacity = opacityAnimating(element) ? restingOpacity(element) : cumulativeOpacity(element);
    if (opacity < 0.05) return { status: 'pass' };
    if (hasPaintEffects(element)) {
      return { status: 'incomplete', message: 'A filter or blend mode changes the colours presented inside this field. Check the resulting text contrast by eye.' };
    }
    // The control's own background wins; else whatever shows through it.
    const own = parseColor(style.backgroundColor);
    let background;
    if (style.backgroundImage !== 'none') {
      const layers = splitBackgroundLayers(style.backgroundImage);
      const range = layers.length === 1 && layers[0].includes('gradient(')
        ? sampledGradientRange(layers[0]) : null;
      // A constant opaque gradient has exactly one painted background.
      // Other image paint needs spatial sampling, not its fallback colour.
      const fullBox = /^(auto|auto auto)$/.test(style.backgroundSize)
        && style.backgroundPosition === '0% 0%'
        && ['repeat', 'no-repeat'].includes(style.backgroundRepeat);
      if (!range || range.min !== range.max || opacity < 1 || !fullBox) {
        return { status: 'incomplete', message: 'An image or gradient paints this field background. Check its text against the pixels behind it.' };
      }
      background = range.minColor;
    } else if (own && own.a >= 1) {
      background = own;
    } else {
      // An image or gradient painted under a see-through control is a
      // backdrop of pixels this rule cannot sample. The main rule samples
      // them; here the honest answer is to hand it to a person rather than
      // judge against the colour layer alone as if the image were not there.
      if (backgroundImageSource(element)) {
        return {
          status: 'incomplete',
          message: 'This field is see-through and sits over a background image or gradient, so its real text contrast depends on the pixels behind it. Check it by eye.',
        };
      }
      const behind = effectiveBackground(element);
      background = behind; // effectiveBackground already composites the field fill
    }
    if (!background) {
      return { status: 'incomplete', message: 'The control’s background could not be determined — check its text contrast by eye.' };
    }
    const required = isLargeText(style) ? 3 : 4.5;

    let unresolvedGroup = false;
    const judge = (color, what, ownOpacity = 1) => {
      const parsed = parseColor(color);
      if (!parsed || parsed.a === 0) return null;
      // Same treatment the main rule gives faded text: what reaches the eye
      // is the declared colour thinned by the opacity it is painted at.
      if (opacity < 1) {
        const group = opacityGroupPaint(element, { ...parsed, a: parsed.a * ownOpacity });
        if (group?.unresolved) { unresolvedGroup = true; return null; }
        if (group) {
          const ratio = contrastRatio(group.foreground, group.background);
          return ratio >= required ? null : { what, ratio, fg: group.foreground, bg: group.background };
        }
      }
      const painted = opacity * ownOpacity;
      const faded = painted < 1 ? { ...parsed, a: parsed.a * painted } : parsed;
      const fg = faded.a < 1 ? composite(faded, background) : faded;
      const ratio = contrastRatio(fg, background);
      if (ratio >= required) return null;
      return { what, ratio, fg, bg: background };
    };

    const failures = [];
    const valueVerdict = judge(style.webkitTextFillColor || style.color, 'value text');
    if (valueVerdict) failures.push(valueVerdict);
    // Placeholder text is real text users must read; browsers expose its
    // computed colour via the ::placeholder pseudo-element. Selectors 4
    // defines :placeholder-shown for controls actually showing that text;
    // a populated field's unpainted hint must not create a violation.
    if (element.getAttribute('placeholder')?.trim() && element.matches(':placeholder-shown')) {
      let placeholderColor = null;
      let placeholderOpacity = 1;
      try {
        const placeholderStyle = getComputedStyle(element, '::placeholder');
        placeholderColor = placeholderStyle.webkitTextFillColor || placeholderStyle.color;
        // ::placeholder { opacity: .3 } is a widespread idiom (framework
        // resets, Firefox's own UA default of 0.54), and the criterion is on
        // the visual presentation of the text, which is the faded colour.
        // The opacity folds into the colour's alpha exactly as element
        // opacity already does for value text (2026-08-25 overnight audit).
        const parsedOpacity = parseFloat(placeholderStyle.opacity);
        if (Number.isFinite(parsedOpacity)) placeholderOpacity = Math.min(1, Math.max(0, parsedOpacity));
      } catch { /* unsupported */ }
      if (placeholderColor && (placeholderColor !== style.color || placeholderOpacity < 1)) {
        const verdict = judge(placeholderColor, 'placeholder text', placeholderOpacity);
        if (verdict) failures.push(verdict);
      }
    }
    if (unresolvedGroup) return { status: 'incomplete', message: 'The field and its text fade together over an unresolved background. Check the presented text contrast by eye.' };
    if (!failures.length) return { status: 'pass' };
    const worst = failures.sort((a, b) => a.ratio - b.ratio)[0];
    return {
      status: 'fail',
      message: `This field's ${worst.what} has ${showRatio(worst.ratio)}:1 contrast against the field background — below the ${required}:1 minimum.`,
      fix: `Darken the ${worst.what.includes('placeholder') ? 'placeholder colour (::placeholder)' : 'text colour'} until it reaches ${required}:1 against the field background (currently ${asRgb(worst.fg)} on ${asRgb(worst.bg)}).`,
      // The judged pair, as the text rule reports it, so the UIs can link
      // out to the checker with it (the link was missing on this rule's
      // findings until 2026-09-17: it carried the ratio and nothing else).
      data: { foreground: asRgb(worst.fg), background: asRgb(worst.bg), ratio: Number(showRatio(worst.ratio)), required },
    };
  },
};
