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
    // A redundant explicit role on the native element (input type=checkbox
    // role=checkbox — common framework output) needs no ARIA state: the
    // host language supplies checkedness/value natively.
    const type = element.tagName === 'INPUT' ? element.type : null;
    const NATIVE_STATE = { checkbox: 'checkbox', radio: 'radio', range: 'slider' };
    if (type && NATIVE_STATE[type] === role) return { status: 'pass' };
    if (element.tagName === 'SELECT' && role === 'combobox') return { status: 'pass' };
    return {
      status: 'fail',
      message: `role="${role}" without ${required} — screen readers can't announce the control's state.`,
      fix: `Add ${required} and keep it updated from your script, or use the native HTML element instead.`,
    };
  },
};
