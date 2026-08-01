// WCAG SC 4.1.2 Name, Role, Value (Level A)
// ARIA 1.2 marks dialog/alertdialog as name-required roles, and dialogs are
// NOT name-from-content — the body text is the dialog's content, never its
// name. An open, unnamed modal announces as just "dialog", leaving
// screen-reader users with no idea what interrupted them (cookie-consent
// modals are the canonical offender).
export default {
  id: 'dialog-name',
  impact: 'serious',
  tags: ['wcag2a', 'wcag412'],
  help: 'Dialogs must have an accessible name',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html',
  // Default visibility filter: a closed <dialog> is display:none, so only
  // dialogs the user can actually encounter are judged.
  selector: 'dialog, [role="dialog"], [role="alertdialog"]',
  evaluate(element) {
    const labelledby = element.getAttribute('aria-labelledby');
    if (labelledby) {
      const text = labelledby
        .split(/\s+/)
        .map((id) => element.getRootNode().getElementById?.(id)?.textContent ?? '')
        .join(' ')
        .trim();
      if (text) return { status: 'pass' };
    }
    if (element.getAttribute('aria-label')?.trim() || element.getAttribute('title')?.trim()) {
      return { status: 'pass' };
    }
    return {
      status: 'fail',
      message: 'This dialog has no accessible name — screen readers announce just "dialog" with no hint of what it is or why it appeared.',
      fix: 'Point aria-labelledby at the dialog\'s heading, or add aria-label="What this dialog is".',
    };
  },
};
