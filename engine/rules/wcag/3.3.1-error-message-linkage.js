// WCAG SC 3.3.1 Error Identification (Level A)
// "If an input error is automatically detected, the item that is in error
// is identified and the error is described to the user in text."
//
// A snapshot audit only ever sees this criterion in force when the page is
// captured mid-error — a pristine form has no detected error and nothing to
// judge. That makes the rule state-dependent and quiet by construction:
// aria-invalid="true" IS the page saying "an error was detected here", and
// from that admission two things become checkable.
//
//   - aria-errormessage must point at an element that exists, is visible,
//     and says something (ARIA 1.2 requires the target to be displayed and
//     pertinent while the field is invalid). A broken or empty target is a
//     real authoring defect — the reference AT follows leads nowhere — but
//     it is NOT a provable 3.3.1 failure: the Understanding document is
//     explicit that programmatic association is not required, so adjacent
//     visible text (which a machine cannot tie to the field) may satisfy
//     the criterion on its own. Both shapes therefore go to review, with
//     the broken reference named when present.
//
// aria-errormessage on a field that is NOT in an invalid state is inert:
// user agents expose it only while the field is invalid, so a dangling
// reference there breaks nothing a user receives (the engine's standing
// inertness doctrine says pass, not assert). Invalid means any aria-invalid
// value except false/undefined — "spelling" and "grammar" count.
export default {
  id: 'error-message-linkage',
  impact: 'serious',
  tags: ['wcag2a', 'wcag331'],
  help: 'Fields marked invalid need their error described in text',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html',
  selector: '[aria-invalid="true"], [aria-invalid="spelling"], [aria-invalid="grammar"], [aria-errormessage]',
  evaluate(element, { isVisible, accessibleName }) {
    const root = element.getRootNode();
    const state = element.getAttribute('aria-invalid');
    const invalid = !!state && state !== 'false' && state !== 'undefined';
    const targetsOf = (attribute) => (element.getAttribute(attribute) ?? '')
      .trim().split(/\s+/).filter(Boolean)
      .map((id) => root.getElementById?.(id))
      .filter(Boolean);
    // An image-of-text error message still describes the error; textContent
    // alone would miss it, so fall back to the accessible-name walk.
    const hasText = (targets) => targets.some((target) =>
      isVisible(target) && (target.textContent.trim() || accessibleName(target)));

    if (element.hasAttribute('aria-errormessage')) {
      if (!invalid) return { status: 'pass' }; // inert until the field is invalid
      const targets = targetsOf('aria-errormessage');
      if (hasText(targets)) return { status: 'pass' };
      return {
        status: 'incomplete',
        message: (targets.length
          ? 'This field is marked invalid, but the element its aria-errormessage points at is empty or hidden — screen readers follow the reference and find no text.'
          : 'This field is marked invalid, but its aria-errormessage points at nothing — screen readers follow the reference and find no text.')
          + ' The error must be described in text: check a visible message exists, and fix the reference so it reaches assistive technology too.',
        fix: 'Point aria-errormessage at the visible element containing the error text, and keep that element populated while the field is invalid.',
      };
    }
    // aria-invalid="true" with no aria-errormessage: a described-by message
    // satisfies the criterion; with no linkage at all, the error may still
    // sit in adjacent text only a human can connect to the field.
    if (hasText(targetsOf('aria-describedby'))) return { status: 'pass' };
    return {
      status: 'incomplete',
      message: 'This field is marked invalid, but no error text is programmatically linked to it. The error must be described to the user in text — check a message exists, and associate it with aria-describedby or aria-errormessage so screen readers announce it with the field.',
      fix: 'Add the error text near the field and reference it with aria-describedby (or aria-errormessage).',
    };
  },
};
