// WCAG SC 2.4.4 Link Purpose (In Context) (Level A)
//     · SC 2.4.9 Link Purpose (Link Only) (Level AAA)
//
// A link named "Read more" carries no purpose in its name. Screen reader
// users routinely pull up a list of every link on a page and navigate from
// it, and nine identical "Read more" entries in that list are worthless —
// the technique WCAG names for this is F63, and G91 is the fix.
//
// The two criteria differ in exactly one way, and it decides the verdict:
//
//   2.4.4 (A)   purpose may come from CONTEXT — the sentence around the
//               link, its list item, its table cell, the heading of the card
//               it sits in. A "Read more" under a headline naming the
//               article is a judgment call about whether that context really
//               reaches the user, so this REVIEWS. It never asserts.
//   2.4.9 (AAA) purpose must come from the link text ALONE, with the only
//               exception being links whose purpose "would be ambiguous to
//               users in general". A link named nothing but "Read more" is
//               ambiguous to everyone, which is the exception failing to
//               apply rather than saving it, so this FAILS.
//
// Judged on the ACCESSIBLE NAME, not the text content: a link written as
// <a href="…" aria-label="Read more about the budget">Read more</a> is
// already fixed, and must not be flagged. That also means an aria-label
// which is itself generic is caught, which is the more common mistake.
//
// The list grows one language at a time, and only with a speaker of that
// language checking every entry — a wrong entry would fail correct links.
// English and French are covered; pages in other languages get no findings
// here rather than bad ones. Entries are stored in NORMALIZED form (see
// normalizeName below): apostrophes become spaces, so "plus d informations"
// is how "plus d'informations" — straight or typographic — must be listed.

const GENERIC = new Set([
  // English
  'read more', 'read more about this', 'more', 'much more', 'learn more',
  'click here', 'click', 'click this', 'tap here', 'press here',
  'here', 'this', 'this link', 'link', 'this page', 'go', 'go here',
  'more info', 'more information', 'further information',
  'see more', 'view more', 'show more', 'find out more', 'discover more',
  'continue', 'continue reading', 'keep reading', 'full story', 'full article',
  'details', 'see details', 'view details', 'more details',
  // French — contributed and checked by a native speaker
  'en savoir plus', 'savoir plus', 'lire la suite', 'lire plus', 'plus',
  'cliquez ici', 'cliquer ici', 'clique ici', 'ici', 'ce lien', 'lien',
  'cette page', 'voir plus', 'en voir plus', 'afficher plus', 'afficher',
  'voir', 'voir le détail', 'voir les détails', 'plus de détails',
  'plus d informations', 'plus d infos',
  'en savoir davantage', 'découvrir', 'découvrez', 'continuer', 'suite',
]);

/** Lowercased, punctuation and arrows dropped, spaces collapsed, so
 *  "Read more →", "Click here!" and "READ  MORE" all compare equal. */
export function normalizeName(name) {
  return name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/\s+/g, ' ').trim();
}

export function createLinkPurposeRule({ id, impact, tags, help, helpUrl, verdict }) {
  return {
    id,
    impact,
    tags,
    help,
    helpUrl,
    // role="link" claims the link role explicitly; an <a> without href has no
    // link role at all and is correctly out of scope. Links with NO name are
    // link-name's finding, not this one.
    selector: 'a[href], [role="link"]',
    evaluate(element, { accessibleName }) {
      const name = accessibleName(element);
      if (!name) return { status: 'pass' }; // nameless: link-name reports it
      const normalized = normalizeName(name);
      if (!GENERIC.has(normalized)) return { status: 'pass' };
      return verdict(name);
    },
  };
}

export default createLinkPurposeRule({
  id: 'link-text-generic',
  impact: 'moderate',
  tags: ['wcag2a', 'wcag244'],
  help: 'Link text should describe where the link goes',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/link-purpose-in-context.html',
  verdict: (name) => ({
    status: 'incomplete',
    message: `“${name}” does not say where this link goes. 2.4.4 lets the surrounding text supply that, so this passes only if the context a screen reader reaches — the same sentence, list item, table cell, or the heading of the card it sits in — makes the destination obvious. Check it does, and remember that anyone navigating by a list of the page's links sees this name on its own.`,
    fix: 'Put the destination in the link text itself, e.g. "Read more about the 2026 budget", or extend the name with aria-label while keeping the visible words at the start of it.',
  }),
});
