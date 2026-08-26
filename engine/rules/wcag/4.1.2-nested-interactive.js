// WCAG SC 4.1.2 Name, Role, Value (Level A)
// Deliberately excludes bare [tabindex]: a focusable container (e.g. a
// scrollable region with tabindex="0") holding links is correct markup.
const INTERACTIVE =
  'a[href], button, input, select, textarea, summary, audio[controls], video[controls], ' +
  '[role="button"], [role="link"], [role="checkbox"], [role="radio"], [role="switch"], ' +
  '[role="menuitem"], [role="tab"], [role="option"]';

export default {
  id: 'nested-interactive',
  name: 'Nested controls',
  impact: 'serious',
  tags: ['wcag2a', 'wcag412'],
  help: 'A control must not contain another control',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html',
  selector: INTERACTIVE,
  evaluate(element, { isRendered }) {
    // Only descendants a user can actually reach count: hidden inputs,
    // disabled controls, display:none templates, and tabindex="-1" nodes
    // inside a control are inert markup, not competing tab stops.
    // Two more shapes are unreachable by the same principle: aria-hidden
    // content (AT ignores it wholesale — a decorative svg role="button"
    // aria-hidden="true" inside a play button competes with nothing; if it
    // is natively focusable that is aria-hidden-focus's finding, not a
    // second one here), and role-only widgets never given a tabindex (a
    // role="button" with no tabindex is not in the tab order — keyboard
    // users cannot reach it, so it cannot be a competing stop).
    const NATIVE = 'a[href], button, input, select, textarea, summary, audio[controls], video[controls]';
    // Any negative tabindex is unreachable by Tab (HTML: "a negative
    // integer"), not only the literal "-1"; hasAttribute guards the default
    // -1 Chromium reports for attribute-less contenteditable elements.
    // 2026-08-25 overnight audit.
    const nested = [...element.querySelectorAll(INTERACTIVE)].find((el) =>
      !el.matches(':disabled') && !(el.hasAttribute('tabindex') && el.tabIndex < 0)
      && !(el.tagName === 'INPUT' && el.type === 'hidden') && isRendered(el)
      && !el.closest('[aria-hidden="true"]')
      && (el.matches(NATIVE) || el.hasAttribute('tabindex')));
    if (!nested) return { status: 'pass' };
    // <summary> is the one outer control HTML does not forbid this on: its
    // content model is phrasing content with no "no interactive content
    // descendant" clause (a and button both carry one), it maps to no ARIA
    // role that is Children Presentational, and browsers keep a link inside
    // it as a link. Both controls have their name and role, so nothing is
    // announced wrongly; whether Enter on the link versus the disclosure
    // confuses is a question for a person. 2026-08-25 overnight audit.
    if (element.tagName === 'SUMMARY') {
      return {
        status: 'incomplete',
        message: `This summary contains another interactive element (<${nested.tagName.toLowerCase()}>). HTML allows it and both controls keep their name and role, but the disclosure and the control inside it are separate keyboard stops in one label. Check that activating each does what a user expects.`,
      };
    }
    return {
      status: 'fail',
      message: `This ${element.tagName.toLowerCase()} contains another interactive element (<${nested.tagName.toLowerCase()}>) — focus order and announcements become unpredictable.`,
      fix: 'Restructure so interactive elements are siblings, not ancestors of each other.',
    };
  },
};
