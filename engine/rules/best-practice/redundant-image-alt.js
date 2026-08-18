// The question this rule answers: does the image's text alternative
// duplicate text the control ALREADY announces beside it? Both halves of
// that must be measured in accname terms, not raw DOM text:
//  - The comparison text is the container's AT-exposed text (aria-hidden,
//    hidden, display:none and visibility:hidden subtrees never reach the
//    name — a display:none "Search" span does not make the alt redundant,
//    it makes the alt the button's ONLY name, and advising alt="" there
//    would delete it. Measured on a live banking home + Chromium AX tree.)
//  - The alternative is alt when present, else title: HTML-AAM's fallback
//    chain names an alt-less image from its title, so a card thumbnail
//    whose title repeats the headline doubles the link name just the same
//    (measured on a live news home where every card did exactly this).
const HIDDEN_TAGS = new Set(['script', 'style', 'noscript', 'template']);

/** The container's name-contributing text EXCLUDING image alternatives:
 *  mirrors the accname content walk's hidden-content rules. */
function exposedText(root) {
  let text = '';
  for (const node of root.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) { text += node.textContent; continue; }
    if (node.nodeType !== Node.ELEMENT_NODE) continue;
    const tag = node.tagName.toLowerCase();
    if (HIDDEN_TAGS.has(tag) || tag === 'img' || tag === 'area' || tag === 'svg') continue;
    if (node.getAttribute('aria-hidden') === 'true' || node.hasAttribute('hidden')) continue;
    const style = getComputedStyle(node);
    if (style.display === 'none' || style.visibility === 'hidden') continue;
    text += exposedText(node);
  }
  return text;
}

const norm = (s) => (s ?? '').replace(/\s+/g, ' ').trim().toLowerCase();

export default {
  id: 'redundant-image-alt',
  name: 'Redundant image alt',
  impact: 'minor',
  tags: ['best-practice'],
  help: 'Image alt should not repeat adjacent link or button text',
  helpUrl: 'https://www.w3.org/WAI/tutorials/images/functional/',
  selector: 'a[href] img[alt], button img[alt], a[href] img[title]:not([alt]), button img[title]:not([alt])',
  evaluate(element) {
    const alt = element.getAttribute('alt');
    const usesTitle = alt === null;
    const alternative = norm(usesTitle ? element.getAttribute('title') : alt);
    if (!alternative) return { status: 'pass' };
    const container = element.closest('a[href], button');
    const text = norm(exposedText(container));
    // No exposed text: the image's alternative is the control's only name.
    // Nothing is announced twice — and removing it would unname the control.
    if (!text) return { status: 'pass' };
    if (alternative !== text) return { status: 'pass' };
    const kind = container.tagName === 'A' ? 'link' : 'button';
    return {
      status: 'fail',
      message: usesTitle
        ? `The image title repeats the ${kind} text — the title names the image, so screen readers announce "${element.getAttribute('title')}" twice.`
        : `The image alt repeats the ${kind} text — screen readers announce "${element.getAttribute('alt')}" twice.`,
      fix: usesTitle
        ? 'Add alt="" to the image (and drop the title if it is not needed as a tooltip); the visible text already names the control.'
        : 'Use alt="" on the image; the visible text already names the control.',
    };
  },
};
