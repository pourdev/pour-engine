// WCAG SC 4.1.2 Name, Role, Value (Level A)
// <summary> is the interactive disclosure control of <details> — focusable,
// activatable, exposed to AT as a button-like widget — and button-name's
// selector never reaches it. An icon-only summary (chevron glyph, no text,
// no label) announces as an unnamed control.
//
// Only the FIRST summary child of a <details> is the control: the HTML spec
// gives any further summary elements, and summaries outside <details>, no
// special behaviour — they are plain content and owe no name. A <details>
// with no summary at all also passes: the browser supplies its own default
// label ("Details").
export default {
  id: 'summary-name',
  name: 'Disclosure names',
  impact: 'serious',
  tags: ['wcag2a', 'wcag412'],
  help: 'Disclosure controls (<summary>) need an accessible name',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html',
  selector: 'summary',
  evaluate(element, { accessibleName }) {
    const details = element.parentElement;
    const isControl = details?.tagName === 'DETAILS'
      && details.querySelector(':scope > summary') === element;
    if (!isControl) return { status: 'pass' };
    if (accessibleName(element)) return { status: 'pass' };
    return {
      status: 'fail',
      message: 'This disclosure control has no accessible name — a screen reader announces an unnamed button, and users cannot tell what it expands.',
      fix: 'Put text inside the <summary>, or add aria-label="…" for icon-only disclosures.',
    };
  },
};
