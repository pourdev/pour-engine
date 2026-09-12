// WCAG SC 2.4.9 Link Purpose (Link Only) (Level AAA)
//
// Same phrase list and same name computation as 2.4.4's rule, at the AAA
// threshold: the link text ALONE has to identify the purpose, and context
// is not allowed to make up the difference.
//
// The criterion allows a mechanism that expands link names. F84 requires
// checking that no such mechanism exists, which a name-only snapshot cannot
// prove. Semantic ambiguity and alternative presentation remain review.
//
// The review wording distinguishes recognizable proper-name ambiguities
// (Go, Plus, Suite and quoted code terms) from ordinary generic phrases.
// Neither branch treats a phrase-list match as semantic proof.
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
      status: 'incomplete',
      message: `“${name}” appears generic when read alone. Check whether it identifies the destination in this context or whether a mechanism makes the link text descriptive. 2.4.9 permits such a mechanism; the initial link name alone cannot establish a failure.`,
      fix: 'Name the destination in the link text, e.g. "Read more about the 2026 budget".',
    };
  },
});
