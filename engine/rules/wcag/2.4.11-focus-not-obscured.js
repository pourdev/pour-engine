// WCAG SC 2.4.11 Focus Not Obscured (Minimum) (Level AA)
// When a focusable element's box lies ENTIRELY under an opaque fixed or
// sticky overlay at its resting position, focusing it shows the user
// nothing — the criterion's core case (bottom cookie bars covering footer
// links). Partial overlap passes 2.4.11 by definition ("not entirely
// hidden"), so only full containment is judged, and only for elements
// currently inside the viewport where the geometry is real.
const FOCUSABLE = 'a[href], button, input:not([type="hidden"]), select, textarea, summary, [tabindex]:not([tabindex="-1"])';

export default {
  id: 'focus-not-obscured',
  impact: 'serious',
  tags: ['wcag22aa', 'wcag2411'],
  help: 'Focused elements must not be fully hidden behind overlays',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html',
  selector: FOCUSABLE,
  visibility: 'visual',
  evaluateAll(elements) {
    const doc = elements[0]?.ownerDocument ?? document;
    const win = doc.defaultView;
    // While a modal (cookie-consent dialog etc.) is open, the page behind
    // it is INTENTIONALLY covered and focus is supposed to be trapped in
    // the modal — a snapshot in that state proves nothing about 2.4.11.
    // The backdrop is often a separate sibling of the dialog, so the modal
    // state is checked document-wide, not per overlay.
    const modal = [...doc.querySelectorAll('dialog[open], [role="dialog"], [role="alertdialog"], [aria-modal="true"]')]
      .some((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && getComputedStyle(el).visibility !== 'hidden';
      });
    if (modal) return elements.map(() => ({ status: 'pass' }));

    // Hit-test per IN-VIEWPORT focusable instead of style-scanning the
    // whole document for overlays: elementsFromPoint at the target's
    // centre surfaces whatever paints above it, and only the handful of
    // on-screen targets pay any cost — a 200k-node spec page costs the
    // same as a landing page. Per-overlay verdicts are memoized.
    const overlayVerdict = new Map();
    const isObscuringOverlay = (layer) => {
      if (overlayVerdict.has(layer)) return overlayVerdict.get(layer);
      let verdict = false;
      const style = getComputedStyle(layer);
      if (style.position === 'fixed' || style.position === 'sticky') {
        const bg = style.backgroundColor.match(/rgba?\(([^)]+)\)/)?.[1]?.split(',');
        const alpha = bg?.[3] === undefined ? 1 : parseFloat(bg[3]);
        const rect = layer.getBoundingClientRect();
        verdict = alpha >= 0.9 && rect.width >= 40 && rect.height >= 24;
      }
      overlayVerdict.set(layer, verdict);
      return verdict;
    };
    const covered = (rect, overlay) =>
      rect.left >= overlay.left && rect.right <= overlay.right
      && rect.top >= overlay.top && rect.bottom <= overlay.bottom;

    return elements.map((element) => {
      if (element.disabled) return { status: 'pass' };
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height) return { status: 'pass' };
      // Only in-viewport geometry is trustworthy (or cheap).
      if (rect.bottom < 0 || rect.right < 0 || rect.top > win.innerHeight || rect.left > win.innerWidth) {
        return { status: 'pass' };
      }
      const x = Math.min(Math.max(rect.left + rect.width / 2, 0), win.innerWidth - 1);
      const y = Math.min(Math.max(rect.top + rect.height / 2, 0), win.innerHeight - 1);
      const stack = doc.elementsFromPoint(x, y);
      const index = stack.indexOf(element);
      if (index <= 0) return { status: 'pass' }; // topmost, or not hit-testable
      const blocker = stack.slice(0, index).find((layer) =>
        !layer.contains(element) && !element.contains(layer)
        && isObscuringOverlay(layer) && covered(rect, layer.getBoundingClientRect()));
      if (!blocker) return { status: 'pass' };
      return {
        status: 'fail',
        message: 'This focusable element sits entirely behind an opaque fixed/sticky overlay — when keyboard focus lands on it, nothing visible changes and the user is lost.',
        fix: 'Add scroll-padding for the overlay height, or make the overlay dismissible/non-overlapping so focused elements stay at least partly visible.',
      };
    });
  },
};
