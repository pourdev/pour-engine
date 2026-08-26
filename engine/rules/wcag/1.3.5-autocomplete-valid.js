// WCAG SC 1.3.5 Identify Input Purpose (Level AA)
// WCAG 1.3.5: autocomplete tokens from the HTML spec's input-purposes list.
// Membership set, so order is free: kept a-z rather than mirroring the spec
// table's own sequence.
//
// The field names: the 53 purposes WCAG 2.2 section 7 lists, plus
// one-time-code (HTML's list is a superset of WCAG's).
const FIELD_NAMES = new Set([
  'additional-name', 'address-level1', 'address-level2', 'address-level3', 'address-level4',
  'address-line1', 'address-line2', 'address-line3', 'bday', 'bday-day', 'bday-month',
  'bday-year', 'cc-additional-name', 'cc-csc', 'cc-exp', 'cc-exp-month',
  'cc-exp-year', 'cc-family-name', 'cc-given-name', 'cc-name', 'cc-number', 'cc-type',
  'country', 'country-name', 'current-password', 'email', 'family-name', 'given-name',
  'honorific-prefix', 'honorific-suffix', 'impp', 'language', 'name',
  'new-password', 'nickname', 'one-time-code', 'organization',
  'organization-title', 'photo', 'postal-code', 'sex', 'street-address',
  'tel', 'tel-area-code', 'tel-country-code', 'tel-extension', 'tel-local', 'tel-local-prefix',
  'tel-local-suffix', 'tel-national', 'transaction-amount', 'transaction-currency', 'url',
  'username',
]);
// HTML's contact types, and the field names they may qualify.
const CONTACT_TYPES = new Set(['home', 'work', 'mobile', 'fax', 'pager']);
const CONTACT_FIELDS = new Set([
  'tel', 'tel-country-code', 'tel-national', 'tel-area-code', 'tel-local',
  'tel-local-prefix', 'tel-local-suffix', 'tel-extension', 'email', 'impp',
]);
const MODIFIERS = new Set(['shipping', 'billing', 'webauthn', 'on', 'off']);
const isSection = (token) => token.startsWith('section-');
const isKnown = (token) => FIELD_NAMES.has(token) || CONTACT_TYPES.has(token) || MODIFIERS.has(token) || isSection(token);

/**
 * HTML's autofill grammar, parsed positionally: the value is either "on" or
 * "off" alone, or autofill detail tokens in this order: optionally one
 * section-* token, then optionally shipping or billing, then EITHER one
 * field name OR a contact type (home, work, mobile, fax, pager) immediately
 * followed by a tel, tel-*, email or impp field name, then optionally
 * webauthn. A browser that cannot parse the value discards all of it, so a
 * grammatically broken value exposes no purpose at all: F107 territory even
 * when every token is individually real. Membership alone passed "shipping"
 * (no field), "tel email" (two fields), "home name" (contact type before a
 * non-contact field), "billing section-x tel" (section not first), "off
 * email" and "webauthn" alone (2026-08-25 overnight audit).
 * Returns null when the value is well formed, otherwise the reason it is not.
 */
function grammarFault(tokens) {
  if (tokens.length === 1 && (tokens[0] === 'on' || tokens[0] === 'off')) return null;
  if (tokens.includes('on') || tokens.includes('off')) return '"on" and "off" must stand alone, with no other tokens';
  let i = 0;
  if (isSection(tokens[i])) i += 1;
  if (tokens[i] === 'shipping' || tokens[i] === 'billing') i += 1;
  if (CONTACT_TYPES.has(tokens[i])) {
    if (!CONTACT_FIELDS.has(tokens[i + 1])) {
      return `"${tokens[i]}" must come directly before a tel, tel-*, email or impp field name`;
    }
    i += 2;
  } else if (FIELD_NAMES.has(tokens[i])) {
    i += 1;
  } else {
    const found = tokens[i];
    if (found && isSection(found)) return `"${found}" must be the first token`;
    if (found === 'webauthn') return '"webauthn" must come last, after a field name';
    if (found === 'shipping' || found === 'billing') return `"${found}" may appear once, directly before the field name`;
    return 'the value names no field (exactly one field name such as email, tel or given-name is required)';
  }
  if (tokens[i] === 'webauthn') i += 1;
  if (i < tokens.length) {
    const extra = tokens[i];
    if (isSection(extra)) return `"${extra}" must be the first token`;
    if (extra === 'shipping' || extra === 'billing') return `"${extra}" must come before the field name`;
    if (extra === 'webauthn') return '"webauthn" must be the last token';
    if (FIELD_NAMES.has(extra) || CONTACT_TYPES.has(extra)) return `only one field name is allowed, but "${tokens[i - 1]}" is followed by "${extra}"`;
    return `"${extra}" cannot follow the field name`;
  }
  return null;
}

export default {
  id: 'autocomplete-valid',
  name: 'Autocomplete tokens',
  impact: 'serious',
  tags: ['wcag21aa', 'wcag135'],
  help: 'autocomplete attributes must use valid tokens',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/identify-input-purpose.html',
  // HTML gives the autocomplete attribute no effect on checkbox, radio, file,
  // submit, image, reset and button inputs, and a disabled control collects
  // nothing, so neither can misidentify a purpose (2026-08-25 overnight
  // audit; the same applicability ACT rule 73f2c2 states).
  selector: 'input[autocomplete]:not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="submit"])'
    + ':not([type="image"]):not([type="reset"]):not([type="button"]):not(:disabled),'
    + ' select[autocomplete]:not(:disabled), textarea[autocomplete]:not(:disabled)',
  evaluate(element) {
    if (element.getAttribute('aria-disabled') === 'true') return { status: 'pass' };
    const tokens = element
      .getAttribute('autocomplete')
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
    const invalid = tokens.filter((token) => !isKnown(token));
    if (invalid.length) {
      return {
        status: 'fail',
        message: `autocomplete contains unknown token(s): ${invalid.join(', ')} — browsers and assistive tools can't identify this field's purpose.`,
        fix: 'Use tokens from the HTML input-purposes list, e.g. autocomplete="email" or autocomplete="given-name".',
      };
    }
    const fault = tokens.length ? grammarFault(tokens) : null;
    if (!fault) return { status: 'pass' };
    return {
      status: 'fail',
      message: `autocomplete="${element.getAttribute('autocomplete').trim()}" is not a valid autofill value: ${fault}. Browsers discard the whole value, so no purpose is exposed.`,
      fix: 'Use one field name from the HTML autofill list, optionally preceded by section-*, then shipping or billing, and (for tel, email and impp only) a contact type, e.g. autocomplete="shipping tel" or autocomplete="home email".',
    };
  },
};
