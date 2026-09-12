// WCAG SC 2.4.6 Headings and Labels (Level AA)
// "Headings and labels describe topic or purpose." The criterion does not
// require a heading or label to exist; it requires that one that IS there
// says what its section or field is about. Whether real words do that
// needs a reader. What the DOM can show is the opposite case: a heading or
// label whose text is a page builder's scaffold string ("Add Your Heading
// Text Here", "Lorem ipsum", "Heading 1") left in place, which describes
// nothing by construction. Same two tiers as the page-title rule:
//   - scaffold strings and lorem ipsum FAIL: no page is about them;
//   - a single generic word ("Heading", "Title", "Label") is REVIEWED: an
//     article can genuinely be titled "Untitled" and a design-system page
//     can be about headings.
// Empty headings belong to the best-practice empty-heading rule; missing
// labels belong to 3.3.2 and 4.1.2. This rule reads visible text only and
// never judges the meaning of ordinary words.
const SCAFFOLD = new Set([
  'add your heading text here', 'add a heading', 'add heading', 'your heading here', 'heading here',
  'your title goes here', 'your title here', 'title goes here', 'title here', 'insert title here',
  'insert heading here', 'heading text', 'heading goes here', 'section title here',
  'placeholder', 'placeholder text', 'placeholder heading', 'label text', 'your label here',
  'text here', 'enter text here', 'your text here', 'type here', 'sample heading', 'sample text',
  'dummy text', 'dummy heading', 'todo', 'tbd', 'xxx', 'xxxx', 'asdf',
  'this is a heading', 'this is a title', 'this is the heading', 'this is a label',
  'new heading', 'new label', 'new section',
]);
const GENERIC = new Set([
  'heading', 'title', 'subtitle', 'headline', 'label', 'untitled', 'header', 'text', 'default',
  'section', 'section title', 'section heading', 'page title', 'field', 'input',
]);
// "Heading 1" … "Heading 6", "h1" … "h6", "Title 2": the numbered defaults
// editors and builders insert.
const NUMBERED = /^(?:heading|title|label|h)\s*[1-6]$/;

export default {
  id: 'heading-label-placeholder',
  name: 'Placeholder headings and labels',
  impact: 'moderate',
  tags: ['wcag2aa', 'wcag246'],
  help: 'Headings and labels must describe their topic or purpose, not be template text',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/headings-and-labels.html',
  selector: 'h1, h2, h3, h4, h5, h6, [role="heading"], label, legend',
  evaluate(element) {
    const role = element.getAttribute('role');
    if (/^h[1-6]$/i.test(element.tagName) && role && role !== 'heading') return { status: 'pass' };
    const text = (element.textContent ?? '').replace(/\s+/g, ' ').trim();
    if (!text) return { status: 'pass' };
    const normalized = text.toLowerCase().replace(/[\s.:!…-]+$/, '');
    const kind = /^h[1-6]$/i.test(element.tagName) || role === 'heading' ? 'heading' : 'label';
    if (SCAFFOLD.has(normalized) || normalized.startsWith('lorem ipsum') || NUMBERED.test(normalized)) {
      return {
        status: 'fail',
        message: `“${text}” is template text left in a ${kind}. It describes nothing, so a screen-reader user scanning by ${kind}s, or anyone reading the form, learns nothing from it.`,
        fix: kind === 'heading'
          ? 'Replace it with words that name what the section is about.'
          : 'Replace it with words that name what the field asks for.',
      };
    }
    if (GENERIC.has(normalized)) {
      return {
        status: 'incomplete',
        message: `“${text}” is a generic ${kind}. Check whether it describes the topic of its section or the purpose of its field; the same word can also be a real subject or name.`,
        fix: kind === 'heading'
          ? 'Name the section\'s actual topic in the heading.'
          : 'Name what the field asks for in the label.',
      };
    }
    return { status: 'pass' };
  },
};
