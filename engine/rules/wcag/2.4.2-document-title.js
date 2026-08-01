// WCAG SC 2.4.2 Page Titled (Level A)
export default {
  id: 'document-title',
  impact: 'serious',
  tags: ['wcag2a', 'wcag242'],
  help: 'The page must have a title that describes its topic or purpose',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/page-titled.html',
  selector: 'html',
  visibleOnly: false,
  evaluate(element) {
    if (element.ownerDocument.title.trim()) return { status: 'pass' };
    return {
      status: 'fail',
      message: 'The page has no title, so users of screen readers and browser tabs cannot tell what it is.',
      fix: 'Add <title>Page name — Site name</title> inside <head>.',
    };
  },
};
