// WCAG SC 1.3.1 Info and Relationships (Level A) · SC 3.3.2 Labels or
// Instructions (Level A) · SC 4.1.2 Name, Role, Value (Level A)
// 3.3.2 mapping: a field with no label at all, or only a vanishing
// placeholder, is failure F82 — the classic 3.3.2 pattern.
export default {
  id: 'form-label',
  impact: 'critical',
  tags: ['wcag2a', 'wcag131', 'wcag332', 'wcag412'],
  help: 'Every form field needs a visible label',
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
    // Label content includes aria-labels on things inside it (icon-only
    // labels like <label><svg aria-label="Dark mode"/></label> still name)
    // and image alts (<label><img alt="…"></label> is a visible, named
    // label — alt text feeds name-from-contents per accname).
    const labelsText = visibleLabels
      .map((l) =>
        `${l.textContent} ${[...l.querySelectorAll('[aria-label], img[alt], area[alt]')]
          .map((e) => e.getAttribute('aria-label') ?? e.getAttribute('alt')).join(' ')}`)
      .join(' ')
      .trim();
    const ariaLabel = element.getAttribute('aria-label')?.trim();
    const labelledby = (element.getAttribute('aria-labelledby') ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .map((id) => element.getRootNode().getElementById?.(id)?.textContent ?? '')
      .join(' ')
      .trim();
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
      return {
        status: 'fail',
        message: 'This field has a <label>, but the label is empty — it announces nothing.',
        fix: 'Put visible text inside the label.',
      };
    }
    return {
      status: 'fail',
      message: 'This form field has no label — users cannot tell what to enter.',
      fix: `Add <label for="…">Field name</label> pointing at this field${id}.`,
    };
  },
};
