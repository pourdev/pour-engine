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
    if (inAnyRoot('main, [role="main"]')) return { status: 'pass' };
    if (inAnyRoot('h1, h2, h3, h4, h5, h6, [role="heading"]')) return { status: 'pass' };
    for (const root of roots) {
      const firstLink = root.querySelector?.('a[href^="#"]');
      const id = firstLink?.getAttribute('href').slice(1);
      if (id && roots.some((r) => r.getElementById?.(id) || r.querySelector?.(`[id="${CSS.escape(id)}"]`))) {
        return { status: 'pass' };
      }
    }
    return {
      status: 'fail',
      message: 'No skip link, main landmark, or headings — keyboard users must Tab through the whole header/nav to reach anything.',
      fix: 'Add a skip link like <a href="#content">Skip to content</a>, wrap primary content in <main>, or structure the page with headings.',
    };
  },
};
