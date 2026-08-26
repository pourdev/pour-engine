// WCAG SC 1.3.1 Info and Relationships (Level A)
const ALLOWED = new Set(['DT', 'DD', 'DIV']);
// Nothing here reaches the accessibility tree, so none of it can corrupt
// the term/description pairing: the same set list-structure keeps, for the
// same reason (CSS-in-JS injects <style> right beside the markup). HTML's
// content model does exclude style from dl, but validity is not the
// criterion; 1.3.1 is about relationships assistive technology can
// determine, and every dt/dd pair stays intact around an element that has
// no tree presence (2026-08-25 overnight audit).
const NEVER_RENDERED = new Set(['SCRIPT', 'TEMPLATE', 'STYLE', 'LINK', 'META']);

export default {
  id: 'definition-list',
  name: 'Definition list structure',
  impact: 'serious',
  tags: ['wcag2a', 'wcag131'],
  help: '<dl> must be structured as term/description pairs',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html',
  selector: 'dl:not([role])', // a role attribute replaces the dl semantics
  evaluate(element, { isRendered }) {
    // A child the browser never renders (display:none, hidden) is not in
    // the accessibility tree either, so it cannot break the pairing a
    // reader hears; list-structure applies the same gate.
    const invalid = [...element.children].filter((child) =>
      !ALLOWED.has(child.tagName) && !NEVER_RENDERED.has(child.tagName) && (!isRendered || isRendered(child)));
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
      child.tagName === 'DIV' && ![...child.children].some((inner) => inner.tagName === 'DT' || inner.tagName === 'DD'));
    if (emptyWrappers.length) {
      return {
        status: 'fail',
        message: `${emptyWrappers.length} <div> wrapper(s) in this <dl> hold no <dt>/<dd> directly — the term/description pairing breaks when the pairs sit deeper than the wrapper.`,
        fix: 'Make each <div> child of the <dl> contain its <dt>/<dd> pair directly, or flatten the pairs into the <dl> itself.',
      };
    }
    return { status: 'pass' };
  },
};
