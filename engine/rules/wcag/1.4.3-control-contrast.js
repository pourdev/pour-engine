// WCAG SC 1.4.3 Contrast (Minimum) (Level AA) — form-control text.
// The main contrast rule judges flowed text; the text INSIDE controls
// (typed values, select options, and above all placeholder text — the
// endemic ~2.8:1 gray-on-white) was previously never measured by any rule.
import {
  parseColor, contrastRatio, composite, effectiveBackground, isLargeText,
} from '../../lib/contrast.js';

const showRatio = (ratio) => (Math.floor(ratio * 100) / 100).toFixed(2);

export default {
  id: 'control-contrast',
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
    // The control's own background wins; else whatever shows through it.
    const own = parseColor(style.backgroundColor);
    const background = own && own.a >= 1
      ? own
      : (() => {
        const behind = effectiveBackground(element);
        return behind && own && own.a > 0 ? composite(own, behind) : behind;
      })();
    if (!background) {
      return { status: 'incomplete', message: 'The control’s background could not be determined — check its text contrast by eye.' };
    }
    const required = isLargeText(style) ? 3 : 4.5;

    const judge = (color, what) => {
      const parsed = parseColor(color);
      if (!parsed || parsed.a === 0) return null;
      const fg = parsed.a < 1 ? composite(parsed, background) : parsed;
      const ratio = contrastRatio(fg, background);
      if (ratio >= required) return null;
      return { what, ratio };
    };

    const failures = [];
    const valueVerdict = judge(style.color, 'value text');
    if (valueVerdict) failures.push(valueVerdict);
    // Placeholder text is real text users must read; browsers expose its
    // computed colour via the ::placeholder pseudo-element.
    if (element.getAttribute('placeholder')?.trim()) {
      let placeholderColor = null;
      try { placeholderColor = getComputedStyle(element, '::placeholder').color; } catch { /* unsupported */ }
      if (placeholderColor && placeholderColor !== style.color) {
        const verdict = judge(placeholderColor, 'placeholder text');
        if (verdict) failures.push(verdict);
      }
    }
    if (!failures.length) return { status: 'pass' };
    const worst = failures.sort((a, b) => a.ratio - b.ratio)[0];
    return {
      status: 'fail',
      message: `This field's ${worst.what} has ${showRatio(worst.ratio)}:1 contrast against the field background — below the ${required}:1 minimum.`,
      fix: `Darken the ${worst.what.includes('placeholder') ? 'placeholder colour (::placeholder)' : 'text colour'} until it reaches ${required}:1 against the field background.`,
      data: { ratio: Number(showRatio(worst.ratio)), required },
    };
  },
};
