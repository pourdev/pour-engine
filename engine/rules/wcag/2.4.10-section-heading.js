// WCAG SC 2.4.10 Section Headings (Level AAA)
// "Section headings are used to organize the content." The Understanding
// defines a section as a self-contained portion of written content, says
// the criterion covers sections within writing rather than UI components,
// and gives H69 (a heading element at the beginning of each section) as
// the technique. Where a page's sections begin is a judgement about the
// writing, except in one case the author has made for us: an HTML
// <section> element is a declared section. A declared section that holds
// running text and starts with no heading is the honest candidate; whether
// it is really a section of writing or a layout wrapper stays the
// reader's call, so this asks and never asserts.
//
// A section has its heading when one of its own sits anywhere inside it
// (a nested section's or article's heading is that element's), when it
// BEGINS with one however the markup nests it (inside a header, a div or a
// nested article), or when the element immediately before it is that
// heading or ends with it: the blog pattern of an article's title followed by a
// section holding the post body (measured on the corpus: 292 such bodies
// on one feed page, none of them a missing heading). A section named by
// aria-labelledby or aria-label has a title by another route and is left
// alone. Sections with little text, or none, are the UI-component case the
// criterion excludes.
const HEADING = 'h1, h2, h3, h4, h5, h6, [role="heading"]';
const SUBSTANTIVE = 'img, svg, video, audio, canvas, iframe, input, select, textarea, button';
const SKIP = 'script, style, template, noscript';

/** The first (or, reversed, the last) substantive thing inside an element,
 *  in document order: a heading, or text or media that is not one. */
function edgeIsHeading(element, fromEnd) {
  const children = (node) => (fromEnd ? [...node.childNodes].reverse() : [...node.childNodes]);
  const stack = children(element).reverse();
  while (stack.length) {
    const node = stack.pop();
    if (node.nodeType === 3) { if (node.textContent.trim()) return false; continue; }
    if (node.nodeType !== 1) continue;
    if (node.matches(HEADING)) return true;
    if (node.matches(SKIP)) continue;
    if (node.matches(SUBSTANTIVE)) return false;
    for (const child of children(node).reverse()) stack.push(child);
  }
  return false;
}

export default {
  id: 'section-heading',
  name: 'Section headings',
  impact: 'moderate',
  tags: ['wcag2aaa', 'wcag2410'],
  help: 'Sections of written content should begin with a heading (AAA)',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/section-headings.html',
  selector: 'section',
  evaluate(element) {
    if (element.hasAttribute('aria-label') || element.hasAttribute('aria-labelledby')) return { status: 'pass' };
    const role = element.getAttribute('role');
    if (role && role !== 'region') return { status: 'pass' };
    // Any heading of the section's own (not a nested section's or article's)
    // organises it, wherever it sits; a section that BEGINS with a heading,
    // however nested, is headed too.
    const ownHeading = [...element.querySelectorAll(HEADING)]
      .some((heading) => heading.closest('section, article') === element);
    if (ownHeading || edgeIsHeading(element, false)) return { status: 'pass' };
    const before = element.previousElementSibling;
    if (before && (before.matches(HEADING) || (before.matches('header, hgroup') && before.querySelector(HEADING)) || edgeIsHeading(before, true))) {
      return { status: 'pass' };
    }
    // A feed of untitled notes: the section is the body of an article with
    // no heading of its own, in a run of at least three such items. Whether
    // the notes of a feed need headings is one question about the feed, for
    // the reviewer to ask once; asking it per item put 292 findings on one
    // corpus page and helped nobody.
    const item = element.closest('article');
    if (item && item.parentElement && !item.querySelector(HEADING)) {
      const items = (node) => [...node.children].filter((child) => child.matches('article') || child.querySelector(':scope > article')).length;
      const container = item.parentElement;
      if (items(container) >= 3 || (container.parentElement && items(container.parentElement) >= 3)) return { status: 'pass' };
    }
    const text = (element.textContent ?? '').replace(/\s+/g, ' ').trim();
    const paragraphs = element.querySelectorAll('p').length;
    if (text.length < 200 && paragraphs < 2) return { status: 'pass' };
    return {
      status: 'incomplete',
      message: 'This section holds written content but begins with no heading of its own, so readers scanning by headings cannot find or skip it. 2.4.10 asks for a heading at the start of each section of writing; check whether this is a section of content that needs one, or a purely structural wrapper.',
      fix: 'Start the section with a heading that names its topic, at the level below its parent heading, or name it with aria-labelledby pointing at its visible title.',
    };
  },
};
