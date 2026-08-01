// WCAG SC 4.1.2 Name, Role, Value (Level A)
const LABELABLE = 'input, select, textarea, button, meter, output, progress';

export default {
  id: 'label-for-valid',
  impact: 'serious',
  tags: ['wcag2a', 'wcag412'],
  help: 'label[for] must reference a form control that exists',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html',
  selector: 'label[for]',
  evaluate(element) {
    const id = element.getAttribute('for');
    // id references resolve within the element's own root — a label in a
    // shadow tree can only point at controls in that same tree.
    const target = element.getRootNode().getElementById?.(id);
    if (target?.matches(LABELABLE)) return { status: 'pass' };
    return {
      status: 'fail',
      message: target
        ? `for="${id}" points at a <${target.tagName.toLowerCase()}>, which cannot be labelled — the association is ignored.`
        : `for="${id}" points at nothing — the label is not associated with any field.`,
      fix: 'Point the for attribute at the id of the input/select/textarea it labels.',
    };
  },
};
