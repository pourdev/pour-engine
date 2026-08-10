// WCAG SC 2.4.3 Focus Order (Level A) — the CSS-reordering slice
// Whether a focus order "preserves meaning and operability" is a human
// judgment over the whole page, and stays in the manual checklist. But one
// documented failure shape is pure geometry: focusable siblings laid out by
// flex/grid where CSS `order` or a reversed flow direction makes the VISUAL
// order diverge from the DOM order that Tab actually follows. F44's
// substance — sequences that jump against the layout — with the evidence
// measurable.
//
// Deliberately narrow so it cannot fire on ordinary pages:
//   - only siblings in the SAME flex/grid container are compared, so
//     legitimate responsive reflow between separate regions never trips it;
//   - only when the container/children actually use `order` or `*-reverse`
//     — plain wrapping, floats and absolute positioning are not evidence;
//   - the verdict is review, not violation: a reversed row of equivalent
//     chips may preserve meaning perfectly well; that call is the human's.
//
// The narrowness has a known cost, accepted deliberately: focusables
// wrapped one level deep (cards — flex container > div > a) never meet the
// container as direct siblings and are not examined, and grid's native
// reordering (explicit grid-row/column placement, grid-template-areas,
// grid-auto-flow: dense) reorders without `order` or `*-reverse` and is not
// treated as evidence. Both are honest gaps to widen later with measured
// cases, not silently.
const FLEXGRID = /^(inline-)?(flex|grid)$/;

/** DOM-order focusable children grouped per flex/grid parent. */
function tabbable(element) {
  if (element.disabled || element.tabIndex < 0) return false;
  return true;
}

/** Visual reading order of sibling rects: group into rows by vertical
 *  overlap, rows top-to-bottom, within a row along the inline direction. */
function visualSequence(entries, rightToLeft) {
  const rows = [];
  for (const entry of [...entries].sort((a, b) => a.rect.top - b.rect.top)) {
    const row = rows.find((candidates) => {
      const first = candidates[0].rect;
      const overlap = Math.min(first.bottom, entry.rect.bottom) - Math.max(first.top, entry.rect.top);
      return overlap > Math.min(first.height, entry.rect.height) / 2;
    });
    if (row) row.push(entry); else rows.push([entry]);
  }
  return rows.flatMap((row) => row.sort((a, b) =>
    rightToLeft ? b.rect.right - a.rect.right : a.rect.left - b.rect.left));
}

export default {
  id: 'visual-order-divergence',
  impact: 'moderate',
  tags: ['wcag2a', 'wcag243'],
  help: 'CSS reordering should not make Tab jump against the visual order',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html',
  selector: 'a[href], button, input:not([type="hidden"]), select, textarea, summary, [tabindex]',
  evaluateAll(elements) {
    const outcomes = new Map();
    const groups = new Map();
    for (const element of elements) {
      if (!tabbable(element)) continue;
      const parent = element.parentElement;
      if (!parent) continue;
      if (!groups.has(parent)) groups.set(parent, []);
      groups.get(parent).push(element);
    }
    for (const [parent, children] of groups) {
      if (children.length < 2) continue;
      const parentStyle = getComputedStyle(parent);
      if (!FLEXGRID.test(parentStyle.display)) continue;
      const reversed = /-reverse$/.test(parentStyle.flexDirection);
      const entries = children
        .map((element) => ({ element, style: getComputedStyle(element) }))
        // Out-of-flow children have no place in the container's sequence.
        .filter(({ style }) => style.position !== 'absolute' && style.position !== 'fixed')
        .map((entry) => ({ ...entry, rect: entry.element.getBoundingClientRect() }))
        .filter(({ rect }) => rect.width > 0 && rect.height > 0);
      if (entries.length < 2) continue;
      const usesOrder = entries.some(({ style }) => style.order !== '0');
      if (!reversed && !usesOrder) continue;
      const visual = visualSequence(entries, parentStyle.direction === 'rtl');
      const diverges = visual.some((entry, i) => entry !== entries[i]);
      if (!diverges) continue;
      const cause = reversed ? `flex-direction: ${parentStyle.flexDirection}` : 'CSS order';
      outcomes.set(entries[0].element, {
        status: 'incomplete',
        message: `Keyboard focus moves through these ${entries.length} controls in DOM order, but ${cause} arranges them differently on screen — Tab will jump against the visual layout. Check the focus sequence still preserves meaning and operability.`,
        fix: 'Reorder the source to match the visual order instead of reordering with CSS, or confirm the divergence is harmless here.',
      });
    }
    return elements.map((element) => outcomes.get(element) ?? { status: 'pass' });
  },
};
