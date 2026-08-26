// WCAG SC 1.1.1 Non-text Content (Level A)
// An <object> that declares a TEXT document (type="text/…", PDF, XHTML, or
// a typeless data URL whose extension says document) embeds text, not
// non-text content, so 1.1.1's applicability is itself in question there.
// That case asks instead of asserting, the same gate embed-alt applies to
// its sibling element (2026-08-25 overnight audit closed the asymmetry).
export default {
  id: 'object-alt',
  name: 'Object alt text',
  impact: 'serious',
  tags: ['wcag2a', 'wcag111'],
  help: '<object> embeds must have a text alternative',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html',
  selector: 'object',
  evaluate(element, { accessibleName }) {
    if (accessibleName(element) || element.textContent.trim()) return { status: 'pass' };
    const type = (element.getAttribute('type') ?? '').trim().toLowerCase();
    const data = (element.getAttribute('data') ?? '').split(/[?#]/)[0].toLowerCase();
    const isDocument = type.startsWith('text/')
      || type === 'application/pdf' || type === 'application/xhtml+xml'
      || (!type && /\.(html?|xhtml|pdf|txt)$/.test(data));
    if (isDocument) {
      return {
        status: 'incomplete',
        message: 'This embedded object renders a text document but has no accessible name, so assistive technology users get no indication of what the embedded document is. Check it is identified in the surrounding context.',
        fix: 'Add aria-label="…" naming the embedded document, or fallback content inside the <object> element.',
      };
    }
    return {
      status: 'fail',
      message: 'This embedded object has no text alternative — users who can’t see it get nothing.',
      fix: 'Add aria-label="…", or fallback content inside the <object> element.',
    };
  },
};
