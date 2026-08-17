export default {
  id: 'empty-heading',
  name: 'Empty headings',
  impact: 'minor',
  tags: ['best-practice'],
  help: 'Headings must contain text',
  helpUrl: 'https://www.w3.org/WAI/tutorials/page-structure/headings/',
  selector: 'h1, h2, h3, h4, h5, h6, [role="heading"]',
  evaluate(element, { accessibleName }) {
    // A role override demotes the element — it isn't a heading any more.
    const role = element.getAttribute('role');
    if (role && role !== 'heading') return { status: 'pass' };
    if (accessibleName(element)) return { status: 'pass' };
    return {
      status: 'fail',
      message: 'This heading is empty — screen-reader users navigating by headings land on nothing.',
      fix: 'Add text to the heading, or remove the element if it is only used for spacing.',
    };
  },
};
