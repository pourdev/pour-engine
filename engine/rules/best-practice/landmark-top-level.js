// ARIA APG landmark pattern: banner, main, and contentinfo are page-level
// regions — nesting them inside other landmarks breaks the page outline.
import { implicitRole } from '../../lib/roles.js';

const LANDMARK_ROLES = new Set([
  'main', 'navigation', 'banner', 'contentinfo', 'complementary', 'region', 'search', 'form',
]);

/** The nearest ancestor that is a landmark in the accessibility tree —
 *  explicit role OR implicit (nav, labelled section/form, top-level
 *  header/footer). A selector can't express the implicit cases; a
 *  usa.gov-style div[role=banner] inside section[aria-label] was invisible
 *  to the old explicit-only check. */
function landmarkAncestor(element) {
  for (let parent = element.parentElement; parent; parent = parent.parentElement) {
    const explicit = parent.getAttribute('role')?.trim().split(/\s+/)[0]?.toLowerCase();
    const role = explicit ?? implicitRole(parent);
    if (role && LANDMARK_ROLES.has(role)) return { element: parent, role };
  }
  return null;
}

export default {
  id: 'landmark-top-level',
  name: 'Top-level landmarks',
  impact: 'moderate',
  tags: ['best-practice'],
  help: 'banner, main and contentinfo landmarks must be top level',
  helpUrl: 'https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/',
  selector: 'header, footer, main, [role="banner"], [role="contentinfo"], [role="main"]',
  evaluate(element) {
    const tag = element.tagName.toLowerCase();
    // <header>/<footer> inside sectioning content are not landmarks at all.
    if ((tag === 'header' || tag === 'footer') && !element.hasAttribute('role') &&
        element.closest('article, aside, main, nav, section')) {
      return { status: 'pass' };
    }
    const container = landmarkAncestor(element);
    if (!container) return { status: 'pass' };
    const role = element.getAttribute('role') ?? { header: 'banner', footer: 'contentinfo', main: 'main' }[tag];
    return {
      status: 'fail',
      message: `This ${role} landmark is nested inside a ${container.role} landmark (<${container.element.tagName.toLowerCase()}>) — page-level regions lose their meaning when nested.`,
      fix: 'Move it to be a direct child of <body>, or remove the landmark role.',
    };
  },
};
