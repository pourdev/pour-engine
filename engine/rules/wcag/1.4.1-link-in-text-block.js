// WCAG SC 1.4.1 Use of Color (Level A)
import { parseColor, contrastRatio } from '../../lib/contrast.js';

export default {
  id: 'link-in-text-block',
  impact: 'serious',
  tags: ['wcag2a', 'wcag141'],
  help: 'Links inside text must be distinguishable by more than colour',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html',
  // Only running prose counts as a "text block". <li> is included because
  // footers and credits routinely write sentences as list items ("built by
  // the <a>team</a> with help from <a>contributors</a>"), and those links are
  // embedded in prose exactly as 1.4.1 means it. Pure link lists (navs,
  // blogrolls) are still excluded, but by the ownText guard below rather than
  // by tag: in <li><a>Home</a></li> the item has no text of its own.
  // <div> was measured too and added nothing on any test site, so it stays
  // out rather than widening the blast radius for no gain.
  selector: 'p a[href], dd a[href], blockquote a[href], td a[href], li a[href]',
  visibility: 'visual', // colour distinction is a purely visual concern
  evaluate(element, { ownText }) {
    const parent = element.closest('p, dd, blockquote, td, li');
    if (!element.textContent.trim() || !parent) return { status: 'pass' };
    // Needs real surrounding text to blend into (1.4.1 is about links
    // embedded in prose, not a link that IS the content).
    if (ownText(parent).replace(/\s+/g, '').length < 10) return { status: 'pass' };

    const style = getComputedStyle(element);
    if ((style.textDecorationLine ?? style.textDecoration ?? '').includes('underline')) return { status: 'pass' };
    // Underline substitutes count as non-colour cues too: border-bottom
    // "underlines", box-shadow underlines, and background chips/pills all
    // mark the link by shape, not colour alone.
    if (parseFloat(style.borderBottomWidth) > 0 && style.borderBottomStyle !== 'none') return { status: 'pass' };
    if (style.boxShadow && style.boxShadow !== 'none') return { status: 'pass' };
    const ownBackground = parseColor(style.backgroundColor);
    if (ownBackground && ownBackground.a > 0) return { status: 'pass' };
    if (style.backgroundImage !== 'none') return { status: 'pass' }; // gradient/image underline technique

    // A clear weight difference is a non-colour distinction too.
    const parentStyle = getComputedStyle(parent);
    const weight = (s) => parseInt(s.fontWeight, 10) || 400;
    if (Math.abs(weight(style) - weight(parentStyle)) >= 300) return { status: 'pass' };

    const linkColor = parseColor(style.color);
    const textColor = parseColor(parentStyle.color);
    if (!linkColor || !textColor) return { status: 'pass' };

    const ratio = contrastRatio(linkColor, textColor);
    // WCAG technique G183: 3:1 against the surrounding text is a sufficient
    // colour difference for identifying a link.
    if (ratio >= 3) return { status: 'pass' };

    // LAST, because it's the expensive check (tree walk + line geometry)
    // and only failing candidates should ever pay for it: a link occupying
    // its own line (<br>-separated address blocks, one-link-per-line
    // footers) has no surrounding words to blend into — nothing is
    // conveyed by colour.
    const rect = element.getBoundingClientRect();
    if (rect.height) {
      const mid = rect.top + rect.height / 2;
      const walker = element.ownerDocument.createTreeWalker(parent, NodeFilter.SHOW_TEXT);
      const range = element.ownerDocument.createRange();
      let sharesLine = false;
      for (let node = walker.nextNode(); node && !sharesLine; node = walker.nextNode()) {
        if (!node.textContent.trim() || element.contains(node)) continue;
        range.selectNodeContents(node);
        for (const r of range.getClientRects()) {
          if (r.top <= mid && r.bottom >= mid && r.width > 0) { sharesLine = true; break; }
        }
      }
      if (!sharesLine) return { status: 'pass' };
    }
    return {
      status: 'fail',
      message: ratio < 1.01
        ? 'This link has no underline and the same colour as the surrounding text — sighted users can’t tell it’s a link.'
        : `This link has no underline and only ${ratio.toFixed(2)}:1 colour difference from the surrounding text — colour-blind users can’t spot it.`,
      fix: 'Underline links inside text (text-decoration: underline), or add a non-colour indicator.',
    };
  },
};
