export default {
  id: 'redundant-image-alt',
  name: 'Redundant image alt',
  impact: 'minor',
  tags: ['best-practice'],
  help: 'Image alt should not repeat adjacent link or button text',
  helpUrl: 'https://www.w3.org/WAI/tutorials/images/functional/',
  selector: 'a[href] img[alt], button img[alt]',
  evaluate(element) {
    const alt = element.getAttribute('alt').replace(/\s+/g, ' ').trim().toLowerCase();
    if (!alt) return { status: 'pass' };
    const container = element.closest('a[href], button');
    const text = container.textContent.replace(/\s+/g, ' ').trim().toLowerCase();
    if (alt !== text) return { status: 'pass' };
    return {
      status: 'fail',
      message: `The image alt repeats the ${container.tagName === 'A' ? 'link' : 'button'} text — screen readers announce "${element.getAttribute('alt')}" twice.`,
      fix: 'Use alt="" on the image; the visible text already names the control.',
    };
  },
};
