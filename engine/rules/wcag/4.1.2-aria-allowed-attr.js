// ARIA 1.2 §8.6, repeated verbatim in the 1.3 draft: "authors MUST only use
// non-global states and properties on elements with a role supporting the
// state or property". An unsupported attribute breaks that MUST, so this is a
// real, provable authoring error, and since 2026-09-17 the rule asserts it
// as a violation at minor impact (David: invalid according to the spec is
// marked as such, low). It reviewed until then, on the reasoning below,
// which still decides the impact.
//
// An unsupported attribute is INERT under Core-AAM: user agents expose the
// states and properties a role supports, so aria-expanded on a button
// reaches assistive technology as expanded=true while the same attribute on
// complementary, heading or list reaches nothing (Chromium measured the
// same, as a starting point, not the arbiter). It is dropped, not
// misreported. The role is still exposed, the name is still computed, and
// nothing is announced incorrectly, which is why the impact is minor and
// not serious.
//
// What makes it more than a slip is the thing underneath: if the element
// genuinely has the state the author reached for, that state is now
// invisible to a screen reader, and that is a 4.1.2 failure in the full
// sense. The DOM sometimes proves it: a native readonly, required, disabled
// or checked attribute beside the aria- one (a text input given
// role="region" with readonly and aria-readonly on privatebanking.hsbc.com,
// 2026-09-17). Those attributes belong to aria-state-unreachable, which
// asserts them at moderate; this rule leaves them to it so an element gets
// one finding per attribute, and keeps the stray ones.
//
// Note "unsupported" is distinct from "prohibited" (§5.2.5), a separate
// category about naming that this rule does not cover; aria-label and
// aria-labelledby misuse have their own rule.
//
// Worth knowing when comparing against other tools: aria-expanded WAS
// inherited into complementary, banner, heading, img and list under ARIA 1.1,
// and was narrowed in 1.2 (narrowed again in the 1.3 draft). Markup written
// against 1.1 is not conforming under 1.2, and a tool on the older baseline
// stays silent on it. Neither reading is a bug; they are different editions.
import { attributesOf } from '../../lib/dom.js';
import { GLOBAL_ARIA, ROLE_ARIA, KNOWN_ARIA, effectiveRole } from '../../lib/roles.js';

// aria-label/labelledby misuse on generic elements has its own rule
// (aria-label-misuse) — excluded here to avoid double-reporting.
const HANDLED_ELSEWHERE = new Set(['label', 'labelledby']);

// aria- states whose native HTML attribute of the same name proves the
// element really has the state the unsupported attribute was reaching for.
// Those are aria-state-unreachable's, which imports this.
export const NATIVE_STATE = { readonly: 'readonly', required: 'required', disabled: 'disabled', checked: 'checked' };

/** The element's role and the non-global aria- attributes (names without
 *  the prefix) that role does not support, or null when there are none or
 *  the role is not modelled. Shared with aria-state-unreachable. */
export function unsupportedAria(element) {
  const ariaAttrs = [];
  for (const { name } of attributesOf(element)) {
    if (!name.startsWith('aria-')) continue;
    const attr = name.slice(5);
    // Unknown/misspelled attributes are aria-attr-valid's finding — judging
    // them against a role too would report the same typo twice.
    if (!HANDLED_ELSEWHERE.has(attr) && KNOWN_ARIA.has(attr)) ariaAttrs.push(attr);
  }
  if (!ariaAttrs.length) return null;
  const role = effectiveRole(element);
  const allowed = role && ROLE_ARIA[role];
  if (!allowed) return null; // role not modelled: don't guess
  const names = ariaAttrs.filter((name) => !GLOBAL_ARIA.has(name) && !allowed.includes(name));
  return names.length ? { role, names } : null;
}

export default {
  id: 'aria-allowed-attr',
  name: 'Allowed ARIA attributes',
  impact: 'minor',
  tags: ['wcag2a', 'wcag412'],
  help: 'ARIA attributes must be supported by the element’s role',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html',
  selector: '*',
  visibleOnly: false,
  evaluate(element) {
    const found = unsupportedAria(element);
    if (!found) return { status: 'pass' };
    // A state the DOM proves the element has is aria-state-unreachable's.
    const disallowed = found.names.filter((name) => !(NATIVE_STATE[name] && element.hasAttribute(NATIVE_STATE[name])));
    if (!disallowed.length) return { status: 'pass' };
    const role = found.role;
    const names = disallowed.map((n) => `aria-${n}`);
    return {
      status: 'fail',
      message: `${names.join(', ')} is not supported on role "${role}" (ARIA 1.2 §8.6), so user agents drop it and assistive technology never sees it. Nothing is announced wrongly, but nothing is announced at all. If the element really has that state, it is invisible to a screen reader; if it does not, the attribute is stray and no one is affected, but ARIA 1.2 still says authors MUST NOT write it.`,
      fix: `Move ${names.join('/')} to the element whose role supports it, usually the control that toggles this one, or remove it if the element has no such state. Adding a role to this element to make the attribute legal is rarely right: the host language restricts which roles each element may take.`,
    };
  },
};
