// ARIA APG landmark pattern: banner, main, contentinfo and complementary
// are page-level regions — nesting them inside other landmarks breaks the
// page outline. Complementary joins via the aside demotion semantics in
// lib/roles.js: only an aside that actually reaches the accessibility tree
// as complementary owes top-levelness.
import { implicitRole } from '../../lib/roles.js';

const LANDMARK_ROLES = new Set([
  'main', 'navigation', 'banner', 'contentinfo', 'complementary', 'region', 'search', 'form',
]);

/** HTML-AAM (form, section): "If a form has no accessible name, do not
 *  expose the element as a landmark", and a section is a region only with
 *  an accessible name. An unnamed page-wrapping <form> (the WebForms
 *  form runat="server" shape) is therefore no landmark container at all,
 *  and the banner, main and contentinfo inside it are top level. Mirrors
 *  region.js, decided locally here (2026-08-25 overnight audit). */
const named = (element) =>
  element.hasAttribute('aria-label') || element.hasAttribute('aria-labelledby') || element.hasAttribute('title');

/** The nearest ancestor that is a landmark in the accessibility tree —
 *  explicit role OR implicit (nav, labelled section/form, top-level
 *  header/footer). A selector can't express the implicit cases; a
 *  usa.gov-style div[role=banner] inside section[aria-label] was invisible
 *  to the old explicit-only check. */
function landmarkAncestor(element) {
  for (let parent = element.parentElement; parent; parent = parent.parentElement) {
    const explicit = parent.getAttribute('role')?.trim().split(/\s+/)[0]?.toLowerCase();
    const role = explicit ?? implicitRole(parent);
    if (!explicit && (role === 'form' || role === 'region') && !named(parent)) continue;
    if (role && LANDMARK_ROLES.has(role)) return { element: parent, role };
  }
  return null;
}

export default {
  id: 'landmark-top-level',
  name: 'Top-level landmarks',
  impact: 'moderate',
  tags: ['best-practice'],
  help: 'banner, main, contentinfo and complementary landmarks must be top level',
  helpUrl: 'https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/',
  selector: 'header, footer, main, aside, [role="banner"], [role="contentinfo"], [role="main"], [role="complementary"]',
  evaluate(element) {
    const tag = element.tagName.toLowerCase();
    // <header>/<footer> inside sectioning content are not landmarks at all.
    if ((tag === 'header' || tag === 'footer') && !element.hasAttribute('role') &&
        element.closest('article, aside, main, nav, section')) {
      return { status: 'pass' };
    }
    // An <aside> is complementary only when implicitRole says so: unnamed
    // inside sectioning content it is generic (Chromium exposes NO
    // complementary node for a news home full of related-content asides,
    // measured live) — there is no landmark to be top level. An aside
    // directly inside <main> is NOT demoted (main is not sectioning
    // content), so an ad-slot aside nested in main is a real finding.
    if (tag === 'aside' && !element.hasAttribute('role') &&
        implicitRole(element) !== 'complementary') {
      return { status: 'pass' };
    }
    const container = landmarkAncestor(element);
    if (!container) return { status: 'pass' };
    const role = element.getAttribute('role') ??
      { header: 'banner', footer: 'contentinfo', main: 'main', aside: 'complementary' }[tag];
    return {
      status: 'fail',
      message: `This ${role} landmark is nested inside a ${container.role} landmark (<${container.element.tagName.toLowerCase()}>) — page-level regions lose their meaning when nested.`,
      fix: 'Move it to be a direct child of <body>, or remove the landmark role.',
    };
  },
};
