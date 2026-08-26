// WCAG SC 4.1.2 Name, Role, Value (Level A)
// aria-activedescendant and aria-owns matter most: a dangling
// activedescendant breaks composite-widget focus reporting entirely.
const REF_ATTRIBUTES = [
  'aria-labelledby', 'aria-describedby', 'aria-controls',
  'aria-activedescendant', 'aria-owns', 'aria-errormessage', 'aria-details',
];

// No hover/focus probe (removed 2026-08-26, David). From 1.2.81 to this
// change the rule dispatched hover and focus events at elements whose
// aria-describedby pointed nowhere, to catch tooltip libraries that create
// the target on demand. That mutated the page under audit: focus was taken
// and not given back, hover-driven menus opened, page scripts ran, mobile
// keyboards popped, and 300 ms went by per element. Once a dead describedby
// became a review rather than a fail (same morning) the probe only bought
// fewer review rows, which is not worth an audit that is no longer
// read-only. The deferred-tooltip pattern is now named in the review
// message instead, for the human to confirm.

function inspect(element) {
  // ARIA id references cannot cross shadow boundaries: they resolve only
  // within the element's own root (document or shadow tree).
  const root = element.getRootNode();
  // Collapsed-disclosure pattern: a trigger with aria-expanded="false"
  // whose aria-controls panel doesn't exist YET (rendered on expand) is
  // ubiquitous and harmless while collapsed — name computation doesn't
  // touch aria-controls, so nothing resolves wrongly today.
  const collapsed = element.getAttribute('aria-expanded') === 'false';
  const missing = [];
  const ambiguous = [];
  for (const attr of REF_ATTRIBUTES) {
    for (const id of (element.getAttribute(attr) ?? '').split(/\s+/).filter(Boolean)) {
      if (!root.getElementById?.(id)) {
        if (attr === 'aria-controls' && collapsed) continue;
        missing.push({ attr, id });
        continue;
      }
      const count = root.querySelectorAll(`[id="${CSS.escape(id)}"]`).length;
      if (count > 1) {
        ambiguous.push(`${attr}="${id}" — ${count} elements share this id; the reference binds to the FIRST one in the DOM`);
      }
    }
  }
  return { missing, ambiguous };
}

function outcome({ missing, ambiguous }, element, accessibleName) {
  if (missing.length) {
    // A dangling ref is skipped by the accname computation, so the HARM
    // depends on what remains, and 4.1.2 only cares about name, role and
    // user-settable value (re-decided by David 2026-08-26 with axe-core's
    // measured verdicts as the second opinion; the old "fragile,
    // validator-flagged" argument was 4.1.1's, and 2.2 retired it):
    //   - aria-labelledby that dangles while the element still names
    //     itself from elsewhere: the name is fully determinable (accname
    //     step 2B processes the valid IDREFs), so it is not a finding here;
    //   - aria-labelledby that leaves the element nameless, and
    //     aria-activedescendant (a focused composite reports the wrong
    //     active item): the 4.1.2 failure proper, asserted;
    //   - aria-describedby that points nowhere at rest: a description is
    //     not name, role or a user-set value, and tooltip libraries create
    //     the target on hover or focus, so the DOM proves an authoring
    //     error at most. Asked, never asserted;
    //   - aria-controls, aria-owns, aria-details, aria-errormessage: the
    //     standing policy (asserted; the comparator asserts these too).
    const restingName = (accessibleName?.(element) ?? '').trim();
    const relevant = missing.filter(({ attr }) => !(attr === 'aria-labelledby' && restingName));
    if (!relevant.length) return { status: 'pass' };
    const line = ({ attr, id }) => attr === 'aria-labelledby'
      ? `aria-labelledby="${id}" points to nothing and leaves this element without an accessible name`
      : `${attr}="${id}" points to nothing — assistive technology silently ignores it`;
    const asserted = relevant.filter(({ attr }) => attr !== 'aria-describedby');
    if (asserted.length) {
      return {
        status: 'fail',
        message: `Broken ARIA references: ${relevant.map(line).join('; ')}.`,
        fix: 'Correct or remove the reference, or give the target element that id.',
      };
    }
    return {
      status: 'incomplete',
      message: `${relevant.map(line).join('; ')} at rest. The element keeps its name and role, so this is not a proven 4.1.2 failure: if the description is created when the element is hovered or focused (a tooltip library), this works; otherwise correct the reference.`,
      fix: 'Correct or remove the reference, or give the target element that id.',
    };
  }
  if (ambiguous.length) {
    // Duplicate ids resolve deterministically to the first copy — often
    // the right one (desktop/mobile double-renders). Real, but a human
    // must judge whether the first copy is the wrong copy.
    return {
      status: 'incomplete',
      message: `Ambiguous ARIA references: ${ambiguous.join('; ')}. If the first copy in the DOM is the intended target, this works today — but it's fragile.`,
    };
  }
  return { status: 'pass' };
}

export default {
  id: 'aria-valid-refs',
  name: 'ARIA id references',
  // Moderate, not critical: with 4.1.1 Parsing retired in WCAG 2.2 these
  // are 4.1.2 name/state defects, and aria-controls in particular has weak
  // assistive-technology support — real, but rarely blocking.
  impact: 'moderate',
  tags: ['wcag2a', 'wcag412'],
  help: 'ARIA id references must point to elements that exist',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html',
  selector: REF_ATTRIBUTES.map((attr) => `[${attr}]`).join(', '),
  evaluate(element, { accessibleName } = {}) {
    return outcome(inspect(element), element, accessibleName);
  },
};
