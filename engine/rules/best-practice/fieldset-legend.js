// WAI forms tutorial: radio/checkbox groups need a group label — each
// input's own label isn't enough to convey what the group asks.
export default {
  id: 'fieldset-legend',
  impact: 'moderate',
  tags: ['best-practice'],
  help: 'Radio and checkbox groups should be grouped with a label',
  helpUrl: 'https://www.w3.org/WAI/tutorials/forms/grouping/',
  selector: 'input[type="radio"][name], input[type="checkbox"][name]',
  // Judged as a set: only same-name groups of 2+ need grouping, and one
  // finding per group is enough.
  evaluateAll(elements) {
    const groups = {};
    elements.forEach((element, index) => {
      const key = `${element.type}::${element.form?.id ?? ''}::${element.name}`;
      (groups[key] ??= []).push(index);
    });
    const outcomes = elements.map(() => ({ status: 'pass' }));
    for (const indexes of Object.values(groups)) {
      if (indexes.length < 2) continue;
      const first = elements[indexes[0]];
      const fieldset = first.closest('fieldset');
      const grouped =
        (fieldset && fieldset.querySelector('legend')?.textContent.trim()) ||
        first.closest('[role="group"][aria-label], [role="group"][aria-labelledby], [role="radiogroup"][aria-label], [role="radiogroup"][aria-labelledby]');
      if (grouped) continue;
      outcomes[indexes[0]] = {
        status: 'fail',
        message: `This group of ${indexes.length} ${first.type} inputs (name="${first.name}") has no group label — screen-reader users hear each option without knowing what question it answers.`,
        fix: 'Wrap the group in <fieldset> with a <legend>, or role="radiogroup"/"group" with an aria-label.',
      };
    }
    return outcomes;
  },
};
