export default {
  id: 'page-heading-one',
  impact: 'moderate',
  tags: ['best-practice'],
  help: 'Every page should start its outline with an <h1>',
  helpUrl: 'https://www.w3.org/WAI/tutorials/page-structure/headings/',
  selector: 'html',
  visibleOnly: false,
  evaluate(element) {
    if (element.ownerDocument.querySelector('h1, [role="heading"][aria-level="1"]')) return { status: 'pass' };
    return {
      status: 'fail',
      message: 'No <h1> — the page outline has no starting point for screen-reader navigation.',
      fix: 'Add one <h1> naming what the page is about.',
    };
  },
};
