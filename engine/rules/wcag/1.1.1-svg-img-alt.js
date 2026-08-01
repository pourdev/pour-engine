// WCAG SC 1.1.1 Non-text Content (Level A)
export default {
  id: 'svg-img-alt',
  impact: 'serious',
  tags: ['wcag2a', 'wcag111'],
  help: 'Inline SVG and role="img" graphics need an accessible name',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html',
  // <img> itself is handled by image-alt; this covers SVG (with or without a
  // role) and role="img" divs/spans. Top-level plain <svg> is included
  // because browsers expose it to AT as a graphic even without a role.
  selector: 'svg[role="img"], svg[role="graphics-document"], svg[role="graphics-symbol"], [role="img"]:not(img):not(svg), svg:not([role])',
  evaluate(element, { accessibleName }) {
    if (accessibleName(element)) return { status: 'pass' };
    if (!element.getAttribute('role') && element.tagName.toLowerCase() === 'svg') {
      if (element.parentNode instanceof SVGElement) return { status: 'pass' }; // nested svg: part of the outer graphic
      // Inside a control that already has a name, the svg is effectively
      // decorative icon-work — the name covers it.
      const control = element.closest('a[href], button, [role="button"], [role="link"]');
      if (control && accessibleName(control)) return { status: 'pass' };
      // Unlabeled and roleless: AT behaviour varies, and we can't tell
      // meaningful from decorative — a human call, not an automatic fail.
      return {
        status: 'incomplete',
        message: 'This SVG has no accessible name and is not marked decorative — some screen readers announce it as an unlabeled graphic.',
        fix: 'Add aria-hidden="true" if decorative; if meaningful, add role="img" and aria-label="…" (or a <title> as the first child).',
      };
    }
    return {
      status: 'fail',
      message: 'This element is marked as an image but has no accessible name.',
      fix: 'Add aria-label="…" (for SVG, a <title> as the first child also works).',
    };
  },
};
