// WCAG SC 1.1.1 Non-text Content (Level A)
// <embed> is the last uncovered plugin-content element: img, svg, area,
// object and input[type=image] all have name rules, and a nameless <embed>
// is the same provable gap — assistive technology can tell users nothing
// about what the plugin renders.
//
// One honest asymmetry with object-alt: an embed that declares TEXT content
// (type="text/…") embeds a document, not non-text content, so 1.1.1's
// applicability is itself in question there. That case asks instead of
// asserting — the user still deserves to know what the embedded document
// is, but no criterion provably fails.
export default {
  id: 'embed-alt',
  name: 'Embed accessible name',
  impact: 'serious',
  tags: ['wcag2a', 'wcag111'],
  help: '<embed> needs an accessible name',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html',
  selector: 'embed',
  evaluate(element, { accessibleName }) {
    if (accessibleName(element)) return { status: 'pass' };
    const type = (element.getAttribute('type') ?? '').trim().toLowerCase();
    const src = (element.getAttribute('src') ?? '').split(/[?#]/)[0].toLowerCase();
    // Document formats: text/*, PDF, XHTML — and typeless embeds whose src
    // extension says document. All carry text, so 1.1.1's applicability is
    // the question, and the question goes to a human.
    const isDocument = type.startsWith('text/')
      || type === 'application/pdf' || type === 'application/xhtml+xml'
      || (!type && /\.(html?|xhtml|pdf|txt)$/.test(src));
    if (isDocument) {
      return {
        status: 'incomplete',
        message: 'This <embed> renders a text document but has no accessible name — assistive technology users get no indication of what the embedded document is. Check it is identified in the surrounding context.',
        fix: 'Add title="…" naming the embedded document.',
      };
    }
    return {
      status: 'fail',
      message: 'This <embed> has no accessible name — screen readers cannot tell users what the embedded content is.',
      fix: 'Add title="…" (or aria-label) describing what the embed shows.',
    };
  },
};
