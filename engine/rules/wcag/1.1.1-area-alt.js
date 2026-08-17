// WCAG SC 1.1.1 Non-text Content (Level A) · SC 2.4.4 Link Purpose (In Context) (Level A)
export default {
  id: 'area-alt',
  name: 'Image map alt text',
  impact: 'critical',
  tags: ['wcag2a', 'wcag111', 'wcag244'],
  help: 'Image map areas must have alternative text',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html',
  selector: 'map area[href]',
  visibleOnly: false,
  evaluate(element, { accessibleName }) {
    if (accessibleName(element)) return { status: 'pass' };
    return {
      status: 'fail',
      message: 'This clickable map area has no alt text — screen readers announce nothing for it.',
      fix: 'Add alt="Where this area links to".',
    };
  },
};
