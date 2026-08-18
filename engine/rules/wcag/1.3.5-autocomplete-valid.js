// WCAG SC 1.3.5 Identify Input Purpose (Level AA)
// WCAG 1.3.5: autocomplete tokens from the HTML spec's input-purposes list.
// Membership set, so order is free: kept a-z rather than mirroring the spec
// table's own sequence.
const TOKENS = new Set([
  'additional-name', 'address-level1', 'address-level2', 'address-level3', 'address-level4',
  'address-line1', 'address-line2', 'address-line3', 'bday', 'bday-day', 'bday-month',
  'bday-year', 'billing', 'cc-additional-name', 'cc-csc', 'cc-exp', 'cc-exp-month',
  'cc-exp-year', 'cc-family-name', 'cc-given-name', 'cc-name', 'cc-number', 'cc-type',
  'country', 'country-name', 'current-password', 'email', 'family-name', 'fax', 'given-name',
  'home', 'honorific-prefix', 'honorific-suffix', 'impp', 'language', 'mobile', 'name',
  'new-password', 'nickname', 'off', 'on', 'one-time-code', 'organization',
  'organization-title', 'pager', 'photo', 'postal-code', 'sex', 'shipping', 'street-address',
  'tel', 'tel-area-code', 'tel-country-code', 'tel-extension', 'tel-local', 'tel-local-prefix',
  'tel-local-suffix', 'tel-national', 'transaction-amount', 'transaction-currency', 'url',
  'username', 'webauthn', 'work',
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
