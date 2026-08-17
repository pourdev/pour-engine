// WCAG SC 4.1.2 Name, Role, Value (Level A)
export default {
  id: 'frame-title',
  name: 'Frame titles',
  impact: 'serious',
  tags: ['wcag2a', 'wcag412'],
  help: 'Frames must have a title describing their content',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html',
  selector: 'iframe, frame',
  evaluate(element, { accessibleName }) {
    if (element.getAttribute('title')?.trim() || accessibleName(element)) return { status: 'pass' };
    return {
      status: 'fail',
      message: 'This frame has no title — screen-reader users cannot tell what it contains before entering it.',
      fix: `Add title="…" describing the embedded content, e.g. <iframe title="Newsletter signup" src="${element.getAttribute('src') ?? ''}">.`,
    };
  },
};
