export default {
  id: 'redundant-aria-label',
  impact: 'minor',
  tags: ['best-practice'],
  help: 'aria-label should not repeat the visible text',
  helpUrl: 'https://www.w3.org/TR/using-aria/#rule2',
  selector: '[aria-label]',
  evaluate(element) {
    const label = element.getAttribute('aria-label').replace(/\s+/g, ' ').trim().toLowerCase();
    const visible = element.textContent.replace(/\s+/g, ' ').trim().toLowerCase();
    if (!visible || label !== visible) return { status: 'pass' };
    return {
      status: 'fail',
      message: `aria-label="${element.getAttribute('aria-label')}" is identical to the element's visible text — it adds nothing and will drift out of sync when the text changes.`,
      fix: 'Remove the aria-label and let the visible text be the accessible name.',
    };
  },
};
