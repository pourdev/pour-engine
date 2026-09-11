// WCAG SC 1.3.1 Info and Relationships (Level A)
import { NEVER_RENDERED, isInert } from '../../lib/dom.js';

const ALLOWED = new Set(['DT', 'DD', 'DIV']);
// NEVER_RENDERED cannot corrupt the term/description pairing: HTML's content
// model does exclude style from dl, but validity is not the criterion;
// 1.3.1 is about relationships assistive technology can determine, and
// every dt/dd pair stays intact around an element that has no tree
// presence (2026-08-25 overnight audit).

export default {
  id: 'definition-list',
  name: 'Definition list structure',
  impact: 'serious',
  tags: ['wcag2a', 'wcag131'],
  help: '<dl> must be structured as term/description pairs',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html',
  selector: 'dl:not([role])', // a role attribute replaces the dl semantics
  evaluate(element, { isRendered }) {
    const exposed = (child) => !NEVER_RENDERED.has(child.tagName)
      && !child.closest('[aria-hidden="true"]') && !isInert(child)
      && (!isRendered || isRendered(child) || getComputedStyle(child).display === 'contents');
    // A child the browser never renders (display:none, hidden) is not in
    // the accessibility tree either, so it cannot break the pairing a
    // reader hears; list-structure applies the same gate.
    const invalid = [...element.children].filter((child) =>
      !ALLOWED.has(child.tagName) && exposed(child));
    if (invalid.length) {
      const tags = [...new Set(invalid.map((child) => `<${child.tagName.toLowerCase()}>`))].join(', ');
      return {
        status: 'fail',
        message: `This <dl> contains ${tags} directly — only <dt>, <dd> (optionally grouped in <div>) are allowed, otherwise the term/description pairing breaks.`,
        fix: 'Restructure the list into <dt>/<dd> pairs, or use a different element.',
      };
    }
    // A <div> child is only a valid wrapper when it holds the dt/dd group
    // ITSELF (HTML: each div contains one or more dt followed by one or
    // more dd). Pairs buried another level down (dl > div > div > dt) fall
    // out of the dl's content model, so the term/description association is
    // no longer guaranteed to assistive technology.
    const emptyWrappers = [...element.children].filter((child) =>
      child.tagName === 'DIV' && exposed(child) && ![...child.children].some((inner) => inner.tagName === 'DT' || inner.tagName === 'DD'));
    if (emptyWrappers.length) {
      return {
        status: 'fail',
        message: `${emptyWrappers.length} <div> wrapper(s) in this <dl> hold no <dt>/<dd> directly — the term/description pairing breaks when the pairs sit deeper than the wrapper.`,
        fix: 'Make each <div> child of the <dl> contain its <dt>/<dd> pair directly, or flatten the pairs into the <dl> itself.',
      };
    }
    // HTML defines a group as one or more terms followed by one or more
    // descriptions. Check each wrapper independently, so a term in one
    // group cannot supply the missing term of another.
    // https://html.spec.whatwg.org/multipage/grouping-content.html#the-dl-element
    const children = [...element.children].filter(exposed);
    const groups = [[...element.children].filter((child) => child.tagName !== 'DIV'),
      ...children.filter((child) => child.tagName === 'DIV').map((child) => [...child.children])];
    for (const members of groups) {
      const group = members.filter(exposed);
      const concealedPairMember = members.some((child) => (child.tagName === 'DT' || child.tagName === 'DD') && !exposed(child));
      const concealedResult = {
        status: 'incomplete',
        message: 'A term or description in this group is hidden from assistive technology. Check that any disclosure control exposes the associated content when opened, and that the term and description relationship remains available.',
      };
      let last = null;
      for (const child of group) {
        if (child.tagName !== 'DT' && child.tagName !== 'DD') continue;
        if (child.tagName === 'DD' && last === null) {
          if (concealedPairMember) return concealedResult;
          return {
            status: 'fail',
            message: 'This description list has a description without a preceding term in its group.',
            fix: 'Add a <dt> before the <dd>, or use a paragraph when the content is not a term and description.',
          };
        }
        last = child.tagName;
      }
      if (last === 'DT') {
        if (concealedPairMember) return concealedResult;
        return {
          status: 'fail',
          message: 'This description list ends a group with a term that has no description.',
          fix: 'Follow the <dt> element or elements with at least one <dd> in the same group.',
        };
      }
    }
    return { status: 'pass' };
  },
};
