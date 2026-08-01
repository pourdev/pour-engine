// Multiple <label>s per field are VALID HTML and accname concatenates them,
// so nothing in WCAG 3.3.2 prohibits the pattern — demoted from WCAG scope
// after a spec sweep. It stays worth surfacing: screen readers differ in
// which label they announce, and the visible-label + sr-only-supplement
// pair usually reads better as label + aria-describedby.
export default {
  id: 'multiple-labels',
  impact: 'minor',
  tags: ['best-practice'],
  help: 'Form fields should not have multiple labels',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html',
  selector: 'input, select, textarea',
  evaluate(element, { isVisible }) {
    // Hidden labels don't compete for announcement.
    const visibleLabels = [...(element.labels ?? [])].filter(isVisible);
    if (visibleLabels.length <= 1) return { status: 'pass' };
    return {
      status: 'fail',
      message: `${visibleLabels.length} visible labels point at this field — screen readers differ in which they announce.`,
      fix: 'Keep one label; move extra guidance into aria-describedby text.',
    };
  },
};
