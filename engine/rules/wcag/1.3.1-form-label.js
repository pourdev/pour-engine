// WCAG SC 1.3.1 Info and Relationships (Level A) · SC 3.3.2 Labels or
// Instructions (Level A) · SC 4.1.2 Name, Role, Value (Level A)
// 3.3.2 mapping: a field with no label at all, or only a vanishing
// placeholder, is failure F82 — the classic 3.3.2 pattern.
import { labelledByName } from '../../lib/accessible-name.js';

export default {
  id: 'form-label',
  name: 'Form field labels',
  impact: 'critical',
  tags: ['wcag2a', 'wcag131', 'wcag332', 'wcag412'],
  help: 'Every form field needs a label',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html',
  selector:
    'input:not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="image"]), select, textarea',
  evaluate(element) {
    // Only perceivable labels count: a display:none / aria-hidden label
    // technically feeds the accessible name, but nobody can see it and
    // that defeats the point of a label.
    const visibleLabels = [...(element.labels ?? [])].filter((label) => {
      if (label.closest('[aria-hidden="true"]')) return false;
      const style = getComputedStyle(label);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
    // A label's contribution is its ACCESSIBLE text, not its raw textContent:
    // aria-hidden subtrees inside the label are excluded from the name
    // computation (a custom radio whose only visible text sits in an
    // aria-hidden styled twin names NOTHING — the browser's tree computes an
    // empty name), while aria-label on the label itself or on things inside
    // it (icon-only labels) and image alts DO feed the name per accname.
    //
    // An UNRENDERED descendant is excluded the same way: accname step 2A
    // returns the empty string for a hidden node that is not the root of
    // the label traversal, and hidden covers display:none and
    // visibility:hidden (the hidden attribute is display:none). A label
    // whose only text sits in a display:none span names nothing (Chromium
    // computes ""), the mirror of the aria-hidden twin above (2026-08-25
    // overnight audit). Computed style rather than checkVisibility: an SVG
    // <title> has no box yet still names its graphic.
    const accessibleText = (node) => {
      if (node.nodeType === Node.TEXT_NODE) return node.textContent;
      if (node.nodeType !== Node.ELEMENT_NODE) return '';
      if (node.getAttribute('aria-hidden') === 'true') return '';
      const nodeStyle = getComputedStyle(node);
      if (nodeStyle.display === 'none' || nodeStyle.visibility === 'hidden') return '';
      const aria = node.getAttribute('aria-label');
      if (aria?.trim()) return aria;
      const alt = (node.tagName === 'IMG' || node.tagName === 'AREA') ? node.getAttribute('alt') : null;
      if (alt?.trim()) return alt;
      return [...node.childNodes].map(accessibleText).join(' ');
    };
    const labelsText = visibleLabels.map(accessibleText).join(' ').trim();
    const ariaLabel = element.getAttribute('aria-label')?.trim();
    const labelledby = labelledByName(element);
    if (labelsText || ariaLabel || labelledby) return { status: 'pass' };

    const id = element.id ? ` (it already has id="${element.id}")` : ' (give it an id first)';

    // A title name is published sufficient technique H65 — conformant, but
    // invisible until hover and ignored by some tools, so it's flagged for
    // eyes rather than failed. A placeholder alongside it is an example
    // value, not a competing label: the title still names the field, so this
    // check comes first and does not care whether one is present.
    if (element.getAttribute('title')?.trim()) {
      return {
        status: 'incomplete',
        message: 'This field is named only by its title attribute (technique H65) — conformant, but the label is invisible until hover and some tools skip it. Check a visible label isn’t needed here.',
      };
    }
    // A placeholder-only "label" vanishes as soon as the user types (F82
    // territory) — that one stays a failure.
    if (element.getAttribute('placeholder')) {
      return {
        status: 'fail',
        message: 'This field relies on its placeholder as the only label — the name vanishes as soon as the user types.',
        fix: `Add <label for="…">Field name</label> pointing at this field${id}; keep the placeholder as an example value only.`,
      };
    }
    if (element.labels?.length && !visibleLabels.length) {
      // aria-hidden has no visual effect: a label hidden ONLY that way is
      // still painted for sighted users and lost only to assistive
      // technology (Chromium computes an empty name). Telling the author
      // to "make the label visible" sent them to fix the wrong thing; the
      // fix is to remove aria-hidden (2026-08-25 overnight audit).
      const onlyAriaHidden = [...element.labels].some((label) => {
        const style = getComputedStyle(label);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });
      if (onlyAriaHidden) {
        return {
          status: 'fail',
          message: 'This field\'s only <label> is inside aria-hidden="true": sighted users still see it, but it is removed from the accessibility tree, so the field has no accessible name.',
          fix: 'Remove aria-hidden from the label (or from the ancestor that hides it). If the label must stay hidden from assistive technology, name the field another way with aria-label or aria-labelledby.',
        };
      }
      return {
        status: 'fail',
        message: 'This field\'s only <label> is hidden (display:none or visibility:hidden), so no one can see or rely on it.',
        fix: 'Make the label visible, or use a visually-hidden-but-rendered technique (clip/sr-only) if it must not show.',
      };
    }
    if (element.labels?.length) {
      // The label may LOOK fine while announcing nothing: all its text
      // sitting inside an aria-hidden subtree (the styled-twin custom
      // control pattern) is excluded from the name computation.
      const looksLabelled = visibleLabels.some((l) => l.textContent.trim());
      const ariaHiddenText = visibleLabels.some((l) =>
        [...l.querySelectorAll('[aria-hidden="true"]')].some((twin) => twin.textContent.trim()));
      if (looksLabelled && !ariaHiddenText) {
        // The text is there in the markup but nothing renders it (defect
        // 8's shape): the sighted user sees an empty label too.
        return {
          status: 'fail',
          message: 'This field\'s <label> holds text, but all of it is inside unrendered content (display:none or visibility:hidden), so the accessible name computes to nothing and nobody sees a label.',
          fix: 'Render the text inside the label, move it out of the hidden element, or add aria-label to the field.',
        };
      }
      return {
        status: 'fail',
        message: looksLabelled
          ? 'This field\'s <label> shows text, but all of it is inside aria-hidden content — the accessible name computes to nothing.'
          : 'This field has a <label>, but the label is empty — it announces nothing.',
        fix: looksLabelled
          ? 'Move the visible text out of the aria-hidden wrapper, or add aria-label to the field.'
          : 'Put visible text inside the label.',
      };
    }
    // A label points at this id, but the id is shared: for binds to the
    // FIRST element with it, so this later twin has no label and no name
    // even though a label sits beside it (hsbc.com download basket, two
    // rows reusing one document id, 2026-09-01). The fix is a unique id,
    // not another label.
    if (element.id) {
      const root = element.getRootNode();
      const pointed = root.querySelector?.(`label[for="${CSS.escape(element.id)}"]`);
      const first = root.getElementById?.(element.id);
      if (pointed && first && first !== element) {
        return {
          status: 'fail',
          message: `A <label for="${element.id}"> exists, but an earlier element on the page has the same id, so the label belongs to that one and this field has no label at all.`,
          fix: `Give this field a unique id and point its label at that; ids must not repeat on a page.`,
        };
      }
    }
    return {
      status: 'fail',
      message: 'This form field has no label — users cannot tell what to enter.',
      fix: `Add <label for="…">Field name</label> pointing at this field${id}.`,
    };
  },
};
