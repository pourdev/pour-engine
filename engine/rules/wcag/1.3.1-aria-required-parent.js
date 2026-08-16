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
    // aria-owns makes the relationship without containment: the owner can sit
    // anywhere in the document and the browser still builds the structure.
    // Judging by DOM ancestry alone failed every remotely-owned child.
    if (element.id) {
      const owner = element.getRootNode().querySelector?.(`[aria-owns~="${CSS.escape(element.id)}"]`);
      const ownerRole = owner && (
        owner.getAttribute('role')?.trim().split(/\s+/)[0]?.toLowerCase()
        ?? IMPLICIT_CONTAINER[owner.tagName.toLowerCase()]);
      if (ownerRole && containers.includes(ownerRole)) return { status: 'pass' };
    }
    // FLAT-TREE ancestry, not light-DOM ancestry: assistive technology sees
    // the composed tree, so a slotted role="listitem" whose role="list"
    // container lives inside the host component's shadow root IS inside a
    // list (Adobe Spectrum's sidenav is exactly this — a light-DOM walk was
    // 11 false asserts on one page). An element assigned to a slot continues
    // through the slot's shadow-side ancestors; an element at a shadow root's
    // top continues through the host.
    const flatParent = (node) => node.assignedSlot
      ?? node.parentElement
      ?? (node.getRootNode() instanceof ShadowRoot ? node.getRootNode().host : null);
    for (let parent = flatParent(element); parent; parent = flatParent(parent)) {
      // A <slot> is rendering plumbing with no tree presence of its own.
      if (parent.tagName === 'SLOT' && !parent.hasAttribute('role')) continue;
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
