// WCAG SC 1.1.1 Non-text Content (Level A) · SC 4.1.2 Name, Role, Value (Level A)
export default {
  id: 'input-image-alt',
  name: 'Image button alt text',
  impact: 'critical',
  tags: ['wcag2a', 'wcag111', 'wcag412'],
  help: 'Image inputs need alt text describing their action',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html',
  selector: 'input[type="image"]',
  evaluate(element, { accessibleName }) {
    if (accessibleName(element)) return { status: 'pass' };
    return {
      status: 'fail',
      message: 'This image button has no alt text — screen readers announce just "button".',
      fix: 'Add alt="What the button does", e.g. alt="Search".',
    };
  },
};
