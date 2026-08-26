// WCAG SC 3.3.7 Redundant Entry (Level A, new in 2.2)
//
// Information the user already gave in a process must be auto-populated or
// available to select, unless re-entry is essential, needed for security,
// or the earlier value has gone stale. A cross-page "process" is invisible
// to a one-shot scan, but one slice is visible in a single form: two
// enabled fields declaring the SAME autocomplete purpose. A form with two
// `autocomplete="email"` fields is asking for the email twice — exactly
// the shape the criterion exists for — or it is a confirmation field,
// which is the human's call (the SC's "essential" escape). So this asks,
// it never asserts.
//
// The security escape is honoured structurally: password and one-time-code
// purposes never count (re-entering a password to confirm it IS the
// documented security exception). Distinct scopes are honoured too: the
// autocomplete grammar prefixes a field token with `section-*` / shipping /
// billing, and a shipping address plus a billing address are two different
// pieces of information — only fully identical normalized token lists pair
// up. Fields must be user-reachable: hidden inputs, disabled and readonly
// fields auto-populate without the user typing, which is the SC being
// SATISFIED, not violated.
const EXEMPT = new Set(['new-password', 'current-password', 'one-time-code', 'on', 'off']);

export default {
  id: 'redundant-entry',
  name: 'Redundant entry',
  impact: 'moderate',
  tags: ['wcag22a', 'wcag337'],
  help: 'A form should not ask for the same information twice',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/redundant-entry.html',
  selector: 'form',
  evaluate(element, { isVisible }) {
    const seen = new Map();
    for (const field of element.querySelectorAll('input[autocomplete], select[autocomplete], textarea[autocomplete]')) {
      if (field.disabled || field.readOnly) continue;
      // A field the user cannot reach (a display:none branch of a
      // mutually-exclusive section, a collapsed disclosure) is not
      // "required to be entered again" (2026-08-25 overnight audit).
      if (!isVisible(field)) continue;
      if (field instanceof HTMLInputElement && (field.type === 'hidden' || field.type === 'password')) continue;
      const purpose = (field.getAttribute('autocomplete') || '').trim().toLowerCase().replace(/\s+/g, ' ');
      if (!purpose || EXEMPT.has(purpose)) continue;
      if (seen.has(purpose)) {
        return {
          status: 'incomplete',
          message: `This form asks for "${purpose}" twice — 3.3.7 says information the user already entered must be auto-populated or selectable, not typed again. A deliberate confirmation field can be essential (the criterion's own escape); that judgement is yours.`,
          fix: 'Auto-populate the second field from the first, offer the earlier value for selection, or drop the duplicate. Keep it only if re-entry is genuinely essential here.',
          data: { purpose },
        };
      }
      seen.set(purpose, field);
    }
    return { status: 'pass' };
  },
};
