// WCAG SC 4.1.2 Name, Role, Value (Level A)
// Deliberately excludes bare [tabindex]: a focusable container (e.g. a
// scrollable region with tabindex="0") holding links is correct markup.
const INTERACTIVE =
  'a[href], button, input, select, textarea, summary, audio[controls], video[controls], ' +
  '[role="button"], [role="link"], [role="checkbox"], [role="radio"], [role="switch"], ' +
  '[role="menuitem"], [role="tab"], [role="option"]';

export default {
  id: 'nested-interactive',
  impact: 'serious',
  tags: ['wcag2a', 'wcag412'],
  help: 'A control must not contain another control',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html',
  selector: INTERACTIVE,
  evaluate(element, { isRendered }) {
    // Only descendants a user can actually reach count: hidden inputs,
    // disabled controls, display:none templates, and tabindex="-1" nodes
    // inside a control are inert markup, not competing tab stops.
    const nested = [...element.querySelectorAll(INTERACTIVE)].find((el) =>
      !el.matches(':disabled') && el.getAttribute('tabindex') !== '-1'
      && !(el.tagName === 'INPUT' && el.type === 'hidden') && isRendered(el));
    if (!nested) return { status: 'pass' };
    return {
      status: 'fail',
      message: `This ${element.tagName.toLowerCase()} contains another interactive element (<${nested.tagName.toLowerCase()}>) — focus order and announcements become unpredictable.`,
      fix: 'Restructure so interactive elements are siblings, not ancestors of each other.',
    };
  },
};
