// ARIA APG landmark pattern: same-type landmarks need distinguishing
// labels, and banner / contentinfo / main must be unique per page outright
// (two "banners" are ambiguous however well they're labelled).
import { implicitRole } from '../../lib/roles.js';
import { labelledByName } from '../../lib/accessible-name.js';

const SINGLETON = new Set(['banner', 'contentinfo', 'main']);

/** Landmark role of the element in the accessibility tree — explicit role
 *  first, else the implicit role (which handles header/footer demotion
 *  inside sectioning content and unlabelled sections being generic). */
const landmarkRole = (element) =>
  element.getAttribute('role')?.trim().split(/\s+/)[0]?.toLowerCase() ?? implicitRole(element);

// Landmarks are not name-from-content roles: only author-provided labels
// distinguish them (the text inside a nav is its content, not its name).
const landmarkName = (element) =>
  labelledByName(element)
  || element.getAttribute('aria-label')?.trim()
  || element.getAttribute('title')?.trim()
  || '';

export default {
  id: 'landmark-unique',
  name: 'Distinguishable landmarks',
  impact: 'moderate',
  tags: ['best-practice'],
  help: 'Landmarks of the same type need distinguishing labels',
  helpUrl: 'https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/',
  // Implicit landmarks (header, footer, labelled section/form) join the
  // grouping — a page's <header> and a div[role="banner"] ARE duplicates.
  selector:
    'nav, aside, header, footer, section[aria-label], section[aria-labelledby], ' +
    'form[aria-label], form[aria-labelledby], [role="navigation"], [role="complementary"], ' +
    '[role="banner"], [role="contentinfo"], [role="region"], [role="search"], [role="form"], [role="main"], main',
  // Judged as a set: two unlabelled navs are the problem, not either alone.
  evaluateAll(elements) {
    const roles = elements.map(landmarkRole);
    const outcomes = elements.map(() => ({ status: 'pass' }));
    const landmarkIndexes = elements
      .map((element, index) => ({ element, index, role: roles[index] }))
      .filter(({ role }) => role && role !== 'generic' && role !== 'presentation' && role !== 'none');

    // Singleton roles: more than one banner/contentinfo/main is a failure
    // regardless of labels.
    for (const singleton of SINGLETON) {
      const dupes = landmarkIndexes.filter(({ role }) => role === singleton);
      if (dupes.length < 2) continue;
      for (const { index } of dupes) {
        outcomes[index] = {
          status: 'fail',
          message: `${dupes.length} ${singleton} landmarks on one page — ${singleton} must be unique; screen-reader region navigation becomes ambiguous.`,
          fix: `Keep one ${singleton}; demote the others (remove the role, or use a non-landmark element).`,
        };
      }
    }

    const groups = {};
    for (const { element, index, role } of landmarkIndexes) {
      if (SINGLETON.has(role)) continue; // already judged above
      const key = `${role}::${landmarkName(element).toLowerCase()}`;
      (groups[key] ??= []).push(index);
    }
    for (const [key, indexes] of Object.entries(groups)) {
      if (indexes.length < 2) continue;
      const [role, name] = key.split('::');
      for (const index of indexes) {
        outcomes[index] = {
          status: 'fail',
          message: name
            ? `${indexes.length} ${role} landmarks share the label "${name}" — screen-reader users can't tell them apart.`
            : `${indexes.length} unlabelled ${role} landmarks — screen-reader users hear "${role}" twice with no way to tell them apart.`,
          fix: 'Give each one a distinct aria-label, e.g. aria-label="Primary" / aria-label="Footer".',
        };
      }
    }
    return outcomes;
  },
};
