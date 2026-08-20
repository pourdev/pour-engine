// ARIA 1.2 §8.6, repeated verbatim in the 1.3 draft: "authors MUST only use
// non-global states and properties on elements with a role supporting the
// state or property". An unsupported attribute breaks that MUST, so this is a
// real, provable authoring error and the rule asserts it.
//
// It is not, on its own, a WCAG failure. An unsupported attribute is INERT,
// measured in Chromium: aria-expanded on a button exposes expanded=true,
// while the same attribute on complementary, heading or list exposes no
// state at all. It is dropped, not misreported. So the role is still
// exposed, the name is still computed, and nothing is announced incorrectly.
// Name, role and value all survive, which is all 4.1.2 asks for.
//
// What CAN fail 4.1.2 is the thing underneath: if the element genuinely has
// the state the author reached for, that state is now invisible to a screen
// reader. Whether it does is exactly what the DOM cannot establish.
//
// So this sits in the WCAG scope and REVIEWS rather than asserts. It lived
// under best-practice before, which was defensible on the letter of 4.1.2
// and wrong in practice: teams act on what a tool marks as WCAG, so a real
// ARIA error that a browser silently discards went unseen in a default
// audit. Asserting a violation would state a criterion failure the browser
// does not actually cause; staying silent leaves a genuine authoring error
// unreported. Asking is the honest third option, and it is the one the
// engine is built around.
//
// Note "unsupported" is distinct from "prohibited" (§5.2.5), a separate
// category about naming that this rule does not cover.
//
// Worth knowing when comparing against other tools: aria-expanded WAS
// inherited into complementary, banner, heading, img and list under ARIA 1.1,
// and was narrowed in 1.2 (narrowed again in the 1.3 draft). Markup written
// against 1.1 is not conforming under 1.2, and a tool on the older baseline
// stays silent on it. Neither reading is a bug; they are different editions.
import { GLOBAL_ARIA, ROLE_ARIA, KNOWN_ARIA, effectiveRole } from '../../lib/roles.js';

// aria-label/labelledby misuse on generic elements has its own rule
// (aria-label-misuse) — excluded here to avoid double-reporting.
const HANDLED_ELSEWHERE = new Set(['label', 'labelledby']);

export default {
  id: 'aria-allowed-attr',
  name: 'Allowed ARIA attributes',
  impact: 'moderate',
  tags: ['wcag2a', 'wcag412'],
  help: 'ARIA attributes must be supported by the element’s role',
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
      message: `${names.join(', ')} is not supported on role "${role}", so the browser drops it and assistive technology never sees it. Nothing is announced wrongly, but nothing is announced at all. Does this element really have that state? If it does, it is invisible to a screen reader and this is a 4.1.2 failure. If it does not, the attribute is simply stray and no one is affected. Invalid markup is not by itself a WCAG failure: the criterion that policed validity, 4.1.1 Parsing, was removed in WCAG 2.2 (w3.org/WAI/WCAG22/Understanding/parsing.html), so what decides this is whether the state reaches users, not the syntax.`,
      fix: `Move ${names.join('/')} to the element whose role supports it, usually the control that toggles this one, or remove it if the element has no such state. Adding a role to this element to make the attribute legal is rarely right: the host language restricts which roles each element may take.`,
    };
  },
};
