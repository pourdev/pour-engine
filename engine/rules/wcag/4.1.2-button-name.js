// WCAG SC 4.1.2 Name, Role, Value (Level A)
export default {
  id: 'button-name',
  name: 'Button names',
  impact: 'critical',
  tags: ['wcag2a', 'wcag412'],
  help: 'Buttons must have an accessible name',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html',
  selector: 'button, [role="button"], input[type="button"], input[type="submit"], input[type="reset"]',
  evaluate(element, { accessibleName }) {
    if (accessibleName(element)) return { status: 'pass' };
    return {
      status: 'fail',
      message: 'This button has no accessible name — a screen reader announces just "button".',
      fix: 'Add visible text inside the button, or aria-label="What it does" for icon-only buttons.',
    };
  },
};
