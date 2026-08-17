// WCAG SC 1.3.5 Identify Input Purpose (Level AA)
// WCAG 1.3.5: autocomplete tokens from the HTML spec's input-purposes list.
const TOKENS = new Set([
  'on', 'off', 'name', 'honorific-prefix', 'given-name', 'additional-name', 'family-name',
  'honorific-suffix', 'nickname', 'organization-title', 'username', 'new-password',
  'current-password', 'one-time-code', 'organization', 'street-address', 'address-line1',
  'address-line2', 'address-line3', 'address-level1', 'address-level2', 'address-level3',
  'address-level4', 'country', 'country-name', 'postal-code', 'cc-name', 'cc-given-name',
  'cc-additional-name', 'cc-family-name', 'cc-number', 'cc-exp', 'cc-exp-month', 'cc-exp-year',
  'cc-csc', 'cc-type', 'transaction-currency', 'transaction-amount', 'language', 'bday',
  'bday-day', 'bday-month', 'bday-year', 'sex', 'url', 'photo', 'tel', 'tel-country-code',
  'tel-national', 'tel-area-code', 'tel-local', 'tel-local-prefix', 'tel-local-suffix',
  'tel-extension', 'email', 'impp', 'webauthn', 'shipping', 'billing', 'home', 'work',
  'mobile', 'fax', 'pager',
]);

export default {
  id: 'autocomplete-valid',
  name: 'Autocomplete tokens',
  impact: 'serious',
  tags: ['wcag21aa', 'wcag135'],
  help: 'autocomplete attributes must use valid tokens',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/identify-input-purpose.html',
  selector: 'input[autocomplete], select[autocomplete], textarea[autocomplete]',
  evaluate(element) {
    const invalid = element
      .getAttribute('autocomplete')
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter((token) => token && !TOKENS.has(token) && !token.startsWith('section-'));
    if (!invalid.length) return { status: 'pass' };
    return {
      status: 'fail',
      message: `autocomplete contains unknown token(s): ${invalid.join(', ')} — browsers and assistive tools can't identify this field's purpose.`,
      fix: 'Use tokens from the HTML input-purposes list, e.g. autocomplete="email" or autocomplete="given-name".',
    };
  },
};
