// WCAG SC 2.1.1 Keyboard (Level A) · SC 2.1.3 Keyboard (No Exception) (Level AAA)
//
// Matches EVERY element rather than a tag list: overflow makes a scroll
// container out of whatever it lands on — nav, header, footer, form, table
// wrappers, custom elements — and a tag list silently skipped all of them
// (found on carbondesignsystem.com: a scrollable <nav> the rule never saw).
// The cost stays flat because the overwhelming majority of elements exit on
// two integer reads before any style or visibility work happens.
const FOCUSABLE = 'a[href], button, input:not([type="hidden"]), select, textarea, summary, [tabindex]';

/** Reachable with the Tab key — what actually lets a keyboard user move
 *  focus into the region and scroll it. Focusable-but-not-tabbable content
 *  (tabindex="-1") does not help: measured in Chrome 151, a scroller whose
 *  content is all tabindex="-1" is treated by the browser itself as holding
 *  nothing reachable (it auto-focuses the scroller, same as when empty). */
function isTabbable(element) {
  if (element.tabIndex < 0 || element.disabled) return false;
  if (typeof element.checkVisibility === 'function') {
    return element.checkVisibility({ visibilityProperty: true });
  }
  return true;
}

/** Tabbable content in the FLAT tree: the node's own descendants, nodes
 *  slotted in from the light DOM, and content of open shadow roots. */
function hasTabbableContent(node) {
  for (const el of node.querySelectorAll?.(FOCUSABLE) ?? []) {
    if (isTabbable(el)) return true;
  }
  for (const slot of node.querySelectorAll?.('slot') ?? []) {
    for (const assigned of slot.assignedElements?.() ?? []) {
      if ((assigned.matches?.(FOCUSABLE) && isTabbable(assigned))) return true;
      for (const el of assigned.querySelectorAll?.(FOCUSABLE) ?? []) {
        if (isTabbable(el)) return true;
      }
    }
  }
  for (const el of node.querySelectorAll?.('*') ?? []) {
    if (el.shadowRoot && hasTabbableContent(el.shadowRoot)) return true;
  }
  return false;
}

export default {
  id: 'scrollable-region-focusable',
  impact: 'serious',
  tags: ['wcag2a', 'wcag211', 'wcag213'], // 2.1.3 is 2.1.1's AAA twin — same check satisfies both
  help: 'Scrollable regions must be reachable by keyboard',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html',
  selector: '*',
  // Visibility is checked inside, AFTER the cheap overflow gate: filtering
  // every element of the page up front would cost a style read per element;
  // gating first pays it only on the handful that actually overflow.
  visibleOnly: false,
  evaluate(element, { isVisible }) {
    // Cheap-first: two integer reads reject almost every element with no
    // style resolution at all. display:none subtrees have no layout, so
    // both deltas are 0 and they exit here too.
    const overflowsX = element.scrollWidth > element.clientWidth + 1;
    const overflowsY = element.scrollHeight > element.clientHeight + 1;
    if (!overflowsX && !overflowsY) return { status: 'pass' };
    // The document scroller belongs to the browser: arrow keys scroll the
    // page without any author-supplied focus stop. Overflow set on <body>
    // can also propagate to the viewport, which is the same UA-owned
    // scrollbar wearing different markup.
    if (element === element.ownerDocument.documentElement || element === element.ownerDocument.body) {
      return { status: 'pass' };
    }
    // A zero-extent box (a collapsed drawer at max-height: 0) presents no
    // scrollable region — nothing of it is on screen to scroll. Its open
    // state is a different audit state, judged when it is actually open.
    if (!element.clientWidth || !element.clientHeight) return { status: 'pass' };
    const style = getComputedStyle(element);
    // Judged PER AXIS: an overflow the user can't scroll on its own axis
    // (overflow-x: hidden marquees whose overflow-y merely computes to
    // auto) is not a scrollable region — content moves by animation, not
    // by user scrolling.
    const scrollableX = overflowsX && /(auto|scroll)/.test(style.overflowX);
    const scrollableY = overflowsY && /(auto|scroll)/.test(style.overflowY);
    if (!scrollableX && !scrollableY) return { status: 'pass' };
    if (!isVisible(element)) return { status: 'pass' };
    if (element.tabIndex >= 0) return { status: 'pass' };
    // Tabbable content inside lets keyboard users scroll by moving focus —
    // including content slotted in from the light DOM and content inside
    // open shadow roots (carousels built as web components).
    if (hasTabbableContent(element)) return { status: 'pass' };
    // An explicit negative tabindex is the author OPTING OUT of the tab
    // order, and the browser honours it: measured in Chrome 151, a scroller
    // with tabindex="-1" is skipped by Tab even though the same scroller
    // without the attribute would be auto-focused. Nothing inside is
    // tabbable either, so the overflowed content is unreachable by keyboard
    // in every engine — assertable, not browser-dependent.
    if (element.hasAttribute('tabindex')) {
      return {
        status: 'fail',
        message: 'This region scrolls, holds nothing tabbable, and its tabindex="-1" removes the region itself from the tab order — keyboard users cannot reach the overflowed content in any browser.',
        fix: 'Change tabindex="-1" to tabindex="0" (plus role="region" and an aria-label describing it), or make something inside it tabbable.',
      };
    }
    // NOT a failure, because the browser may already have solved it.
    //
    // Chromium puts a scroll container in the tab order by itself when the
    // container holds nothing tabbable — and that condition is exactly the
    // one this rule fires on, so in Chrome every element reaching this line
    // IS keyboard reachable. Measured, not assumed: Chrome 151 tabs
    // before → the scroller → after, while `element.tabIndex` still reports
    // -1, which is why the check above cannot see it.
    //
    // It is not settled across engines though. MDN still advises the
    // tabindex ("in some browsers, scrolling content areas are not
    // keyboard-focusable"), and WebKit did not take focus here. So the
    // honest report is the fact plus the split, not a verdict: asserting a
    // Level A failure would be wrong for anyone on Chrome, and asserting a
    // pass would be wrong for anyone who has to support the browsers that
    // don't.
    return {
      status: 'incomplete',
      message: 'This region scrolls and holds nothing tabbable, so reaching its overflowed content depends on the browser. Chromium gives such containers keyboard focus automatically; not every engine does. Tab to it in the browsers you support, and add tabindex="0" if it cannot be reached.',
      fix: 'If you support browsers that do not focus scroll containers, add tabindex="0" (plus role="region" and an aria-label describing it).',
    };
  },
};
