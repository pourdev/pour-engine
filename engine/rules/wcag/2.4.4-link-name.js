// WCAG SC 2.4.4 Link Purpose (In Context) (Level A) · SC 4.1.2 Name, Role, Value (Level A)
export default {
  id: 'link-name',
  impact: 'serious',
  tags: ['wcag2a', 'wcag244', 'wcag412'],
  help: 'Links must have an accessible name',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/link-purpose-in-context.html',
  // a[href] has the link role implicitly; role="link" claims it explicitly.
  // (Links without href have no link role and are correctly excluded.)
  selector: 'a[href], [role="link"]',
  evaluate(element, { accessibleName }) {
    if (accessibleName(element)) return { status: 'pass' };
    return {
      status: 'fail',
      message: 'This link has no accessible name — screen readers can only announce its URL.',
      fix: 'Add text content to the link, alt text to the image inside it, or an aria-label.',
    };
  },
};
