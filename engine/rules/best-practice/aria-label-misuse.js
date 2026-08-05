// aria-label on a generic element (plain div/span/p) is PROHIBITED by ARIA
// 1.2 — the role doesn't support naming, so conforming assistive technology
// ignores the label. That makes it an authoring defect worth surfacing, but
// NOT a WCAG failure: a static text container is not a "user interface
// component", so no success criterion (4.1.2 included) actually fails.
// Best-practice scope is the honest home; demoted from WCAG scope after an
// independent audit found it dominating WCAG results on news/commerce pages.
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
  tags: ['best-practice'],
  help: 'aria-label on generic elements is ignored by assistive technology',
  helpUrl: 'https://www.w3.org/TR/using-aria/#practical-support-aria-label-aria-labelledby-and-aria-describedby',
  selector: 'div[aria-label]:not([role]):not([tabindex]), span[aria-label]:not([role]):not([tabindex]), p[aria-label]:not([role]):not([tabindex])',
  evaluate(element) {
    // Inside a name-from-content ancestor the label is NOT ignored: accname
    // applies the whole algorithm to each descendant while building the
    // ancestor's name, so this label becomes the button's or link's name.
    // Chromium reports exactly that. Claiming it does nothing is false, and
    // the advised fix would delete the control's only name.
    if (element.closest(NAME_FROM_CONTENT)) return { status: 'pass' };
    return {
      status: 'fail',
      message: `aria-label="${element.getAttribute('aria-label')}" on a plain <${element.tagName.toLowerCase()}> does nothing — screen readers only announce labels on interactive elements or landmarks.`,
      fix: 'Give the element a suitable role (or use a landmark/heading), or remove the aria-label.',
    };
  },
};
