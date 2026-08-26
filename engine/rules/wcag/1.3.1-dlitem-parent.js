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
    // Judge the FLAT-tree ancestry, what assistive technology actually
    // sees: a <dt>/<dd> slotted into a host whose shadow root holds
    // <dl><slot></slot></dl> belongs to that <dl> (Chromium exposes
    // DescriptionList > term > definition for it), and an item at the top
    // of a shadow tree continues through its host. A light-DOM closest('dl')
    // asserted every slotted pair as orphaned (2026-08-25 overnight audit;
    // same walk as listitem-parent).
    const flatParent = (node) => node.assignedSlot?.parentElement
      ?? node.parentElement
      ?? node.getRootNode()?.host
      ?? null;
    for (let parent = flatParent(element); parent; parent = flatParent(parent)) {
      if (parent.tagName === 'DL') return { status: 'pass' };
    }
    return {
      status: 'fail',
      message: `<${element.tagName.toLowerCase()}> outside a <dl> has no term/description semantics.`,
      fix: 'Wrap the terms and descriptions in a <dl>, or use different elements.',
    };
  },
};
