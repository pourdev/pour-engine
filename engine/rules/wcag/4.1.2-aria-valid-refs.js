// WCAG SC 4.1.2 Name, Role, Value (Level A)
// aria-activedescendant and aria-owns matter most: a dangling
// activedescendant breaks composite-widget focus reporting entirely.
const REF_ATTRIBUTES = [
  'aria-labelledby', 'aria-describedby', 'aria-controls',
  'aria-activedescendant', 'aria-owns', 'aria-errormessage', 'aria-details',
];

export default {
  id: 'aria-valid-refs',
  // Moderate, not critical: with 4.1.1 Parsing retired in WCAG 2.2 these
  // are 4.1.2 name/state defects, and aria-controls in particular has weak
  // assistive-technology support — real, but rarely blocking.
  impact: 'moderate',
  tags: ['wcag2a', 'wcag412'],
  help: 'ARIA id references must point to elements that exist',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html',
  selector: REF_ATTRIBUTES.map((attr) => `[${attr}]`).join(', '),
  evaluate(element) {
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
          missing.push(`${attr}="${id}" points to nothing — assistive technology silently ignores it`);
          continue;
        }
        const count = root.querySelectorAll(`[id="${CSS.escape(id)}"]`).length;
        if (count > 1) {
          ambiguous.push(`${attr}="${id}" — ${count} elements share this id; the reference binds to the FIRST one in the DOM`);
        }
      }
    }
    if (missing.length) {
      return {
        status: 'fail',
        message: `Broken ARIA references: ${missing.join('; ')}.`,
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
  },
};
