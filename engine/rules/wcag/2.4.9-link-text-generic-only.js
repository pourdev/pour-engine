// WCAG SC 2.4.9 Link Purpose (Link Only) (Level AAA)
//
// Same phrase list and same name computation as 2.4.4's rule, at the AAA
// threshold: the link text ALONE has to identify the purpose, and context
// is not allowed to make up the difference.
//
// This one asserts where the AA rule reviews. The criterion's only escape is
// links "where the purpose of the link would be ambiguous to users in
// general", and a link named nothing but "Read more" is ambiguous to
// everyone — which is the exception failing to apply rather than rescuing
// it. Nothing about the surrounding page can change that reading, so there
// is nothing here for a human to settle.
//
// Two matches stay in the review lane because the failure is not provable
// (2026-08-25 corpus adjudication):
//   · a name wrapped in a paired bracket or quote — "<details>" is a code
//     term that names its destination exactly (one-sided decoration like
//     python.org's CSS-generated ">>>More" prompt still asserts);
//   · a name that is exactly "go" — every corpus hit was a brand logo
//     ("Go" is the language's name), and a brand name identifies the link.
//
// A third, beside "go" (2026-08-25 overnight audit): the French entries
// "plus" and "suite" are ordinary English words and, more to the point,
// common English plan and product names (a "Plus" tier, a "Suite"). A
// pricing link named "Plus" identifies its destination the way the Go logo
// does, so outside a page declared French they review rather than assert.
// On a link whose closest lang is French the generic reading ("more",
// "continued") is the only one and the assertion stands.
import { createLinkPurposeRule } from './2.4.4-link-text-generic.js';

const FRENCH_ONLY_ENGLISH_NAMES = new Set(['plus', 'suite']);
const FRENCH = /^fr(-|$)/i;

function mayBeBrandName(normalized, lang) {
  if (normalized === 'go') return true;
  return FRENCH_ONLY_ENGLISH_NAMES.has(normalized) && !FRENCH.test(lang);
}

export default createLinkPurposeRule({
  id: 'link-text-generic-only',
  name: 'Self-sufficient link text',
  impact: 'moderate',
  tags: ['wcag2aaa', 'wcag249'],
  help: 'Link text alone must identify where the link goes (AAA)',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/link-purpose-link-only.html',
  verdict: (name, { provable, normalized, lang }) => {
    if (!provable || mayBeBrandName(normalized, lang)) return {
      status: 'incomplete',
      message: `“${name}” matches a generic link phrase, but may identify its destination anyway: a code term keeps its meaning through the punctuation this comparison drops, and a brand or product name (a logo link named “Go”, a plan named “Plus”) is the destination. Check whether this name, read alone in a list of the page's links, says where it goes.`,
      fix: 'If the name really is generic here, put the destination in the link text, e.g. "Read more about the 2026 budget".',
    };
    return {
      status: 'fail',
      message: `“${name}” gives no purpose on its own. 2.4.9 asks that the link text alone identify where a link goes, without relying on the sentence or heading around it, so anyone reading the page's links as a list can tell them apart.`,
      fix: 'Name the destination in the link text, e.g. "Read more about the 2026 budget".',
    };
  },
});
