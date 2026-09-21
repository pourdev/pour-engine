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

// What the author most likely meant, for the attributes that turn up most
// on real pages, so the fix names the repair and not just the fault. Each
// says where ARIA 1.2 puts the attribute (its "Used in Roles" list) and what
// serves the same purpose on this role. An attribute with no entry gets the
// general advice. Added 2026-09-21 after inclusion.hsbc.com marked the
// chosen language with aria-selected on a link, where "move it to the
// control that toggles this one" pointed nowhere: the repair there is
// aria-current.
const HINT = {
  selected: (role) => (role === 'cell'
    ? 'A table whose cells can be selected is a grid: aria-selected needs role="grid" on the table, which makes its cells gridcells.'
    : `aria-selected belongs to option, tab, row and gridcell. To mark the current item in a set of ${role === 'link' ? 'links' : 'items'}, such as the current page, language or step, use aria-current, which is global and allowed on this role.`),
  expanded: (role) => (role === 'textbox' || role === 'searchbox'
    ? 'A text field that opens a list of suggestions is a combobox: aria-expanded needs role="combobox", which ARIA in HTML allows on a text input, with aria-controls pointing at the list.'
    : 'aria-expanded belongs on the control that opens and closes the content, a button in most cases, and not on the content or its container. Put it on that control; if this element is itself what the user presses, it should be a button.'),
  checked: (role) => (role === 'button'
    ? 'A button that stays on or off takes aria-pressed, not aria-checked.'
    : 'aria-checked belongs to checkbox, radio, switch, option and the checkable menu items. For something the user ticks, use a native checkbox or radio input.'),
  pressed: () => 'aria-pressed belongs to button alone. If this element switches something on and off, make it a button element.',
};

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

/** The repair for each unsupported attribute: its own hint where there is
 *  one, the general advice for the rest. */
function repair(attrs, role) {
  const hinted = attrs.filter((name) => HINT[name]).map((name) => HINT[name](role));
  const rest = attrs.filter((name) => !HINT[name]).map((name) => `aria-${name}`);
  if (rest.length) hinted.push(`Move ${rest.join('/')} to the element whose role supports it.`);
  return hinted.join(' ');
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
      fix: `${repair(disallowed, role)} If the element has no such state, remove the attribute. Adding a role to this element to make the attribute legal is rarely right: the host language restricts which roles each element may take.`,
    };
  },
};
