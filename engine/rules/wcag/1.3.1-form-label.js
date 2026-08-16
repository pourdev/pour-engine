// WCAG SC 1.3.1 Info and Relationships (Level A) · SC 3.3.2 Labels or
// Instructions (Level A) · SC 4.1.2 Name, Role, Value (Level A)
// 3.3.2 mapping: a field with no label at all, or only a vanishing
// placeholder, is failure F82 — the classic 3.3.2 pattern.
import { labelledByName } from '../../lib/accessible-name.js';

export default {
  id: 'form-label',
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
    const accessibleText = (node) => {
      if (node.nodeType === Node.TEXT_NODE) return node.textContent;
      if (node.nodeType !== Node.ELEMENT_NODE) return '';
      if (node.getAttribute('aria-hidden') === 'true') return '';
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
      return {
        status: 'fail',
        message: 'This field\'s only <label> is hidden (display:none or aria-hidden) — no one can see or rely on it.',
        fix: 'Make the label visible, or use a visually-hidden-but-rendered technique (clip/sr-only) if it must not show.',
      };
    }
    if (element.labels?.length) {
      // The label may LOOK fine while announcing nothing: all its text
      // sitting inside an aria-hidden subtree (the styled-twin custom
      // control pattern) is excluded from the name computation.
      const looksLabelled = visibleLabels.some((l) => l.textContent.trim());
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
    return {
      status: 'fail',
      message: 'This form field has no label — users cannot tell what to enter.',
      fix: `Add <label for="…">Field name</label> pointing at this field${id}.`,
    };
  },
};
