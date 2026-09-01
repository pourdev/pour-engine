// WCAG SC 4.1.2 Name, Role, Value (Level A)
// Roles that are meaningless without a state or property alongside them.
// The table is ARIA 1.2's "Required States and Properties" row for every
// role that has one, read from the spec on 2026-09-01: checkbox, switch,
// radio, menuitemcheckbox and menuitemradio need aria-checked; slider,
// meter and scrollbar need aria-valuenow (scrollbar also aria-controls);
// a SEPARATOR needs aria-valuenow only when it is focusable, because a
// focusable separator is a resizing widget and a static one is a divider;
// heading needs aria-level; combobox needs aria-expanded and aria-controls;
// option needs aria-selected.
//
// Two of those properties are held at review rather than failed. Browsers
// and screen readers get by without aria-controls (the relationship it
// names is rarely announced, and a collapsed combobox has nothing to
// control yet), and without aria-selected on an option (selection is
// often conveyed by focus alone); the spec lists both, the DOM cannot
// show a user is blocked, so the finding asks rather than asserts.
export const REQUIRED = {
  checkbox: ['aria-checked'],
  switch: ['aria-checked'],
  radio: ['aria-checked'],
  menuitemcheckbox: ['aria-checked'],
  menuitemradio: ['aria-checked'],
  slider: ['aria-valuenow'],
  meter: ['aria-valuenow'],
  scrollbar: ['aria-valuenow', 'aria-controls'],
  separator: ['aria-valuenow'],
  heading: ['aria-level'],
  combobox: ['aria-expanded', 'aria-controls'],
  option: ['aria-selected'],
};
export const HELD_AT_REVIEW = new Set(['aria-controls', 'aria-selected']);

// What each missing property costs the user, in the message.
const COST = {
  'aria-checked': "screen readers can't announce whether it is on or off",
  'aria-valuenow': "screen readers can't announce its value or position",
  'aria-level': 'browsers assume level 2 for a heading with no level, so the outline a screen reader user navigates by is a guess',
  'aria-expanded': "screen readers can't announce whether its list is open",
  'aria-controls': 'assistive technology has no link from the control to what it operates',
  'aria-selected': 'a screen reader may not announce which option is selected',
};

// Native semantics supply the state regardless of WHICH state-bearing
// role is claimed: HTML-AAM maps an input's checkedness to aria-checked
// (input type=checkbox role="switch" — the standard toggle pattern —
// exposes checked=false/true in the browser's tree with no ARIA at all),
// a range input's or meter's value to aria-valuenow, a heading element's
// rank to aria-level, an option's selectedness to aria-selected, and a
// select's open state to aria-expanded.
function suppliedNatively(element, attr) {
  const tag = element.tagName;
  const type = tag === 'INPUT' ? element.type : null;
  switch (attr) {
    case 'aria-checked': return type === 'checkbox' || type === 'radio';
    case 'aria-valuenow': return type === 'range' || tag === 'METER' || tag === 'PROGRESS';
    case 'aria-level': return /^H[1-6]$/.test(tag);
    case 'aria-selected': return tag === 'OPTION';
    case 'aria-expanded': return tag === 'SELECT';
    default: return false;
  }
}

export default {
  id: 'role-required-aria',
  name: 'Required role states',
  impact: 'serious',
  tags: ['wcag2a', 'wcag412'],
  help: 'Some roles require a state attribute to work',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html',
  selector: Object.keys(REQUIRED).map((role) => `[role="${role}"]`).join(', '),
  evaluate(element) {
    const role = element.getAttribute('role');
    // A separator that cannot take focus is a static divider (an <hr> by
    // another name) and requires nothing; only the focusable, moveable
    // kind is a widget with a position to announce.
    if (role === 'separator' && !(element.tabIndex >= 0)) return { status: 'pass' };
    const missing = REQUIRED[role].filter((attr) => !element.hasAttribute(attr) && !suppliedNatively(element, attr));
    if (!missing.length) return { status: 'pass' };
    const failing = missing.filter((attr) => !HELD_AT_REVIEW.has(attr));
    if (failing.length) {
      const list = failing.join(' and ');
      const why = role === 'separator'
        ? `this separator takes focus, so it is a resizing widget, but without aria-valuenow ${COST['aria-valuenow']}`
        : failing.map((attr) => COST[attr]).join('; ');
      return {
        status: 'fail',
        message: `role="${role}" without ${list} — ${why}.`,
        fix: `Add ${list} and keep it updated from your script, or use the native HTML element instead.`,
      };
    }
    // Only review-held properties are missing. A collapsed combobox has no
    // popup to point aria-controls at, so it is asked only while open.
    if (role === 'combobox' && element.getAttribute('aria-expanded') !== 'true') return { status: 'pass' };
    const list = missing.join(' and ');
    return {
      status: 'incomplete',
      message: `role="${role}" without ${list}, which ARIA lists as required for the role — ${missing.map((attr) => COST[attr]).join('; ')}. Check the control is usable with a screen reader; adding ${list} settles it.`,
    };
  },
};
