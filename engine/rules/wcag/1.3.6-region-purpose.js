// WCAG SC 1.3.6 Identify Purpose (Level AAA)
// "The purpose of user interface components, icons, and regions can be
// programmatically determined." Its sufficient technique for regions is
// ARIA11, landmarks; the purpose of components and icons has no DOM-visible
// technique at all (personalization semantics never shipped), so that half
// of the criterion stays with a person. What a page can show is the
// regions half: a document with no landmark whatsoever has identified the
// purpose of none of its regions. That is one question per page, asked
// once, and it never asserts, because the criterion lists other routes
// (microdata, other programmatic means) the DOM does not reveal.
//
// Pages that HAVE landmarks pass here; stray content outside them is the
// best-practice region rule's finding, which stays opt-in because A and AA
// never require landmarks. This rule is the AAA criterion's own question.
import { LANDMARK } from '../best-practice/region.js';

export default {
  id: 'region-purpose',
  name: 'Regions with a purpose',
  impact: 'moderate',
  tags: ['wcag21aaa', 'wcag136'],
  help: 'The purpose of page regions should be programmatically determinable (AAA)',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/identify-purpose.html',
  selector: 'html',
  visibleOnly: false,
  evaluate(element) {
    const doc = element.ownerDocument;
    if (doc.querySelector(LANDMARK)) return { status: 'pass' };
    return {
      status: 'incomplete',
      message: 'This page declares no landmark regions (no main, nav, header, footer, aside, search or labelled region), so the purpose of its regions is not exposed to assistive technology or personalisation tools. 1.3.6 (AAA) lists landmarks as the way to identify regions; the purpose of components and icons still needs a person to check.',
      fix: 'Wrap the page\'s regions in <main>, <nav>, <header>, <footer>, <aside> and labelled <section> elements (or the matching ARIA roles).',
    };
  },
};
