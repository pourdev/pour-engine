// WCAG SC 1.3.1 Info and Relationships (Level A)
// Composite roles are meaningless without their required child roles —
// role="list" with no listitems announces as an empty list.
import { implicitRole } from '../../lib/roles.js';
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

const roleOf = (element) =>
  element.getAttribute('role')?.trim().split(/\s+/)[0]?.toLowerCase() ??
  implicitRole(element);

/**
 * Everything the container could plausibly own: its whole subtree, plus any
 * element it claims by aria-owns.
 *
 * This deliberately does not model ownership precisely. The rule's job is to
 * catch a container that holds NONE of the children its role needs, which is
 * what makes a screen reader announce an empty list. Enumerating which wrapper
 * tags ownership passes through was the wrong shape for that: the allow-list
 * held div and span only, so the ordinary tabs-in-list-items pattern was
 * reported as a broken tablist. A required role anywhere inside means the
 * container is not empty, and that is the only claim this rule should make.
 */
function candidateDescendants(element) {
  const found = [...element.querySelectorAll('*')].filter((el) => !el.matches('script, style, template'));
  const owns = element.getAttribute('aria-owns');
  if (owns) {
    const root = element.getRootNode();
    for (const id of owns.split(/\s+/).filter(Boolean)) {
      const target = root.getElementById?.(id);
      if (target) found.push(target, ...target.querySelectorAll('*'));
    }
  }
  return found;
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
    if (!children.length && !element.hasAttribute('aria-owns')) return { status: 'pass' };
    if (candidateDescendants(element).some((child) => required.includes(roleOf(child)))) {
      return { status: 'pass' };
    }
    return {
      status: 'fail',
      message: `role="${role}" contains no ${required.join('/')} anywhere inside it, and claims none by aria-owns — screen readers announce a broken, empty ${role}.`,
      fix: `Give the item elements role="${required[0]}", or remove role="${role}" from the container.`,
    };
  },
};
