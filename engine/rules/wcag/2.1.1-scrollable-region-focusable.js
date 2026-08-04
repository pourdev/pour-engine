// WCAG SC 2.1.1 Keyboard (Level A) · SC 2.1.3 Keyboard (No Exception) (Level AAA)
const FOCUSABLE = 'a[href], button, input:not([type="hidden"]), select, textarea, summary, [tabindex]';

/** Focusable content in the FLAT tree: the node's own descendants, nodes
 *  slotted in from the light DOM, and content of open shadow roots. */
function hasFocusableContent(node) {
  if (node.querySelector?.(FOCUSABLE)) return true;
  for (const slot of node.querySelectorAll?.('slot') ?? []) {
    for (const assigned of slot.assignedElements?.() ?? []) {
      if (assigned.matches?.(FOCUSABLE) || assigned.querySelector?.(FOCUSABLE)) return true;
    }
  }
  for (const el of node.querySelectorAll?.('*') ?? []) {
    if (el.shadowRoot && hasFocusableContent(el.shadowRoot)) return true;
  }
  return false;
}

export default {
  id: 'scrollable-region-focusable',
  impact: 'serious',
  tags: ['wcag2a', 'wcag211', 'wcag213'], // 2.1.3 is 2.1.1's AAA twin — same check satisfies both
  help: 'Scrollable regions must be reachable by keyboard',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html',
  selector: 'div, section, article, main, aside, ul, ol, dl, pre, output, figure',
  evaluate(element) {
    const style = getComputedStyle(element);
    // Judged PER AXIS: an overflow the user can't scroll on its own axis
    // (overflow-x: hidden marquees whose overflow-y merely computes to
    // auto) is not a scrollable region — content moves by animation, not
    // by user scrolling.
    const scrollableX = /(auto|scroll)/.test(style.overflowX)
      && element.scrollWidth > element.clientWidth + 1;
    const scrollableY = /(auto|scroll)/.test(style.overflowY)
      && element.scrollHeight > element.clientHeight + 1;
    if (!scrollableX && !scrollableY) return { status: 'pass' };
    if (element.tabIndex >= 0) return { status: 'pass' };
    // Focusable content inside lets keyboard users scroll by moving focus —
    // including content slotted in from the light DOM and content inside
    // open shadow roots (carousels built as web components).
    if (hasFocusableContent(element)) return { status: 'pass' };
    // NOT a failure, because the browser may already have solved it.
    //
    // Chromium puts a scroll container in the tab order by itself when the
    // container holds nothing focusable — and that condition is exactly the
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
      message: 'This region scrolls and holds nothing focusable, so reaching its overflowed content depends on the browser. Chromium gives such containers keyboard focus automatically; not every engine does. Tab to it in the browsers you support, and add tabindex="0" if it cannot be reached.',
      fix: 'If you support browsers that do not focus scroll containers, add tabindex="0" (plus role="region" and an aria-label describing it).',
    };
  },
};
