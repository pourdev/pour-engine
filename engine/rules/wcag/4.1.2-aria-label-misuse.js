// ARIA 1.2 §5.2.8.6 ("Roles which cannot be named"): for generic, "the
// element does not support name from author. Authors MUST NOT use the
// aria-label or aria-labelledby attributes to name the element." A label on
// a plain div/span/p breaks that MUST, so it is a real, provable authoring
// error.
//
// What browsers DO with the prohibited name was measured, not assumed
// (2026-08-09, Chromium accessibility tree + VoiceOver on a live product
// page): both expose aria-label on paragraph/generic/strong as the
// element's accessible name, and VoiceOver announces it. So the label is
// NOT reliably dropped — the earlier wording here claimed it was, and a
// user who tested with a screen reader rightly called it misleading. But
// prohibited means unguaranteed: exposure of a name the spec forbids is
// browser goodwill, varies across AT pairings, and may change without
// notice. A page can neither rely on the label being announced nor on it
// being ignored — which cuts in both directions and is exactly what makes
// the WCAG verdict undecidable from the DOM.
//
// It is not, on its own, a 4.1.2 failure. A static text container is not a
// "user interface component", and whatever name, role and value the element
// legitimately has stays untouched. Where the label IS announced, it
// replaces the element's visible text for AT users (sometimes deliberately:
// a price written for the ear over a struck-through visual price); where it
// is ignored, users get the visible text alone. The human question is
// whether either presentation is wrong for this element.
//
// This rule has lived on both sides of the line. It asserted under WCAG
// scope originally, was demoted to best-practice when an independent audit
// found its volume dominating WCAG results on news/commerce pages, and the
// demotion buried it: teams act on what a default audit shows, so a real
// ARIA MUST violation went unseen. Asking is the third option (the same
// route aria-allowed-attr took): it runs in the default scope, lands in
// needs-review rather than violations, and hands the human the one question
// that decides it.
/** Roles whose accessible name is built from their contents, so a label on
 *  anything inside them contributes to that name rather than being dropped. */
const NAME_FROM_CONTENT = 'a[href], button, summary, h1, h2, h3, h4, h5, h6, th, td,'
  + ' [role="button"], [role="link"], [role="menuitem"], [role="menuitemcheckbox"],'
  + ' [role="menuitemradio"], [role="option"], [role="tab"], [role="treeitem"],'
  + ' [role="checkbox"], [role="radio"], [role="switch"], [role="heading"],'
  + ' [role="cell"], [role="gridcell"], [role="columnheader"], [role="rowheader"], [role="tooltip"]';

// ARIA 1.2's ten roles that prohibit naming, and the HTML elements that
// carry them implicitly (HTML-AAM); verify:aria-tables diffs the set
// against the spec. The rule started with div, span and p alone
// (generic and paragraph); the other eight, explicit or as strong, em,
// code, del, s, ins, sub and sup, joined 2026-09-01.
export const NAME_PROHIBITED_ROLES = ['caption', 'code', 'deletion', 'emphasis', 'generic', 'insertion', 'paragraph', 'strong', 'subscript', 'superscript'];
const IMPLICITLY_PROHIBITED = ['div', 'span', 'p', 'strong', 'em', 'code', 'del', 's', 'ins', 'sub', 'sup'];
const SELECTOR = ['aria-label', 'aria-labelledby'].flatMap((attr) => [
  ...IMPLICITLY_PROHIBITED.map((tag) => `${tag}[${attr}]:not([role]):not([tabindex])`),
  ...NAME_PROHIBITED_ROLES.map((role) => `[role="${role}"][${attr}]:not([tabindex])`),
]).join(', ');

export default {
  id: 'aria-label-misuse',
  name: 'aria-label placement',
  impact: 'moderate',
  tags: ['wcag2a', 'wcag412'],
  help: 'aria-label or aria-labelledby on a plain container is prohibited by ARIA, so its announcement is not guaranteed',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html',
  // §5.2.8.6 prohibits BOTH naming attributes on generic — aria-labelledby
  // pointing at perfectly real text is the same authoring error as an inline
  // aria-label, and the more tempting one (a card labelled by its own title).
  selector: SELECTOR,
  evaluate(element) {
    // Inside a name-from-content ancestor the label is NOT ignored: accname
    // applies the whole algorithm to each descendant while building the
    // ancestor's name, so this label becomes the button's or link's name.
    // Chromium reports exactly that. Claiming it does nothing is false, and
    // the advised fix would delete the control's only name.
    if (element.closest(NAME_FROM_CONTENT)) return { status: 'pass' };
    const label = element.getAttribute('aria-label');
    const attempt = label !== null
      ? `aria-label="${label}"`
      : (() => {
          const text = (element.getAttribute('aria-labelledby') ?? '').trim().split(/\s+/)
            .map((id) => element.ownerDocument.getElementById(id)?.textContent?.trim())
            .filter(Boolean).join(' ');
          return text
            ? `aria-labelledby (naming it "${text.slice(0, 80)}")`
            : 'aria-labelledby (whose references resolve to no text)';
        })();
    return {
      status: 'incomplete',
      message: `${attempt} on ${element.hasAttribute('role') ? `role="${element.getAttribute('role').trim()}"` : `a plain <${element.tagName.toLowerCase()}>`} is prohibited by ARIA: this element's role does not support naming, so although many browser and screen reader pairings announce the label today, that support is not guaranteed anywhere and can differ between assistive technologies. Where it is announced it replaces the element's visible text; where it is not, users get the visible text alone. Check both presentations read correctly, and that nothing here relies on the label being heard. Prohibited markup is not by itself a WCAG failure: the criterion that policed validity, 4.1.1 Parsing, was removed in WCAG 2.2 (w3.org/WAI/WCAG22/Understanding/parsing.html), so what decides this is what users actually hear.`,
      fix: 'If this element must reliably announce something of its own, give it the role it is playing (a landmark, group, or widget role) so the name is legal and exposure is guaranteed — or move the spoken text into visible or visually-hidden real text. If the label is stray, remove it. Do not add a role solely to legalise the label.',
    };
  },
};
