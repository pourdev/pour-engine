// WCAG SC 1.3.2 Meaningful Sequence (Level A) — the CSS-reordering slice
//
// Screen readers read the DOM in source order. When CSS `order` or a
// reversed flex direction arranges sibling content differently on screen,
// sighted users and screen reader users receive the page in two different
// sequences — C27's substance ("make the DOM order match the visual
// order"), with the divergence measurable. Whether that divergence
// CHANGES MEANING is the criterion's own test and a human call, so this
// reviews, never asserts.
//
// Same geometry and the same deliberate narrowness as 2.4.3's
// visual-order-divergence (same-container siblings only; `order` or
// `*-reverse` as the only accepted evidence; wrapped-one-level-deep and
// grid-native placement are disclosed gaps there and equally here), with
// two scope cuts of its own:
//   - at least two of the reordered siblings must carry rendered text:
//     a reversed row of purely decorative icons has no reading sequence
//     to preserve;
//   - groups where EVERY reordered sibling is tabbable are left to 2.4.3,
//     which already asks about that container from the focus side —
//     asking the same question twice about the same box helps nobody.
import { FLEXGRID, tabbable, visualSequence } from './2.4.3-visual-order-divergence.js';

export default {
  id: 'reading-order-divergence',
  name: 'Reading order vs visual order',
  impact: 'moderate',
  tags: ['wcag2a', 'wcag132'],
  help: 'CSS reordering should not make reading order diverge from the visual order',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/meaningful-sequence.html',
  selector: '*',
  evaluateAll(elements) {
    const outcomes = new Map();
    const groups = new Map();
    for (const element of elements) {
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
        .filter(({ style }) => style.position !== 'absolute' && style.position !== 'fixed')
        .map((entry) => ({ ...entry, rect: entry.element.getBoundingClientRect() }))
        .filter(({ rect }) => rect.width > 0 && rect.height > 0);
      if (entries.length < 2) continue;
      const usesOrder = entries.some(({ style }) => style.order !== '0');
      if (!reversed && !usesOrder) continue;
      const withText = entries.filter(({ element }) => (element.textContent || '').trim().length > 0);
      if (withText.length < 2) continue;
      if (entries.every(({ element }) => element.matches('a[href], button, input, select, textarea, summary, [tabindex]') && tabbable(element))) continue;
      const visual = visualSequence(entries, parentStyle.direction === 'rtl');
      const diverges = visual.some((entry, i) => entry !== entries[i]);
      if (!diverges) continue;
      const cause = reversed ? `flex-direction: ${parentStyle.flexDirection}` : 'CSS order';
      outcomes.set(entries[0].element, {
        status: 'incomplete',
        message: `A screen reader reads these ${entries.length} blocks in DOM order, but ${cause} arranges them differently on screen — sighted and screen reader users get two different sequences. Check the source order still tells the same story as the layout.`,
        fix: 'Reorder the source to match the visual order instead of reordering with CSS, or confirm the sequence difference does not change meaning here.',
      });
    }
    return elements.map((element) => outcomes.get(element) ?? { status: 'pass' });
  },
};
