// WCAG SC 4.1.2 Name, Role, Value (Level A)
// ARIA attributes must be supported by the element's role — aria-selected
// on a plain link, aria-checked on a heading, etc. are ignored (or worse,
// misreported) by assistive technology.
import { GLOBAL_ARIA, ROLE_ARIA, KNOWN_ARIA, effectiveRole } from '../../lib/roles.js';

// aria-label/labelledby misuse on generic elements has its own rule
// (aria-label-misuse) — excluded here to avoid double-reporting.
const HANDLED_ELSEWHERE = new Set(['label', 'labelledby']);

export default {
  id: 'aria-allowed-attr',
  impact: 'critical',
  tags: ['wcag2a', 'wcag412'],
  help: 'ARIA attributes must be allowed for the element’s role',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html',
  selector: '*',
  visibleOnly: false,
  evaluate(element) {
    // Plain loop, no intermediate arrays: this runs on every element of the
    // page, and nearly all have no aria-* attributes at all.
    const ariaAttrs = [];
    for (const { name } of element.attributes) {
      if (!name.startsWith('aria-')) continue;
      const attr = name.slice(5);
      // Unknown/misspelled attributes are aria-attr-valid's finding — judging
      // them against a role too would report the same typo twice.
      if (!HANDLED_ELSEWHERE.has(attr) && KNOWN_ARIA.has(attr)) ariaAttrs.push(attr);
    }
    if (!ariaAttrs.length) return { status: 'pass' };

    const role = effectiveRole(element);
    const allowed = role && ROLE_ARIA[role];
    if (!allowed) return { status: 'pass' }; // role not modelled: don't guess

    const disallowed = ariaAttrs.filter((name) => !GLOBAL_ARIA.has(name) && !allowed.includes(name));
    if (!disallowed.length) return { status: 'pass' };
    return {
      status: 'fail',
      message: `${disallowed.map((n) => `aria-${n}`).join(', ')} is not supported on role "${role}" — assistive technology ignores it or announces the wrong state.`,
      fix: `Use a role that supports ${disallowed.map((n) => `aria-${n}`).join('/')}, or remove the attribute(s).`,
    };
  },
};
