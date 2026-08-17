// WCAG SC 4.1.2 Name, Role, Value (Level A)
// The icon-only tab strip. Items of composite widgets — tabs, menu items,
// options, tree items — take their name from their contents per ARIA 1.2,
// and every one of these roles requires an accessible name. So an item
// whose contents render no text and whose author supplied no label is
// provably announced as an unnamed control: "tab", selected, of what?
//
// The container roles (tablist, menu, listbox, tree) are name-recommended
// rather than required and are deliberately not judged here; the items are
// where the binary, assertable failure lives.
export default {
  id: 'composite-widget-name',
  name: 'Widget item names',
  impact: 'serious',
  tags: ['wcag2a', 'wcag412'],
  help: 'Tabs, menu items, options and tree items need an accessible name',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html',
  selector: '[role="tab"], [role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"], [role="option"], [role="treeitem"]',
  evaluate(element, { accessibleName }) {
    // <button role="tab"> and <a href role="tab"> are already selected by
    // button-name/link-name (their selectors match the tag regardless of
    // the role override) — one nameless control must not become two
    // findings, so this rule owns only the div/span/li-style hosts.
    if (element.matches('button, a[href], input, select, textarea, summary')) return { status: 'pass' };
    if (accessibleName(element)) return { status: 'pass' };
    const role = element.getAttribute('role');
    return {
      status: 'fail',
      message: `This ${role} has no accessible name — a screen reader announces an unnamed ${role}, and users cannot tell what choosing it does.`,
      fix: 'Put text inside the element, or add aria-label="…" for icon-only items.',
    };
  },
};
