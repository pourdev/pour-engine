// WCAG SC 3.2.2 On Input (Level A) — plus the inline slice of 3.2.1 On Focus
// The classic jump menu: <select onchange="location.href=this.value">.
// Changing a setting must not change the user's context unless they were
// told beforehand (3.2.2), and merely receiving focus must never do so at
// all (3.2.1).
//
// Only INLINE handlers are visible to a DOM audit — addEventListener
// registrations can't be enumerated — and only a navigation-shaped handler
// body is evidence. That makes this a rare, legacy, high-precision
// signature: pages that never use inline handlers produce zero findings.
// Both branches ask rather than assert: the handler string proves a
// navigation call EXISTS in the code path, not that it runs unconditionally
// (it may sit behind a confirm(), a flag, or a selected-value check), and
// for 3.2.2 whether the user "has been advised beforehand" is text on the
// page only a human can weigh.
// Writes and calls only: reading location (analytics, hash checks) is not
// navigation, so the pattern demands an assignment to location or one of
// the navigating members/calls.
// The href branch demands an assignment too (2026-08-25 overnight audit):
// `location.href` READ as an argument (track(location.href, …)) matched the
// old pattern, so an analytics handler was reported as navigation. Now
// `location =`, `location.href =` (or `+=`) write, and assign / replace /
// reload must be called.
const NAVIGATES = /\blocation\s*(\+?=(?!=)|\.\s*(href\s*\+?=(?!=)|(assign|replace|reload)\s*\())|\.(submit|requestSubmit)\s*\(|window\.open\s*\(/;

export default {
  id: 'on-input-navigation',
  name: 'Unexpected context change',
  impact: 'serious',
  tags: ['wcag2a', 'wcag322', 'wcag321'],
  help: 'Changing or focusing a control must not unexpectedly change context',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/on-input.html',
  selector: 'select[onchange], input[onchange], textarea[onchange], select[oninput], input[oninput], textarea[oninput], [onfocus]',
  evaluate(element) {
    const onfocus = element.getAttribute('onfocus');
    if (onfocus && NAVIGATES.test(onfocus)) {
      return {
        status: 'incomplete',
        message: 'Focusing this element appears to navigate or submit (its onfocus handler reaches for location/submit). A change of context on focus alone fails WCAG 3.2.1 — check what the handler actually does when focus lands.',
        fix: 'Trigger navigation from activation (click/Enter), never from focus.',
      };
    }
    // Both change-shaped events are read on their own (2026-08-25 overnight
    // audit): a harmless onchange used to hide a submitting oninput, and F36
    // applies whichever event fires the submit.
    for (const attr of ['onchange', 'oninput']) {
      const handler = element.getAttribute(attr);
      if (handler && NAVIGATES.test(handler)) {
        return {
          status: 'incomplete',
          message: `Changing this control appears to navigate or submit (its ${attr} handler reaches for location/submit). WCAG 3.2.2 allows that only when users are told beforehand: check the page says so before the control.`,
          fix: 'Describe the behaviour before the control, or navigate from an explicit Go button instead of the change event.',
        };
      }
    }
    return { status: 'pass' };
  },
};
