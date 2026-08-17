// WCAG SC 1.3.1 Info and Relationships (Level A)
// Nothing here reaches the accessibility tree, so none of it can corrupt a
// list's structure. STYLE belongs with them: CSS-in-JS libraries inject
// <style> right where the markup sits, and it was being counted as a stray
// child that broke the list.
const NEVER_RENDERED = new Set(['SCRIPT', 'TEMPLATE', 'STYLE', 'LINK', 'META']);
const ITEM_ROLES = ['listitem', 'presentation', 'none'];

export default {
  id: 'list-structure',
  name: 'List structure',
  impact: 'serious',
  tags: ['wcag2a', 'wcag131'],
  help: 'Lists must only contain list items',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html',
  selector: 'ul, ol',
  evaluate(element, { isRendered }) {
    // A role attribute replaces the HTML list semantics — a <ul role="tablist">
    // is judged by ARIA structure rules, not HTML list rules.
    if (element.hasAttribute('role') && element.getAttribute('role') !== 'list') return { status: 'pass' };
    // Flat-tree children: a <slot> renders as its assigned elements (or its
    // fallback content), so a shadow <ul><slot></slot></ul> receiving <li>s
    // is a perfectly valid list.
    const effectiveChildren = (parent) => [...parent.children].flatMap((child) =>
      child.tagName === 'SLOT'
        ? (child.assignedElements?.().length ? child.assignedElements() : [...child.children])
        : [child]);
    // Role-less div/span wrappers are generic nodes the accessibility tree
    // passes list ownership through — a <ul><div><li>…</li></div></ul>
    // (framework grouping wrappers) still announces size and structure
    // correctly, so it's judged by what the wrapper holds, recursively.
    // Only PURE wrappers qualify: direct text of its own means the element
    // is content, not plumbing — that text sits outside any list item and
    // genuinely corrupts the list.
    const isValidChild = (child) => {
      if (NEVER_RENDERED.has(child.tagName)) return true;
      // A child the browser never renders is not in the accessibility tree
      // either, so it cannot be corrupting the list a reader hears.
      if (isRendered && !isRendered(child)) return true;
      // An explicit role REPLACES an <li>'s listitem semantics: a carousel
      // built as <ul> with <li role="group"> slides no longer owns any
      // listitems, so the list announces broken/empty. Only a role-less
      // <li> (or an explicit listitem/presentation/none anywhere) keeps
      // the structure intact.
      const role = child.getAttribute('role') ?? '';
      if (child.tagName === 'LI') return !role || ITEM_ROLES.includes(role);
      if (ITEM_ROLES.includes(role)) return true;
      const genericWrapper = !child.hasAttribute('role')
        && (child.tagName === 'DIV' || child.tagName === 'SPAN');
      if (!genericWrapper) return false;
      const hasStrayText = [...child.childNodes].some(
        (node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
      return !hasStrayText && effectiveChildren(child).every(isValidChild);
    };
    const invalid = effectiveChildren(element).filter((child) => !isValidChild(child));
    if (!invalid.length) {
      // Every rendered item neutralised: role="none" on each <li> strips
      // its listitem semantics while the <ul> keeps announcing "list" —
      // Chromium exposes the list role over the none children (measured
      // 2026-08-09), so readers hear a list that owns zero items around
      // content they can plainly see. That is the same broken announcement
      // as <ul><div>, reached via a different door. A PARTIAL
      // neutralisation stays valid: hiding a decorative separator item
      // from the count is what role="none" on an <li> is for.
      const renderedItems = effectiveChildren(element).filter((child) =>
        child.tagName === 'LI' && (!isRendered || isRendered(child)));
      const neutralised = renderedItems.filter((child) =>
        ['presentation', 'none'].includes(child.getAttribute('role') ?? ''));
      if (renderedItems.length && neutralised.length === renderedItems.length) {
        return {
          status: 'fail',
          message: `Every item in this list carries role="${neutralised[0].getAttribute('role')}", so the list announces itself with zero items while ${renderedItems.length} are visible — screen readers lose the count and the positions.`,
          fix: 'Remove the role from the <li> elements, or neutralise the whole structure by putting role="presentation" (or the intended widget role) on the list element itself.',
        };
      }
      return { status: 'pass' };
    }
    const tags = [...new Set(invalid.map((child) => {
      const role = child.getAttribute('role');
      return `<${child.tagName.toLowerCase()}${role ? ` role="${role}"` : ''}>`;
    }))].join(', ');
    return {
      status: 'fail',
      message: `This list has ${invalid.length} direct child(ren) without listitem semantics (${tags}) — screen readers misreport the list's size and structure.`,
      fix: 'Use plain <li> children (an explicit role like role="group" replaces the listitem role), or move non-item elements outside the list.',
    };
  },
};
