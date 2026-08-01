// WCAG SC 1.4.10 Reflow (Level AA)
// The full test renders at 320 CSS px; an audit runs at whatever viewport
// the page is in. What IS knowable here: content that already forces
// two-dimensional scrolling at the current width will only be worse at
// 320px. Abstain-over-assert: this flags, it never fails — tables, maps,
// and images are exempt content the geometry can't distinguish.
export default {
  id: 'reflow',
  impact: 'moderate',
  tags: ['wcag21aa', 'wcag1410'],
  help: 'Content should reflow to one-dimensional scrolling',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/reflow.html',
  selector: 'html',
  visibleOnly: false,
  evaluate(element) {
    const doc = element.ownerDocument;
    const scroller = doc.scrollingElement ?? doc.documentElement;
    const overflow = scroller.scrollWidth - scroller.clientWidth;
    if (overflow <= 1) return { status: 'pass' };
    return {
      status: 'incomplete',
      message: `The page already scrolls horizontally by ${Math.round(overflow)}px at the current viewport — at the 320px reflow breakpoint it will be worse. Verify content reflows at 320 CSS px width (data tables, maps and images are exempt).`,
    };
  },
};
