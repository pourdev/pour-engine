// WCAG SC 2.4.11 Focus Not Obscured (Minimum) (Level AA)
// An opaque fixed/sticky overlay covering a focusable element is the
// criterion's core case (bottom cookie bars over footer links). Partial
// overlap passes by definition ("not entirely hidden"), so only full
// containment counts.
//
// This REVIEWS rather than fails, deliberately. What a snapshot can see is
// "element X is under the panel right now", and that is a fact about the
// current scroll position, not about the page: scrolling the same page a few
// hundred pixels names entirely different elements, or none at all. The
// criterion asks about the state focus ARRIVES in, which depends on tab order,
// on whether the browser scrolls (it won't, for an element already inside the
// viewport — merely covered), and on any author focus handler that moves the
// page. None of that is knowable from geometry alone, so the honest output is
// a pointer to the overlay and a request for a keyboard pass.
//
// Sites that apply the spec's own sufficient technique — scroll-padding for
// the overlay's edge — are not flagged at all.
const FOCUSABLE = 'a[href], button, input:not([type="hidden"]), select, textarea, summary, [tabindex]:not([tabindex="-1"])';

/** Does the scroll container reserve room for an overlay on this edge?
 *  scroll-padding is what the Understanding doc cites as sufficient: it keeps
 *  the browser's own scroll-into-view clear of a sticky panel. */
function edgeReserved(doc, edge, needed) {
  const scroller = doc.scrollingElement ?? doc.documentElement;
  const style = getComputedStyle(scroller);
  const value = edge === 'top' ? style.scrollPaddingTop : style.scrollPaddingBottom;
  const px = value && value.endsWith('px') ? parseFloat(value) : 0;
  return px >= needed - 1;
}

export default {
  id: 'focus-not-obscured',
  name: 'Unobscured focus',
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
      // `:disabled` catches controls disabled by an ancestor fieldset, which
      // the `disabled` property does not reflect — those never take focus.
      if (element.matches(':disabled')) return { status: 'pass' };
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
      // Which viewport edge is the panel pinned to? That is the edge the
      // browser's scroll-into-view has to clear.
      const panel = blocker.getBoundingClientRect();
      const edge = panel.top <= 1 && panel.bottom < win.innerHeight ? 'top'
        : panel.bottom >= win.innerHeight - 1 ? 'bottom' : null;
      if (edge && edgeReserved(doc, edge, panel.height)) return { status: 'pass' };
      return {
        status: 'incomplete',
        message: 'This element is currently underneath an opaque fixed panel. Whether that breaks 2.4.11 depends on where the page sits when focus reaches it — the browser does not scroll an element that is already in the viewport, merely covered, so focus can land invisibly. Tab through the page and check the focus indicator is never entirely hidden.',
        fix: `Reserve room for the panel with scroll-padding-${edge ?? 'bottom'} on the scrolling container, or move focus clear of it when the panel is up.`,
      };
    });
  },
};
