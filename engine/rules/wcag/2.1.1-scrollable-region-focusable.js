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
    return {
      status: 'fail',
      message: 'This region scrolls, but contains nothing focusable and isn’t focusable itself — keyboard users can never see the overflowed content.',
      fix: 'Add tabindex="0" to the scrollable element (plus role="region" and an aria-label describing it).',
    };
  },
};
