export default {
  id: 'redundant-tabindex',
  name: 'Redundant tabindex',
  impact: 'minor',
  tags: ['best-practice'],
  help: 'tabindex="0" is unnecessary on natively focusable elements',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html',
  selector: 'button[tabindex="0"], a[href][tabindex="0"], input[tabindex="0"], select[tabindex="0"], textarea[tabindex="0"], summary[tabindex="0"]',
  evaluate(element) {
    return {
      status: 'fail',
      message: `<${element.tagName.toLowerCase()}> is focusable by default — tabindex="0" adds nothing.`,
      fix: 'Remove the tabindex attribute.',
    };
  },
};
