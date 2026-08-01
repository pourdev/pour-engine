// WCAG SC 1.3.1 Info and Relationships (Level A)
// Child roles that only make sense inside a specific container role.
// Explicit roles only — native elements (li outside ul) are covered by
// listitem-parent/dlitem-parent.
const REQUIRED_PARENT = {
  listitem: ['list'],
  option: ['listbox'],
  menuitem: ['menu', 'menubar'],
  menuitemcheckbox: ['menu', 'menubar'],
  menuitemradio: ['menu', 'menubar'],
  tab: ['tablist'],
  treeitem: ['tree'],
  row: ['table', 'grid', 'treegrid', 'rowgroup'],
  rowgroup: ['table', 'grid', 'treegrid'],
  cell: ['row'],
  gridcell: ['row'],
};

const IMPLICIT_CONTAINER = { ul: 'list', ol: 'list', menu: 'list', table: 'table', tbody: 'rowgroup', thead: 'rowgroup', tfoot: 'rowgroup', tr: 'row' };

export default {
  id: 'aria-required-parent',
  impact: 'critical',
  tags: ['wcag2a', 'wcag131'],
  help: 'ARIA child roles must be inside their required container role',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html',
  selector: Object.keys(REQUIRED_PARENT).map((role) => `[role="${role}"]`).join(', '),
  evaluate(element) {
    const role = element.getAttribute('role').trim().split(/\s+/)[0].toLowerCase();
    const containers = REQUIRED_PARENT[role];
    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
      const parentRole =
        parent.getAttribute('role')?.trim().split(/\s+/)[0]?.toLowerCase() ??
        IMPLICIT_CONTAINER[parent.tagName.toLowerCase()];
      if (parentRole === 'group') continue; // group is transparent in these structures
      // presentation/none removes the wrapper from the tree but leaves its
      // children owned by the next real ancestor — li[role=presentation]
      // between a tablist and its tabs is the canonical pattern.
      if (parentRole === 'presentation' || parentRole === 'none') continue;
      if (containers.includes(parentRole)) return { status: 'pass' };
      if (parentRole) break; // a different role interrupts the required structure
    }
    return {
      status: 'fail',
      message: `role="${role}" is not inside a ${containers.join('/')} — assistive technology loses the structure entirely.`,
      fix: `Wrap it in an element with role="${containers[0]}", or fix the intervening roles.`,
    };
  },
};
