// WCAG SC 4.1.2 Name, Role, Value (Level A)
import { cumulativeOpacity } from '../../lib/contrast.js';

const FOCUSABLE = 'a[href], area[href], button, input, select, textarea, summary, iframe, '
  + 'audio[controls], video[controls], [contenteditable]:not([contenteditable="false"]), [tabindex]';

export default {
  id: 'aria-hidden-focus',
  name: 'Focusable hidden content',
  impact: 'serious',
  tags: ['wcag2a', 'wcag412'],
  help: 'Nothing focusable may sit inside aria-hidden="true"',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html',
  selector: '[aria-hidden="true"]',
  visibleOnly: false, // these elements are hidden from AT by definition
  evaluate(element, { isRendered }) {
    // Only elements that are actually rendered can receive focus — an
    // aria-hidden menu that is ALSO display:none is fine until it opens.
    // Fully transparent controls are excluded too: nothing is SEEN when
    // focus lands there, so the harm this rule describes (sighted keyboard
    // users interacting with SR-invisible content) doesn't materialise —
    // an invisible tab stop is a focus-order/visible-focus concern instead.
    // Transparency is measured up the flat tree: opacity is not an inherited
    // property, so a faded WRAPPER (the standard off-canvas drawer) leaves
    // every control inside it computing opacity: 1 while none of them paint.
    const focusable = [element, ...element.querySelectorAll(FOCUSABLE)].filter(
      (el) => el.matches?.(FOCUSABLE) && el.getAttribute('tabindex') !== '-1' && !el.matches(':disabled')
        // `inert` removes focusability outright — aria-hidden + inert is
        // the CORRECT modern pattern for off-canvas content, not a defect.
        && !el.closest('[inert]')
        && isRendered(el) && cumulativeOpacity(el) > 0,
    );
    if (!focusable.length) return { status: 'pass' };
    // While a modal dialog is open, the page behind it is DELIBERATELY
    // aria-hidden and its focusability is script-managed (focus traps).
    // A static snapshot can't tell a correct trap from a broken one —
    // that's a human check, not an assertable failure.
    const doc = element.ownerDocument;
    let modal = null;
    try { modal = doc.querySelector('dialog:modal'); } catch { /* older engine */ }
    modal ??= [...doc.querySelectorAll('[aria-modal="true"]')].find(isRendered) ?? null;
    if (modal && !element.contains(modal) && !modal.contains(element)) {
      return {
        status: 'incomplete',
        message: `This aria-hidden element contains ${focusable.length} focusable element(s) while a modal dialog is open — fine if the modal traps keyboard focus, a failure if Tab can reach them. Check the trap by keyboard.`,
      };
    }
    return {
      status: 'fail',
      message: `This aria-hidden element contains ${focusable.length} focusable element(s) — keyboard users can Tab into content that screen readers cannot see.`,
      fix: 'Add tabindex="-1" (or disabled) to focusable elements inside aria-hidden regions, or remove aria-hidden.',
    };
  },
};
