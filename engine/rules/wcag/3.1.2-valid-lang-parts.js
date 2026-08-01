// WCAG SC 3.1.2 Language of Parts (Level AA)
const LANG_PATTERN = /^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*$/;

export default {
  id: 'valid-lang-parts',
  impact: 'serious',
  tags: ['wcag2aa', 'wcag312'],
  help: 'lang attributes on page parts must be valid',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/language-of-parts.html',
  selector: '[lang]:not(html)',
  evaluate(element) {
    const lang = element.getAttribute('lang').trim();
    if (lang === '' || LANG_PATTERN.test(lang)) return { status: 'pass' }; // empty resets to page language
    return {
      status: 'fail',
      message: `lang="${lang}" is not a valid language tag, so screen readers may switch to the wrong pronunciation.`,
      fix: 'Use a BCP 47 tag such as lang="fr" or lang="de-AT".',
    };
  },
};
