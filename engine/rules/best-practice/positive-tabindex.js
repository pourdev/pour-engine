export default {
  id: 'positive-tabindex',
  impact: 'serious',
  tags: ['best-practice'],
  help: 'Positive tabindex values disrupt the natural focus order',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html',
  selector: '[tabindex]',
  evaluate(element) {
    const tabindex = parseInt(element.getAttribute('tabindex'), 10);
    if (!(tabindex > 0)) return { status: 'pass' };
    return {
      status: 'fail',
      message: `tabindex="${tabindex}" overrides the natural focus order, which almost always creates a confusing keyboard path.`,
      fix: 'Use tabindex="0" and place the element where it belongs in the document order instead.',
    };
  },
};
