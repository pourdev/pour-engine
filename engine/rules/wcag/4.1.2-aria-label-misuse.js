// ARIA 1.2 §5.2.8.6 ("Roles which cannot be named"): for generic, "the
// element does not support name from author. Authors MUST NOT use the
// aria-label or aria-labelledby attributes to name the element." A label on
// a plain div/span/p breaks that MUST, so it is a real, provable authoring
// error — and browsers respond by dropping the prohibited name, which is
// exactly what makes the WCAG verdict undecidable from the DOM.
//
// It is not, on its own, a 4.1.2 failure. A static text container is not a
// "user interface component", and the dropped name leaves whatever name,
// role and value the element legitimately has untouched. Nothing is
// announced wrongly; nothing the criterion requires is provably absent.
//
// What CAN fail is the thing underneath: if the author reached for a label
// because assistive technology genuinely should announce this element — a
// hand-rolled widget missing its role, a region missing its landmark — then
// the name they wrote is invisible and the missing role is the defect.
// Whether that is so is exactly what the DOM cannot establish.
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

export default {
  id: 'aria-label-misuse',
  impact: 'moderate',
  tags: ['wcag2a', 'wcag412'],
  help: 'aria-label on a generic element is dropped by the browser',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html',
  selector: 'div[aria-label]:not([role]):not([tabindex]), span[aria-label]:not([role]):not([tabindex]), p[aria-label]:not([role]):not([tabindex])',
  evaluate(element) {
    // Inside a name-from-content ancestor the label is NOT ignored: accname
    // applies the whole algorithm to each descendant while building the
    // ancestor's name, so this label becomes the button's or link's name.
    // Chromium reports exactly that. Claiming it does nothing is false, and
    // the advised fix would delete the control's only name.
    if (element.closest(NAME_FROM_CONTENT)) return { status: 'pass' };
    return {
      status: 'incomplete',
      message: `aria-label="${element.getAttribute('aria-label')}" on a plain <${element.tagName.toLowerCase()}> is prohibited by ARIA and dropped by the browser, so assistive technology never sees it. Nothing is announced wrongly, but nothing is announced at all. Should this element be announced? If it plays a role worth naming — a widget, a region, a group — the missing role is the defect and this is a 4.1.2 failure. If it is just a styled container, the attribute is stray and no one is affected.`,
      fix: 'If the element should be announced, give it the role it is playing (a landmark, group, or widget role) so the name is legal and exposed. If it should not, remove the aria-label. Do not add a role solely to legalise the label.',
    };
  },
};
