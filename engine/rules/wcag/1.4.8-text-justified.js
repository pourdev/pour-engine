// WCAG SC 1.4.8 Visual Presentation (Level AAA) — the justified-text slice
//
// 1.4.8 lists five things a reader must be able to achieve for blocks of
// text; the third is "text is not justified (aligned to both the left and
// the right margins)". Justified text is the one of the five that the page
// itself imposes and that shows in a computed style; F88 ("using text that
// is justified") is its failure technique. The criterion is met when a
// mechanism lets the reader undo it, and the Understanding says the
// browser may provide that mechanism, so a justified block is asked about,
// not failed: the DOM cannot show whether a style switcher or a reader
// mode is on offer. The other four requirements (colour selection, 80
// character measure, line spacing, 200% resize) are met by browser
// mechanisms on ordinary pages and are not judged here.
//
// Only blocks with real running text count: the block's own text and the
// text of its inline children, at least 120 characters, so a justified
// wrapper is reported once at the paragraph that carries the words, not at
// every ancestor that inherits the alignment.
const BLOCK = /^(?:block|list-item|table-cell|flow-root)$/;

function inlineText(element) {
  let text = '';
  for (const node of element.childNodes) {
    if (node.nodeType === 3) text += node.textContent;
    else if (node.nodeType === 1 && getComputedStyle(node).display.startsWith('inline')) text += node.textContent;
  }
  return text.replace(/\s+/g, ' ').trim();
}

export default {
  id: 'text-justified',
  name: 'Justified text',
  impact: 'moderate',
  tags: ['wcag2aaa', 'wcag148'],
  help: 'Blocks of text should not be justified to both margins (AAA)',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/visual-presentation.html',
  selector: 'p, li, dd, dt, td, th, blockquote, figcaption, summary, address, div, section, article, main, aside, header, footer',
  evaluate(element) {
    const style = getComputedStyle(element);
    if (style.textAlign !== 'justify' && style.textAlign !== 'justify-all') return { status: 'pass' };
    if (!BLOCK.test(style.display)) return { status: 'pass' };
    if (inlineText(element).length < 120) return { status: 'pass' };
    return {
      status: 'incomplete',
      message: 'This block of text is justified to both margins. The uneven spaces between words form "rivers of white" down the page that some readers with dyslexia or low vision cannot read across (failure F88). 1.4.8 allows justified text only where a mechanism lets the reader switch it off; check that one exists, in the page or the browser.',
      fix: 'Set text-align: start (or left) on running text, or offer a control that turns justification off.',
    };
  },
};
