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
import { effectiveRole } from '../../lib/roles.js';

const ITEM_ROLES = new Set(['tab', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'option', 'treeitem']);

export default {
  id: 'composite-widget-name',
  name: 'Widget item names',
  impact: 'serious',
  tags: ['wcag2a', 'wcag412'],
  help: 'Tabs, menu items, options and tree items need an accessible name',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html',
  selector: '[role="tab"], [role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"], [role="option"], [role="treeitem"]',
  evaluate(element, { accessibleName }) {
    // This rule owns every element whose EFFECTIVE role is one of the six,
    // <button role="tab"> and <a href role="tab"> included: button-name and
    // link-name defer to the effective role since 2026-08-25 (overnight
    // audit), so the tab wording now reaches the tab, and one nameless
    // control still yields one finding. A host whose role resolves elsewhere
    // (presentation discarded back to a native role, say) is not ours.
    const role = effectiveRole(element);
    if (!ITEM_ROLES.has(role)) return { status: 'pass' };
    if (accessibleName(element)) return { status: 'pass' };
    return {
      status: 'fail',
      message: `This ${role} has no accessible name — a screen reader announces an unnamed ${role}, and users cannot tell what choosing it does.`,
      fix: 'Put text inside the element, or add aria-label="…" for icon-only items.',
    };
  },
};
