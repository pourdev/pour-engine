// WCAG SC 4.1.2 Name, Role, Value (Level A)
// ARIA 1.2 attribute names (shared vocabulary in lib/roles.js), and the
// allowed values for enumerated ones.
import { KNOWN_ARIA as KNOWN } from '../../lib/roles.js';

// Note: "undefined" is a legal token for the tristate/undefinable attributes
// (aria-expanded, aria-selected, aria-checked, aria-pressed) per ARIA 1.2.
const ENUMS = {
  'aria-atomic': ['true', 'false'], 'aria-busy': ['true', 'false'],
  'aria-disabled': ['true', 'false'], 'aria-expanded': ['true', 'false', 'undefined'],
  'aria-hidden': ['true', 'false'], 'aria-modal': ['true', 'false'],
  'aria-multiline': ['true', 'false'], 'aria-multiselectable': ['true', 'false'],
  'aria-readonly': ['true', 'false'], 'aria-required': ['true', 'false'],
  'aria-selected': ['true', 'false', 'undefined'],
  'aria-checked': ['true', 'false', 'mixed', 'undefined'], 'aria-pressed': ['true', 'false', 'mixed', 'undefined'],
  'aria-live': ['off', 'polite', 'assertive'],
  'aria-orientation': ['horizontal', 'vertical'],
  'aria-sort': ['none', 'ascending', 'descending', 'other'],
  'aria-autocomplete': ['none', 'inline', 'list', 'both'],
  'aria-invalid': ['true', 'false', 'grammar', 'spelling'],
  'aria-haspopup': ['true', 'false', 'menu', 'listbox', 'tree', 'grid', 'dialog'],
  'aria-current': ['true', 'false', 'page', 'step', 'location', 'date', 'time'],
};

export default {
  id: 'aria-attr-valid',
  name: 'Valid ARIA values',
  impact: 'critical',
  tags: ['wcag2a', 'wcag412'],
  help: 'aria attributes must exist and have valid values',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html',
  selector: '*',
  visibleOnly: false, // applies to hidden elements too; also avoids visibility cost on every node
  evaluate(element) {
    const problems = [];
    for (const { name, value } of element.attributes) {
      if (!name.startsWith('aria-')) continue;
      if (!KNOWN.has(name.slice(5))) {
        problems.push(`${name} is not an ARIA attribute`);
      } else if (ENUMS[name] && !ENUMS[name].includes(value.trim().toLowerCase())) {
        problems.push(`${name}="${value}" — allowed values: ${ENUMS[name].join(', ')}`);
      }
    }
    if (!problems.length) return { status: 'pass' };
    return {
      status: 'fail',
      message: `Invalid ARIA: ${problems.join('; ')}. Assistive technology ignores attributes it doesn't recognise.`,
      fix: 'Correct the attribute name/value against the ARIA specification, or remove it.',
    };
  },
};
