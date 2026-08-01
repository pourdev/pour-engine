// WCAG SC 3.1.1 Language of Page (Level A)
// Rough BCP 47 shape: primary subtag + optional extras ("en", "en-GB", "zh-Hans").
const LANG_PATTERN = /^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*$/;

export default {
  id: 'html-lang',
  impact: 'serious',
  tags: ['wcag2a', 'wcag311'],
  help: 'The <html> element must declare a valid language',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/language-of-page.html',
  selector: 'html',
  visibleOnly: false,
  evaluate(element) {
    const lang = element.getAttribute('lang')?.trim();
    if (!lang) {
      return {
        status: 'fail',
        message: 'No lang attribute: screen readers will guess the language and may mispronounce everything.',
        fix: 'Add lang to the html element, e.g. <html lang="en">.',
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
