// WCAG SC 3.1.1 Language of Page (Level A)
// Rough BCP 47 shape: primary subtag + optional extras ("en", "en-GB",
// "zh-Hans"). Subtags may be a SINGLE character: BCP 47 extension and
// private-use singletons are exactly that ("de-DE-u-co-phonebk",
// "zh-CN-x-private"), so a 2-character floor rejects legal tags. The second
// branch covers private-use-only and grandfathered tags ("x-klingon",
// "i-klingon"), whose primary subtag is itself one character.
// A 5-8 letter primary subtag is legal BCP 47 but unassigned in the IANA
// registry, so it stays rejected: that is what catches lang="english".
// Keep this in step with 3.1.2-valid-lang-parts.js.
const LANG_PATTERN = /^([a-zA-Z]{2,3}(-[a-zA-Z0-9]{1,8})*|[xXiI](-[a-zA-Z0-9]{1,8})+)$/;

/** Elements that hold no words and draw nothing. */
const WORDLESS = 'script, style, template, link, meta, base';

/**
 * Does this document hold nothing a language could apply to? 3.1.1 asks
 * that "the default human language of each Web page can be programmatically
 * determined", and a document with no words has no human language to
 * determine: the placeholder about:blank frame a page parks for later, a
 * frame a script has not written into yet. Its html element has no lang
 * because it has no anything, and the frame's real fault, where it has one,
 * is its missing title (4.1.2, frame-title). 3.1.2 draws the same line:
 * a lang can only fail through words it governs.
 *
 * Blank is kept narrow so a doubtful document keeps its failure: no title
 * text (a title is spoken), no text in the body, and no element in the
 * body beyond scripts and metadata. Any other element counts as
 * content, since an image, a control, a nested frame or a custom element
 * can all carry words this check does not look for. An application shell
 * waiting on its script (<div id="root"></div>) is therefore not blank.
 */
function blankDocument(element) {
  const doc = element.ownerDocument;
  if (doc.title?.trim()) return false;
  const body = doc.body;
  if (!body) return true;
  // Direct children only: once every element child is wordless, the one
  // place left for words is a text node of the body itself, and a
  // script's source is not words.
  return [...body.childNodes].every((node) => {
    if (node.nodeType === 3) return !node.data.trim();
    return node.nodeType !== 1 || node.matches(WORDLESS);
  });
}

export default {
  id: 'html-lang',
  name: 'Page language',
  impact: 'serious',
  tags: ['wcag2a', 'wcag311'],
  help: 'The <html> element must declare a valid language',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/language-of-page.html',
  selector: 'html',
  visibleOnly: false,
  evaluate(element) {
    if (blankDocument(element)) return { status: 'pass' };
    const lang = element.getAttribute('lang')?.trim();
    if (!element.hasAttribute('lang')) {
      return {
        status: 'fail',
        message: 'No lang attribute: screen readers will guess the language and may mispronounce everything.',
        fix: 'Add lang to the html element, e.g. <html lang="en">.',
      };
    }
    // H57 step 1 (the attribute exists) passes here and step 2 (a BCP 47
    // value) fails: an empty value declares nothing. Named separately so
    // the author looks at the value, not for a missing attribute
    // (2026-08-25 overnight audit).
    if (!lang) {
      return {
        status: 'fail',
        message: 'The lang attribute is present but empty, so the page declares no language: screen readers will guess it and may mispronounce everything.',
        fix: 'Give lang a BCP 47 value, e.g. <html lang="en">.',
      };
    }
    if (!LANG_PATTERN.test(lang)) {
      return {
        status: 'fail',
        message: `lang="${lang}" is not a valid language tag.`,
        fix: 'Use a BCP 47 tag such as lang="en" or lang="en-GB".',
      };
    }
    return { status: 'pass' };
  },
};
