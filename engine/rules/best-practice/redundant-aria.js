// "Overdoing it" family: aria-* attributes that duplicate a native HTML
// attribute the browser already exposes to assistive technology.
const NATIVE_PAIRS = [
  { aria: 'aria-required', native: 'required' },
  { aria: 'aria-disabled', native: 'disabled' },
  { aria: 'aria-readonly', native: 'readonly' },
  { aria: 'aria-placeholder', native: 'placeholder' },
  { aria: 'aria-checked', native: 'checked' },
];

export default {
  id: 'redundant-aria',
  name: 'Redundant ARIA attributes',
  impact: 'minor',
  tags: ['best-practice'],
  help: 'aria attributes should not duplicate native HTML attributes',
  helpUrl: 'https://www.w3.org/TR/using-aria/#rule2',
  selector: '[aria-required], [aria-disabled], [aria-readonly], [aria-placeholder], [aria-checked], [aria-hidden="false"]',
  evaluate(element) {
    const redundant = NATIVE_PAIRS
      .filter(({ aria, native }) => element.hasAttribute(aria) && element.hasAttribute(native))
      .map(({ aria, native }) => `${aria} duplicates ${native}`);
    if (element.getAttribute('aria-hidden') === 'false') {
      redundant.push('aria-hidden="false" does nothing reliable — elements are visible to AT by default');
    }
    if (!redundant.length) return { status: 'pass' };
    return {
      status: 'fail',
      message: `Redundant ARIA: ${redundant.join('; ')}. The native attribute already tells assistive technology everything.`,
      fix: 'Remove the aria-* attribute(s) and keep the native HTML attribute.',
    };
  },
};
