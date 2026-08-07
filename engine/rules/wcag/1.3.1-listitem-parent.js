// WCAG SC 1.3.1 Info and Relationships (Level A)
export default {
  id: 'listitem-parent',
  impact: 'serious',
  tags: ['wcag2a', 'wcag131'],
  help: '<li> must be inside a list',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html',
  selector: 'li:not([role])', // a role attribute replaces the listitem semantics
  evaluate(element) {
    // Judge the FLAT-tree parent — what assistive technology actually sees:
    // a slotted <li> belongs to the <ul> around its slot, and an <li> at the
    // top of a shadow tree belongs to its host element.
    let parent = element.assignedSlot?.parentElement ?? element.parentElement ?? element.getRootNode()?.host;
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
    const listContainer = (el) => {
      const role = el.getAttribute('role');
      if (el.matches('ul, ol, menu')) return !role || ['list', 'presentation', 'none'].includes(role);
      return role === 'list';
    };
    while (parent && !listContainer(parent) && (
      ['presentation', 'none'].includes(parent.getAttribute('role') ?? '')
      || (!parent.hasAttribute('role') && (parent.tagName === 'DIV' || parent.tagName === 'SPAN'))
    )) {
      parent = parent.assignedSlot?.parentElement ?? parent.parentElement ?? parent.getRootNode()?.host;
    }
    if (parent && listContainer(parent)) return { status: 'pass' };
    const parentLabel = parent
      ? `<${parent.tagName.toLowerCase()}${parent.getAttribute('role') ? ` role="${parent.getAttribute('role')}"` : ''}>`
      : 'nothing';
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
