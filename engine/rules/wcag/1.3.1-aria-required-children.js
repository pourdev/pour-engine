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
 * Every element in the COMPOSED subtree of `element`: its light-DOM
 * descendants plus, for each element carrying an open shadow root
 * (`element` itself included), everything inside that shadow tree, again
 * recursively. Assistive technology reads the flat tree, so a role="list"
 * whose items are custom elements rendering role="listitem" inside their
 * own shadow roots is a list of listitems (Chromium exposes list > listitem,
 * listitem); querySelectorAll stops at the shadow boundary and reported it
 * as empty (2026-08-25 overnight audit; same reasoning as
 * aria-required-parent's flat-tree walk). Closed roots stay invisible, as
 * everywhere else in the engine.
 *
 * The walk also follows <slot>s downward: a container rendered inside a
 * shadow root (a design system's <div role="list"> holding only a <slot>)
 * owns the light-DOM items projected into it, which is what Chromium
 * exposes as list > listitem. Reading the shadow tree alone reported the
 * list as empty (spectrum.adobe.com, 2026-08-27 disagreement crawl).
 */
function composedDescendants(element) {
  const found = [];
  const pending = [element];
  const seen = new Set();
  const enter = (el) => {
    if (seen.has(el)) return;
    seen.add(el);
    found.push(el);
    if (el.shadowRoot) pending.push(el.shadowRoot);
    if (el.tagName === 'SLOT') for (const assigned of el.assignedElements({ flatten: true })) { enter(assigned); pending.push(assigned); }
  };
  for (let i = 0; i < pending.length; i++) {
    const scope = pending[i];
    if (scope.shadowRoot) pending.push(scope.shadowRoot);
    if (scope.tagName === 'SLOT') for (const assigned of scope.assignedElements({ flatten: true })) { enter(assigned); pending.push(assigned); }
    for (const el of scope.querySelectorAll('*')) enter(el);
  }
  return found;
}

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
  const found = composedDescendants(element).filter((el) => !el.matches('script, style, template'));
  const owns = element.getAttribute('aria-owns');
  if (owns) {
    const root = element.getRootNode();
    for (const id of owns.split(/\s+/).filter(Boolean)) {
      const target = root.getElementById?.(id);
      if (target) found.push(target, ...composedDescendants(target));
    }
  }
  return found;
}

export default {
  id: 'aria-required-children',
  name: 'Required ARIA children',
  impact: 'critical',
  tags: ['wcag2a', 'wcag131'],
  help: 'Composite ARIA roles must contain their required children',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html',
  selector: Object.keys(REQUIRED_CHILDREN).map((role) => `[role="${role}"]`).join(', '),
  evaluate(element) {
    if (element.getAttribute('aria-busy') === 'true') return { status: 'pass' }; // still loading
    const role = element.getAttribute('role').trim().split(/\s+/)[0].toLowerCase();
    const required = REQUIRED_CHILDREN[role];
    const children = [...element.children, ...(element.shadowRoot?.children ?? [])]
      .filter((c) => !c.matches('script, style, template'));
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
