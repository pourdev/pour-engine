// WCAG SC 4.1.2 Name, Role, Value (Level A)
// ARIA-built form fields (role="textbox" divs etc.) need names just like
// native inputs — native fields are handled by form-label.
//
// Spec note (accname): input-like roles are NOT "name from content" — the
// text inside a listbox/textbox does not name it, only author-provided
// naming counts. Toggle roles (checkbox/radio/switch) DO name from content.
import { labelledByName } from '../../lib/accessible-name.js';

const AUTHOR_ONLY = ['textbox', 'searchbox', 'combobox', 'listbox', 'spinbutton', 'slider'];
const FROM_CONTENT = ['checkbox', 'radio', 'switch'];

function authorName(element) {
  return labelledByName(element)
    || element.getAttribute('aria-label')?.trim()
    || element.getAttribute('title')?.trim()
    || '';
}

export default {
  id: 'aria-field-name',
  impact: 'serious',
  tags: ['wcag2a', 'wcag412'],
  help: 'ARIA form fields must have an accessible name',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html',
  selector: [...AUTHOR_ONLY, ...FROM_CONTENT]
    .map((role) => `[role="${role}"]:not(input):not(select):not(textarea)`)
    .join(', '),
  evaluate(element, { accessibleName }) {
    const role = element.getAttribute('role');
    const name = FROM_CONTENT.includes(role) ? accessibleName(element) : authorName(element);
    if (name) return { status: 'pass' };
    // ARIA 1.1 combobox pattern: a non-focusable wrapper div carries the
    // role while the real, focusable input inside carries the label. The
    // wrapper's missing name is spec-untidy but the field users actually
    // reach IS named — not a 4.1.2 failure in practice.
    if (role === 'combobox' && element.tabIndex < 0) {
      const input = element.querySelector('input, [role="textbox"], [role="searchbox"]');
      if (input && (input.labels?.length || input.getAttribute('aria-label') || input.getAttribute('aria-labelledby'))) {
        return { status: 'pass' };
      }
    }
    return {
      status: 'fail',
      message: `This role="${role}" field has no accessible name — screen readers announce the role with no idea what it's for.${
        AUTHOR_ONLY.includes(role) ? ' (Content inside it does not count as a name for this role.)' : ''}`,
      fix: 'Add aria-label="…" or aria-labelledby pointing at its visible label.',
    };
  },
};
