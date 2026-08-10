// WCAG SC 1.1.1 Non-text Content (Level A)
// A roleless <canvas> with no name and no fallback content is the default
// output of every chart library, and it reaches assistive technology as
// nothing at all. Whether that is a failure is exactly the question the
// roleless-<svg> branch of svg-img-alt already models: a WebGL backdrop is
// decorative, a revenue chart is the content of the page, and no static
// pass can tell them apart. Same shape, same verdict — review, with the
// same escape hatches (fallback content, a named enclosing control, or an
// explicit decorative/labelled role).
//
// <canvas role="img"> without a name is already a hard fail via
// svg-img-alt's [role="img"] arm; this rule only owns the silent default.
// A size floor keeps sparkline-and-effect noise out: tiny canvases are
// bullets and flourishes, and flagging them all would bury the chart that
// matters.
export default {
  id: 'canvas-alt',
  impact: 'moderate',
  tags: ['wcag2a', 'wcag111'],
  help: 'Meaningful <canvas> graphics need an accessible name or fallback',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html',
  selector: 'canvas:not([role])',
  evaluate(element, { accessibleName }) {
    if (accessibleName(element)) return { status: 'pass' };
    // Fallback content inside <canvas> is what AT reads — but chart
    // libraries put their bootstrap <script> inside the canvas too, and
    // script text is not fallback anyone hears.
    const fallback = [...element.childNodes]
      .filter((node) => !/^(SCRIPT|STYLE|TEMPLATE)$/.test(node.nodeName))
      .map((node) => node.textContent).join('').trim();
    if (fallback) return { status: 'pass' };
    // Icon-work inside a control the name already covers.
    const control = element.closest('a[href], button, [role="button"], [role="link"]');
    if (control && accessibleName(control)) return { status: 'pass' };
    const rect = element.getBoundingClientRect();
    if (rect.width < 32 || rect.height < 32) return { status: 'pass' };
    return {
      status: 'incomplete',
      message: 'This canvas has no accessible name, no fallback content, and is not marked decorative — if it draws a chart or diagram, screen reader users get nothing at all.',
      fix: 'If decorative, add aria-hidden="true". If meaningful, add role="img" with aria-label="…", or put a text alternative inside the <canvas> as fallback content.',
    };
  },
};
