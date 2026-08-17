// WCAG SC 1.3.1 Info and Relationships (Level A)
export default {
  id: 'dlitem-parent',
  name: 'Definition item placement',
  impact: 'serious',
  tags: ['wcag2a', 'wcag131'],
  help: '<dt> and <dd> must be inside a <dl>',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html',
  selector: 'dt:not([role]), dd:not([role])', // role overrides the dt/dd semantics
  evaluate(element) {
    if (element.closest('dl')) return { status: 'pass' };
    return {
      status: 'fail',
      message: `<${element.tagName.toLowerCase()}> outside a <dl> has no term/description semantics.`,
      fix: 'Wrap the terms and descriptions in a <dl>, or use different elements.',
    };
  },
};
