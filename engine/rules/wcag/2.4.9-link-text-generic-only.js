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
import { createLinkPurposeRule } from './2.4.4-link-text-generic.js';

export default createLinkPurposeRule({
  id: 'link-text-generic-only',
  impact: 'moderate',
  tags: ['wcag2aaa', 'wcag249'],
  help: 'Link text alone must identify where the link goes (AAA)',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/link-purpose-link-only.html',
  verdict: (name) => ({
    status: 'fail',
    message: `“${name}” gives no purpose on its own. 2.4.9 asks that the link text alone identify where a link goes, without relying on the sentence or heading around it, so anyone reading the page's links as a list can tell them apart.`,
    fix: 'Name the destination in the link text, e.g. "Read more about the 2026 budget".',
  }),
});
