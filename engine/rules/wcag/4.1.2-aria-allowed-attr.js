// WCAG SC 4.1.2 Name, Role, Value (Level A)
// An ARIA attribute the role does not support is INERT. Measured in Chromium:
// aria-expanded on a button exposes expanded=false, and the same attribute on
// a complementary landmark exposes no state at all. It is dropped, not
// misreported, so the old "announces the wrong state" wording was wrong.
//
// Which is why this REVIEWS rather than fails. ARIA 1.2 §5.2.3 says authors
// MAY provide supported states and user agents MUST map them; "prohibited"
// (§5.2.5) is a separate category this rule does not cover. An unsupported
// attribute is therefore not a spec violation, and name, role and value are
// all still conveyed correctly, so no success criterion provably fails.
//
// The 4.1.2 tag stays because there IS a real failure hiding here: if the
// element genuinely has the state the author was reaching for, that state is
// now invisible to assistive technology. Whether it does is exactly what the
// DOM cannot establish, so it is a question for a person. Same reasoning that
// put aria-label-misuse in best-practice.
//
// Worth knowing when comparing against other tools: aria-expanded WAS
// inherited into complementary, banner, heading, img and list under ARIA 1.1,
// and was narrowed in 1.2 (narrowed again in the 1.3 draft). Markup written
// against 1.1 is not conforming under 1.2, and a tool on the older baseline
// stays silent on it.
import { GLOBAL_ARIA, ROLE_ARIA, KNOWN_ARIA, effectiveRole } from '../../lib/roles.js';

// aria-label/labelledby misuse on generic elements has its own rule
// (aria-label-misuse) — excluded here to avoid double-reporting.
const HANDLED_ELSEWHERE = new Set(['label', 'labelledby']);

export default {
  id: 'aria-allowed-attr',
  impact: 'moderate',
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
    const names = disallowed.map((n) => `aria-${n}`);
    return {
      status: 'incomplete',
      message: `${names.join(', ')} is not supported on role "${role}", so the browser drops it and assistive technology never sees it. Nothing is announced wrongly, but nothing is announced at all. If this element really does have that state, it is currently invisible: check whether it needs conveying another way.`,
      fix: `Move ${names.join('/')} to the element whose role supports it, usually the control that toggles this one, or remove it if the element has no such state.`,
    };
  },
};
