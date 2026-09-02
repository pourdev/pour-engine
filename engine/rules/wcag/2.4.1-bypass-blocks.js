// WCAG SC 2.4.1 Bypass Blocks (Level A)
import { collectRoots, isEmbeddedDocument } from '../../lib/dom.js';
import { effectiveRole, LANDMARK_ROLES } from '../../lib/roles.js';

// ARIA11 lists the landmark roles: banner, complementary, contentinfo,
// form, main, navigation, region, search. Judged by EFFECTIVE role, not tag
// (2026-08-25 overnight audit): HTML-AAM makes a <header>/<footer> inside
// article, aside, main, nav or section generic rather than a landmark, and
// a named <section> or <form> IS one. The tag selector counted the first
// and missed the second. region and form are landmarks only when named
// (ARIA 1.2 requires an accessible name for region; HTML-AAM maps form to
// the form landmark only with one), so the name is checked here.
const NAMED_ONLY = new Set(['form', 'region']);
const LANDMARK_CANDIDATES = 'main, header, footer, nav, aside, section, form, [role]';
const hasName = (el) => Boolean(
  el.getAttribute('aria-label')?.trim() || el.getAttribute('aria-labelledby')?.trim() || el.getAttribute('title')?.trim());
const isLandmark = (el) => {
  const role = effectiveRole(el);
  return LANDMARK_ROLES.has(role) && (!NAMED_ONLY.has(role) || hasName(el));
};

export default {
  id: 'bypass-blocks',
  name: 'Skip to content',
  impact: 'serious',
  tags: ['wcag2a', 'wcag241'],
  help: 'The page must offer a way to skip repeated blocks',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/bypass-blocks.html',
  selector: 'html',
  visibleOnly: false,
  evaluate(element, { isRendered }) {
    // 2.4.1 governs blocks "repeated on multiple Web pages", and a WCAG
    // Web page is a non-embedded resource: an embedded frame's document
    // owes no skip link of its own (the frame's title is itself the bypass
    // the spec names in H64).
    if (isEmbeddedDocument(element.ownerDocument)) return { status: 'pass' };
    // 2.4.1's sufficient techniques: a skip link, landmarks (ARIA11), or
    // headings (H69) — any one mechanism satisfies the criterion. Modern
    // component pages keep ALL of these inside open shadow roots (the
    // whole app under one custom element), so every root is searched —
    // judging only the light DOM invents failures on web-component sites.
    const doc = element.ownerDocument;
    const roots = collectRoots(doc);
    const inAnyRoot = (selector) => roots.some((root) => root.querySelector?.(selector));
    // ARIA11 accepts landmarks generally, not the main landmark alone: a
    // banner and a navigation region are exactly what landmark navigation
    // skips between. Requiring `main` failed pages that were already using
    // the technique the spec names.
    if (roots.some((root) => [...(root.querySelectorAll?.(LANDMARK_CANDIDATES) ?? [])].some(isLandmark))) {
      return { status: 'pass' };
    }
    if (inAnyRoot('h1, h2, h3, h4, h5, h6, [role="heading"]')) return { status: 'pass' };
    // G1/G123/G124: ANY in-page link that resolves is a bypass mechanism.
    // Reading only the first one hid a real skip link behind the href="#"
    // that scripts use as a button. The link must be RENDERED to count:
    // G1's test is that it is visible, or visible on keyboard focus, and
    // a display:none link is never in the tab order, so nobody can use it.
    // Clip/sr-only skip links are rendered and still count (2026-08-25
    // overnight audit).
    for (const root of roots) {
      for (const link of root.querySelectorAll?.('a[href^="#"]') ?? []) {
        const id = link.getAttribute('href').slice(1);
        if (!id) continue;
        if (isRendered && !isRendered(link)) continue;
        if (roots.some((r) => r.getElementById?.(id) || r.querySelector?.(`[id="${CSS.escape(id)}"]`))) {
          return { status: 'pass' };
        }
      }
    }
    // H64: a titled iframe is itself a way past the block it holds.
    const frames = [...(doc.querySelectorAll('iframe, frame') ?? [])];
    if (frames.length && frames.every((frame) => frame.getAttribute('title')?.trim())) {
      return { status: 'pass' };
    }
    // The criterion governs "blocks of content that are repeated on multiple
    // Web pages". One page cannot prove repetition, but it can show there is
    // no block to bypass at all: a page with barely any links has nothing a
    // reader would need to skip, and failing it names a duty that never
    // applied.
    const linkCount = roots.reduce((n, root) => n + (root.querySelectorAll?.('a[href], button').length ?? 0), 0);
    if (linkCount < 4) return { status: 'pass' };
    return {
      status: 'fail',
      message: `This page has ${linkCount} links and buttons but no landmark, heading, skip link, or titled frame — keyboard and screen-reader users must go through the whole header and nav to reach anything.`,
      fix: 'Add a skip link like <a href="#content">Skip to content</a>, wrap primary content in <main>, or structure the page with headings.',
    };
  },
};
