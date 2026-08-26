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
