// WCAG SC 1.1.1 Non-text Content (Level A)
export default {
  id: 'object-alt',
  impact: 'serious',
  tags: ['wcag2a', 'wcag111'],
  help: '<object> embeds must have a text alternative',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html',
  selector: 'object',
  evaluate(element, { accessibleName }) {
    if (accessibleName(element) || element.textContent.trim()) return { status: 'pass' };
    return {
      status: 'fail',
      message: 'This embedded object has no text alternative — users who can’t see it get nothing.',
      fix: 'Add aria-label="…", or fallback content inside the <object> element.',
    };
  },
};
