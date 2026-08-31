// WCAG SC 4.1.2 Name, Role, Value (Level A)
// ARIA 1.2 attribute names (shared vocabulary in lib/roles.js), and the
// allowed values for enumerated ones.
import { attributesOf } from '../../lib/dom.js';
import { KNOWN_ARIA as KNOWN, GLOBAL_ARIA, ROLE_ARIA, effectiveRole } from '../../lib/roles.js';

// Note: "undefined" is a legal token for the tristate/undefinable attributes
// (aria-expanded, aria-selected, aria-checked, aria-pressed) per ARIA 1.2.
// aria-hidden and aria-orientation list it too, as their default token
// ("undefined (default): determined by the user agent" / "orientation is
// unknown/ambiguous"). Added 2026-08-25 overnight audit: rejecting it was a
// false assertion on conforming markup.
const ENUMS = {
  'aria-atomic': ['true', 'false'], 'aria-busy': ['true', 'false'],
  'aria-disabled': ['true', 'false'], 'aria-expanded': ['true', 'false', 'undefined'],
  'aria-hidden': ['true', 'false', 'undefined'], 'aria-modal': ['true', 'false'],
  'aria-multiline': ['true', 'false'], 'aria-multiselectable': ['true', 'false'],
  'aria-readonly': ['true', 'false'], 'aria-required': ['true', 'false'],
  'aria-selected': ['true', 'false', 'undefined'],
  'aria-checked': ['true', 'false', 'mixed', 'undefined'], 'aria-pressed': ['true', 'false', 'mixed', 'undefined'],
  'aria-live': ['off', 'polite', 'assertive'],
  'aria-orientation': ['horizontal', 'vertical', 'undefined'],
  'aria-sort': ['none', 'ascending', 'descending', 'other'],
  'aria-autocomplete': ['none', 'inline', 'list', 'both'],
  'aria-invalid': ['true', 'false', 'grammar', 'spelling'],
  'aria-haspopup': ['true', 'false', 'menu', 'listbox', 'tree', 'grid', 'dialog'],
  'aria-current': ['true', 'false', 'page', 'step', 'location', 'date', 'time'],
};

export default {
  id: 'aria-attr-valid',
  name: 'Valid ARIA values',
  impact: 'critical',
  tags: ['wcag2a', 'wcag412'],
  help: 'aria attributes must exist and have valid values',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html',
  selector: '*',
  visibleOnly: false, // applies to hidden elements too; also avoids visibility cost on every node
  evaluate(element) {
    // Two different findings live here (split 2026-08-25 overnight audit).
    //
    // An UNKNOWN attribute name is ignored outright by the browser: it can
    // alter no name, role or value, so by itself it proves no 4.1.2 failure
    // (the criterion that policed validity, 4.1.1 Parsing, is gone from
    // WCAG 2.2). What it may hide is a real state or name the author reached
    // for and mistyped; where that leaves a control nameless the name rules
    // already assert. So unknown names are a review question, the same
    // stance aria-allowed-attr takes for an unsupported attribute.
    //
    // An enumerated VALUE the browser cannot parse, on a role that supports
    // the state, is different: the author wrote a state and the browser drops
    // it, so the state the element has is invisible. That stays asserted.
    // When the element's role is modelled and does not support the attribute
    // at all, the value is moot and aria-allowed-attr already reviews the
    // attribute; reporting the value too would be the same finding twice.
    //
    // An EMPTY value is a third thing. ARIA defines the empty string as the
    // default for aria-current (absent, empty and undefined all mean false),
    // so aria-current="" is a correct way to say "not current" and nothing
    // is lost (a design-system home writes it that way on every non-active
    // link). For the other enumerated states an empty value is one the
    // browser drops, which is the unknown-name situation again: nothing
    // exposed wrongly, possibly a state the author meant. Review, not fail.
    const unknown = [];
    const invalid = [];
    const empty = [];
    let role;
    for (const { name, value } of attributesOf(element)) {
      if (!name.startsWith('aria-')) continue;
      const attr = name.slice(5);
      if (!KNOWN.has(attr)) {
        unknown.push(name);
      } else if (ENUMS[name] && value.trim() === '') {
        if (name !== 'aria-current') empty.push(name);
      } else if (ENUMS[name] && !ENUMS[name].includes(value.trim().toLowerCase())) {
        if (!GLOBAL_ARIA.has(attr)) {
          role ??= effectiveRole(element);
          if (role && ROLE_ARIA[role] && !ROLE_ARIA[role].includes(attr)) continue;
        }
        invalid.push(`${name}="${value}" — allowed values: ${ENUMS[name].join(', ')}`);
      }
    }
    if (invalid.length) {
      return {
        status: 'fail',
        message: `Invalid ARIA: ${invalid.join('; ')}. Assistive technology ignores attributes it doesn't recognise.`,
        fix: 'Correct the attribute name/value against the ARIA specification, or remove it.',
      };
    }
    if (empty.length) {
      return {
        status: 'incomplete',
        message: `${empty.join(', ')} is empty, so the browser ignores it and no state is exposed. Was a value intended here? If a real state was meant (${empty.map((n) => ENUMS[n].slice(0, 3).join(', ')).join('; ')}, ...), it is missing and this is a 4.1.2 failure; if the attribute is a template leftover, no one is affected.`,
        fix: 'Give the attribute one of its allowed values, or remove it.',
      };
    }
    if (unknown.length) {
      return {
        status: 'incomplete',
        message: `${unknown.join(', ')} is not an ARIA attribute, so the browser ignores it and assistive technology never sees it. Nothing is announced wrongly, but nothing is announced at all. Was a real ARIA state or name intended here? If it was, that state or name is missing and this is a 4.1.2 failure. If not, the attribute is stray and no one is affected. Invalid markup is not by itself a WCAG failure: the criterion that policed validity, 4.1.1 Parsing, was removed in WCAG 2.2.`,
        fix: 'Correct the attribute name against the ARIA specification, or remove it.',
      };
    }
    return { status: 'pass' };
  },
};
