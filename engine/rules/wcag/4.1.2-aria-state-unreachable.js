// WCAG SC 4.1.2 Name, Role, Value (Level A)
// The proven half of aria-allowed-attr, split out on 2026-09-17 so it can
// carry its own impact. That rule asserts every non-global ARIA attribute
// an element's role does not support (ARIA 1.2 §8.6, an author MUST) at
// minor, because such an attribute is inert: user agents expose only the
// states a role supports, so nothing false is announced and the name and
// role survive. Most of the time the attribute is stray and nobody is
// affected.
//
// This rule fires when the DOM proves the state is real: a native readonly,
// required, disabled or checked attribute sits beside the unsupported aria-
// one. Then the element genuinely has the state, the host language applies
// it, and no assistive technology can learn it through the role the author
// chose. That is what 4.1.2 asks for and does not get, so the impact is
// moderate: a screen reader user meets a readonly field announced as a
// region and tries to type into it, or a required field they cannot tell is
// required. Moderate rather than serious because the control still works
// and its value is still there; the state is what is lost.
//
// The shape it was written for: four calculator output fields on
// privatebanking.hsbc.com, <input type="text" role="region" readonly
// aria-readonly="true">. ARIA 1.2 does not give region aria-readonly, and
// Core-AAM maps the author's role, so the field reaches assistive
// technology as a landmark. (ARIA in HTML also forbids region on a text
// input, which is a role finding this rule does not make.) Decided from the
// spec text; Chromium's tree, which exposes the region with no readonly
// property, was the starting point and not the arbiter.
//
// aria-allowed-attr leaves these attributes to this rule, so an element gets
// one finding per attribute, not two. An element with a proven state and a
// second, unproven unsupported attribute gets one of each.
import { unsupportedAria, NATIVE_STATE } from './4.1.2-aria-allowed-attr.js';

export default {
  id: 'aria-state-unreachable',
  name: 'ARIA state the element really has cannot be reached',
  impact: 'moderate',
  tags: ['wcag2a', 'wcag412'],
  help: 'A state the element has must be exposed through a role that supports it',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html',
  selector: '[aria-readonly], [aria-required], [aria-disabled], [aria-checked]',
  visibleOnly: false,
  evaluate(element) {
    const found = unsupportedAria(element);
    if (!found) return { status: 'pass' };
    const proven = found.names.filter((name) => NATIVE_STATE[name] && element.hasAttribute(NATIVE_STATE[name]));
    if (!proven.length) return { status: 'pass' };
    const states = proven.map((name) => `aria-${name}`);
    const natives = proven.map((name) => NATIVE_STATE[name]);
    return {
      status: 'fail',
      message: `This element really is ${natives.join(' and ')}: its native ${natives.join(' and ')} attribute says so. But ${states.join(' and ')} is not supported on role "${found.role}" (ARIA 1.2 §8.6), so user agents drop it and assistive technology cannot learn the state. The control works, and nobody using a screen reader is told how.`,
      fix: `Give the element a role that supports ${states.join(' and ')}, which for a form control is usually its own native role with no role attribute at all, or move the state to the element that carries the control's role. Do not add a role the host language forbids on this element to make the attribute legal.`,
    };
  },
};
