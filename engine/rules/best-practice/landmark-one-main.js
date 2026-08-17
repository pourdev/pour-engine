export default {
  id: 'landmark-one-main',
  name: 'One main landmark',
  impact: 'moderate',
  tags: ['best-practice'],
  help: 'The page should have exactly one main landmark',
  helpUrl: 'https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/',
  selector: 'html',
  visibleOnly: false,
  evaluate(element, { isVisible }) {
    // Hidden mains (responsive/SPA double-renders kept display:none) are
    // not exposed and must not count as duplicates.
    const count = [...element.ownerDocument.querySelectorAll('main, [role="main"]')].filter(isVisible).length;
    if (count === 1) return { status: 'pass' };
    return {
      status: 'fail',
      message: count === 0
        ? 'No <main> landmark — screen-reader users have no shortcut to the primary content.'
        : `${count} main landmarks — "skip to main" becomes ambiguous.`,
      fix: count === 0 ? 'Wrap the primary content in a single <main> element.' : 'Keep one <main>; demote the others to <section> or <div>.',
    };
  },
};
