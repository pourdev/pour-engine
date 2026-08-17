// WCAG SC 1.3.1 Info and Relationships (Level A)
export default {
  id: 'p-as-heading',
  name: 'Styled text as heading',
  impact: 'serious',
  tags: ['wcag2a', 'wcag131'],
  help: 'Bold paragraphs should not stand in for headings',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html',
  selector: 'p',
  evaluate(element) {
    const text = element.textContent.trim();
    const only = element.children.length === 1 && element.children[0];
    const looksLikeHeading =
      text && text.length < 60 &&
      only && only.matches('b, strong') && only.textContent.trim() === text &&
      element.nextElementSibling?.matches('p');
    if (!looksLikeHeading) return { status: 'pass' };
    // A heuristic, not proof — bold lead-ins are a legitimate style, so this
    // asks for review instead of asserting a violation.
    return {
      status: 'incomplete',
      message: `"${text}" is a short bold paragraph followed by text — if it's acting as a heading, it's invisible to heading navigation. Verify.`,
      fix: 'If it is a heading, use a real heading element (<h2>…</h2>) at the appropriate level.',
    };
  },
};
