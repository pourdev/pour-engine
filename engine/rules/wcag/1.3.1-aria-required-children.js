// WCAG SC 1.3.1 Info and Relationships (Level A)
// Composite roles are meaningless without their required child roles —
// role="list" with no listitems announces as an empty list.
const REQUIRED_CHILDREN = {
  list: ['listitem'],
  listbox: ['option', 'group'],
  menu: ['menuitem', 'menuitemcheckbox', 'menuitemradio', 'group'],
  menubar: ['menuitem', 'menuitemcheckbox', 'menuitemradio', 'group'],
  radiogroup: ['radio'],
  tablist: ['tab'],
  tree: ['treeitem', 'group'],
  table: ['row', 'rowgroup'],
  grid: ['row', 'rowgroup'],
  treegrid: ['row', 'rowgroup'],
  rowgroup: ['row'],
};

const IMPLICIT = { li: 'listitem', option: 'option', tr: 'row', tbody: 'rowgroup', thead: 'rowgroup', tfoot: 'rowgroup' };

const roleOf = (element) =>
  element.getAttribute('role')?.trim().split(/\s+/)[0]?.toLowerCase() ??
  IMPLICIT[element.tagName.toLowerCase()];

/**
 * The children a composite role OWNS in the accessibility tree — not the
 * DOM children. role="presentation"/"none" removes an element but leaves
 * its children in place, and role-less div/span wrappers are generic nodes
 * the required-ownership relation passes straight through (tabs inside a
 * styling wrapper inside a tablist are still the tablist's tabs).
 */
function ownedChildren(element) {
  const owned = [];
  for (const child of element.children) {
    if (child.matches('script, style, template')) continue;
    const role = child.getAttribute('role')?.trim().split(/\s+/)[0]?.toLowerCase();
    const passThrough = role === 'presentation' || role === 'none'
      || (!role && (child.tagName === 'DIV' || child.tagName === 'SPAN'));
    if (passThrough) owned.push(...ownedChildren(child));
    else owned.push(child);
  }
  return owned;
}

export default {
  id: 'aria-required-children',
  impact: 'critical',
  tags: ['wcag2a', 'wcag131'],
  help: 'Composite ARIA roles must contain their required children',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html',
  selector: Object.keys(REQUIRED_CHILDREN).map((role) => `[role="${role}"]`).join(', '),
  evaluate(element) {
    if (element.getAttribute('aria-busy') === 'true') return { status: 'pass' }; // still loading
    const role = element.getAttribute('role').trim().split(/\s+/)[0].toLowerCase();
    const required = REQUIRED_CHILDREN[role];
    const children = [...element.children].filter((c) => !c.matches('script, style, template'));
    // A completely empty container is a lazy-load placeholder more often
    // than a defect — it announces as an empty list, which is accurate.
    if (!children.length) return { status: 'pass' };
    if (ownedChildren(element).some((child) => required.includes(roleOf(child)))) return { status: 'pass' };
    return {
      status: 'fail',
      message: `role="${role}" contains no ${required.join('/')} children (not even through wrapper elements) — screen readers announce a broken, empty ${role}.`,
      fix: `Give the item elements role="${required[0]}", or remove role="${role}" from the container.`,
    };
  },
};
