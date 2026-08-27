// WCAG SC 1.3.1 Info and Relationships (Level A)
import { ROLE_ARIA } from '../../lib/roles.js';

export default {
  id: 'listitem-parent',
  name: 'List item placement',
  impact: 'serious',
  tags: ['wcag2a', 'wcag131'],
  help: '<li> must be inside a list',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html',
  selector: 'li:not([role])', // a role attribute replaces the listitem semantics
  evaluate(element) {
    // Judge the FLAT-tree parent — what assistive technology actually sees:
    // a slotted <li> belongs to the <ul> around its slot, and an <li> at the
    // top of a shadow tree belongs to its host element.
    const flatParent = (el) => el.assignedSlot?.parentElement ?? el.parentElement ?? el.getRootNode()?.host;
    let parent = flatParent(element);
    while (parent?.tagName === 'SLOT') parent = parent.assignedSlot?.parentElement ?? parent.parentElement;
    // List ownership passes through presentation/none wrappers and
    // role-less div/span grouping wrappers (generic nodes) — an <li> in a
    // framework's wrapping div inside a <ul> is still that list's item.
    // A list CONTAINER stops the walk even when it is itself presentational:
    // ARIA propagates an explicit presentation role to a role's required
    // owned elements, so the <li>s in a <ul role="none"> are presentational
    // too. There is no listitem left to be orphaned, and stepping over the
    // <ul> used to blame whatever happened to be above it.
    //
    // Any OTHER explicit role replaces the native list semantics entirely:
    // a <ul role="navigation"> is a navigation landmark, not a list, so it
    // cannot own listitems and its <li> children are orphaned exactly as if
    // the <ul> were a <div>. Matching the tag alone waved those through
    // (found on ar.wikipedia.org: portal links in <ul role="navigation">).
    //
    // The role that counts is the first token the browser knows. An unknown
    // token (<ol role="breadcrumbs">, seen on a design-system home) is
    // dropped by every user agent (ARIA 1.2 §7.1, fallback roles), so the
    // native list role stands and its <li>s are owned as usual; valid-role
    // reports the misspelling on its own. Reading the raw attribute made
    // the rule blame the list's items for a token that changed nothing.
    const listContainer = (el) => {
      const tokens = (el.getAttribute('role') ?? '').trim().toLowerCase().split(/\s+/).filter(Boolean);
      const role = tokens.find((t) => ROLE_ARIA[t]) ?? null;
      if (el.matches('ul, ol, menu')) return !role || ['list', 'presentation', 'none'].includes(role);
      return role === 'list';
    };
    const transparent = (el) => ['presentation', 'none'].includes(el.getAttribute('role') ?? '')
      || (!el.hasAttribute('role') && (el.tagName === 'DIV' || el.tagName === 'SPAN'));
    while (parent && !listContainer(parent) && transparent(parent)) parent = flatParent(parent);
    if (parent && listContainer(parent)) return { status: 'pass' };
    const parentLabel = parent
      ? `<${parent.tagName.toLowerCase()}${parent.getAttribute('role') ? ` role="${parent.getAttribute('role')}"` : ''}>`
      : 'nothing';
    // A role="group" wrapper BETWEEN a list and its items: the list is
    // there (Chromium exposes list > group > listitem), but ARIA 1.2 gives
    // list one required owned element, listitem, so the group is not
    // permitted in between and the items are no longer the list's own. The
    // verdict stands; the old message blamed a missing list and the fix
    // sent the author to add one that already existed (2026-08-25
    // overnight audit).
    if (parent?.getAttribute('role') === 'group') {
      let above = flatParent(parent);
      while (above && !listContainer(above) && (transparent(above) || above.getAttribute('role') === 'group')) above = flatParent(above);
      if (above && listContainer(above)) {
        return {
          status: 'fail',
          message: `This <li> sits inside ${parentLabel} within its list. A list may only own list items directly, and role="group" is not permitted between a list and its items, so screen readers lose the item's list context.`,
          fix: 'Remove role="group" from the wrapper (a plain <div> keeps the items owned by the list), or move the group label onto the list element with aria-label.',
        };
      }
    }
    return {
      status: 'fail',
      message: `This <li> sits inside ${parentLabel} — ${parent?.matches('ul, ol, menu') && parent.getAttribute('role')
        ? 'the explicit role replaces the list semantics, so'
        : 'outside a list,'} screen readers lose the item's list context entirely.`,
      fix: parent?.matches('ul, ol, menu') && parent.getAttribute('role')
        ? 'Remove the role from the list (use a wrapping element for the landmark), or give the items roles the container expects.'
        : 'Wrap it in a <ul> or <ol>, or change it to a <div>/<p> if it isn’t really a list item.',
    };
  },
};
