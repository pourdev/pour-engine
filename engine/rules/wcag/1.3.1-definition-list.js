// WCAG SC 1.3.1 Info and Relationships (Level A)
const ALLOWED = new Set(['DT', 'DD', 'DIV', 'SCRIPT', 'TEMPLATE']);

export default {
  id: 'definition-list',
  impact: 'serious',
  tags: ['wcag2a', 'wcag131'],
  help: '<dl> must be structured as term/description pairs',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html',
  selector: 'dl:not([role])', // a role attribute replaces the dl semantics
  evaluate(element) {
    const invalid = [...element.children].filter((child) => !ALLOWED.has(child.tagName));
    if (!invalid.length) return { status: 'pass' };
    const tags = [...new Set(invalid.map((child) => `<${child.tagName.toLowerCase()}>`))].join(', ');
    return {
      status: 'fail',
      message: `This <dl> contains ${tags} directly — only <dt>, <dd> (optionally grouped in <div>) are allowed, otherwise the term/description pairing breaks.`,
      fix: 'Restructure the list into <dt>/<dd> pairs, or use a different element.',
    };
  },
};
