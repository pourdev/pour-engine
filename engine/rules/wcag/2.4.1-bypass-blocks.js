// WCAG SC 2.4.1 Bypass Blocks (Level A)
import { collectRoots } from '../../lib/dom.js';

export default {
  id: 'bypass-blocks',
  impact: 'serious',
  tags: ['wcag2a', 'wcag241'],
  help: 'The page must offer a way to skip repeated blocks',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/bypass-blocks.html',
  selector: 'html',
  visibleOnly: false,
  evaluate(element) {
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
    const LANDMARKS = 'main, [role="main"], header, [role="banner"], nav, [role="navigation"],'
      + ' aside, [role="complementary"], footer, [role="contentinfo"], [role="search"], form[role="search"]';
    if (inAnyRoot(LANDMARKS)) return { status: 'pass' };
    if (inAnyRoot('h1, h2, h3, h4, h5, h6, [role="heading"]')) return { status: 'pass' };
    // G1/G123/G124: ANY in-page link that resolves is a bypass mechanism.
    // Reading only the first one hid a real skip link behind the href="#"
    // that scripts use as a button.
    for (const root of roots) {
      for (const link of root.querySelectorAll?.('a[href^="#"]') ?? []) {
        const id = link.getAttribute('href').slice(1);
        if (!id) continue;
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
