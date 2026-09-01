// WCAG SC 1.1.1 Non-text Content (Level A)
// alt="" (exactly empty) is the CONFORMING decorative marker (H67) — it
// hides the image from screen readers on purpose and passes. A
// whitespace-only alt is neither a text alternative nor that marker by the
// letter of the spec, but the accessible name computes to empty and current
// screen readers skip the image as if it were alt="", and a single space
// was once a documented workaround for old JAWS reading the file name. Its
// authorship is ambiguous rather than a proven barrier, so since 2026-09-01
// it is flagged for eyes, not failed at critical alongside a missing alt.
// Filename/generic alts technically satisfy presence but tell the user
// nothing (F30/F39) — flagged for eyes.
const FILENAME_ALT = /\.(png|jpe?g|gif|webp|svg|avif|bmp|ico)([?#].*)?$/i;
const GENERIC_ALT = /^(image|img|photo|photograph|picture|graphic|icon|untitled|placeholder|spacer|\d+)$/i;

export default {
  id: 'image-alt',
  name: 'Image alt text',
  impact: 'critical',
  tags: ['wcag2a', 'wcag111'],
  help: 'Every <img> needs a text alternative',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html',
  selector: 'img',
  evaluate(element, { accessibleName }) {
    const role = element.getAttribute('role');
    if (role === 'presentation' || role === 'none') return { status: 'pass' };
    if (element.hasAttribute('alt')) {
      const alt = element.getAttribute('alt');
      // alt="" marks the image decorative — valid and deliberate.
      if (alt === '') return { status: 'pass' };
      if (!alt.trim()) {
        return {
          status: 'incomplete',
          message: `alt="${alt}" is only whitespace — not a description, and not the decorative marker either (that is alt="" with nothing between the quotes). Screen readers skip it today, so check the image is really decorative; if it carries meaning, describe it, and either way use alt="".`,
        };
      }
      const trimmed = alt.trim();
      if (FILENAME_ALT.test(trimmed) || GENERIC_ALT.test(trimmed)) {
        return {
          status: 'incomplete',
          message: `alt="${trimmed}" looks like a file name or placeholder, not a description — screen-reader users learn nothing from it. If the image carries meaning, describe it; if not, use alt="".`,
        };
      }
      return { status: 'pass' };
    }
    if (accessibleName(element)) return { status: 'pass' };
    return {
      status: 'fail',
      message: 'This image has no alt attribute, so screen readers announce its file name or nothing at all.',
      fix: `Describe the image: <img alt="…" src="${element.getAttribute('src') ?? ''}">, or mark it decorative with alt="".`,
    };
  },
};
