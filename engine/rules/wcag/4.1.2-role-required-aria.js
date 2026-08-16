// WCAG SC 4.1.2 Name, Role, Value (Level A)
// Roles that are meaningless without a state attribute alongside them.
const REQUIRED = {
  checkbox: 'aria-checked',
  switch: 'aria-checked',
  radio: 'aria-checked',
  slider: 'aria-valuenow',
  scrollbar: 'aria-valuenow',
  combobox: 'aria-expanded',
};

export default {
  id: 'role-required-aria',
  impact: 'serious',
  tags: ['wcag2a', 'wcag412'],
  help: 'Some roles require a state attribute to work',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html',
  selector: Object.keys(REQUIRED).map((role) => `[role="${role}"]`).join(', '),
  evaluate(element) {
    const role = element.getAttribute('role');
    const required = REQUIRED[role];
    if (element.hasAttribute(required)) return { status: 'pass' };
    // Native semantics supply the state regardless of WHICH state-bearing
    // role is claimed: HTML-AAM maps an input's checkedness to aria-checked
    // (input type=checkbox role="switch" — the standard toggle pattern —
    // exposes checked=false/true in the browser's tree with no ARIA at all),
    // and a range input's value to aria-valuenow likewise.
    const type = element.tagName === 'INPUT' ? element.type : null;
    if (type === 'checkbox' || type === 'radio') {
      if (required === 'aria-checked') return { status: 'pass' };
    }
    if (type === 'range' && required === 'aria-valuenow') return { status: 'pass' };
    if (element.tagName === 'SELECT' && role === 'combobox') return { status: 'pass' };
    return {
      status: 'fail',
      message: `role="${role}" without ${required} — screen readers can't announce the control's state.`,
      fix: `Add ${required} and keep it updated from your script, or use the native HTML element instead.`,
    };
  },
};
