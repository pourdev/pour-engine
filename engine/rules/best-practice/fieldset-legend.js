// WAI forms tutorial: radio/checkbox groups need a group label — each
// input's own label isn't enough to convey what the group asks.
import { accessibleName, labelledByName } from '../../lib/accessible-name.js';
export default {
  id: 'fieldset-legend',
  name: 'Grouped field labels',
  impact: 'moderate',
  tags: ['best-practice'],
  help: 'Radio and checkbox groups should be grouped with a label',
  helpUrl: 'https://www.w3.org/WAI/tutorials/forms/grouping/',
  selector: 'input[type="radio"][name], input[type="checkbox"][name]',
  // Judged as a set: only same-name groups of 2+ need grouping, and one
  // finding per group is enough.
  evaluateAll(elements) {
    const groups = new Map();
    elements.forEach((element, index) => {
      // Form identity matters: two idless forms can use the same field name
      // without making one group. Group controls within their own tree too.
      const owner = element.form ?? element.getRootNode();
      if (!groups.has(owner)) groups.set(owner, new Map());
      const byName = groups.get(owner);
      const key = `${element.type}::${element.name}`;
      if (!byName.has(key)) byName.set(key, []);
      byName.get(key).push(index);
    });
    const outcomes = elements.map(() => ({ status: 'pass' }));
    for (const indexes of [...groups.values()].flatMap((byName) => [...byName.values()])) {
      if (indexes.length < 2) continue;
      const first = elements[indexes[0]];
      // A <fieldset> IS a group; it does not need role="group" written on it
      // to be one, and a legend is one way to name it rather than the only
      // way. Requiring an explicit role attribute reported a correctly named
      // group as unlabelled, which the browser plainly contradicts.
      // Name the GROUP the three ways a group can be named: its own legend,
      // a reference, or a label. Not a general accessible-name call, which
      // would fall through to name-from-contents and read the options inside
      // the fieldset as if they were its name.
      // The legend itself IS named by the accessible-name computation: a
      // legend holding an <img alt="Choose a colour"> names the group (the
      // browser exposes group "Choose a colour"), and raw textContent called
      // it empty (2026-08-25 overnight audit).
      const group = first.closest('fieldset, [role="group"], [role="radiogroup"]');
      const legend = group?.querySelector(':scope > legend');
      const grouped = group && indexes.every((index) => group.contains(elements[index])) && (
        (legend && accessibleName(legend))
        || labelledByName(group)
        || group.getAttribute('aria-label')?.trim()
      );
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
