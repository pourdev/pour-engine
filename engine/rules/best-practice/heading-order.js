const level = (el) =>
  el.hasAttribute('aria-level')
    ? parseInt(el.getAttribute('aria-level'), 10)
    : parseInt(el.tagName[1], 10) || 2; // role="heading" without aria-level defaults to 2

export default {
  id: 'heading-order',
  impact: 'moderate',
  tags: ['best-practice'],
  help: 'Headings should step down one level at a time',
  helpUrl: 'https://www.w3.org/WAI/tutorials/page-structure/headings/',
  selector: 'h1, h2, h3, h4, h5, h6, [role="heading"]',
  // Needs the whole page: each heading is judged against the previous one.
  evaluateAll(elements) {
    let previous = 0;
    return elements.map((element) => {
      const current = level(element);
      const skipped = previous > 0 && current > previous + 1;
      const outcome = skipped
        ? {
            status: 'fail',
            message: `Heading level jumps from h${previous} to h${current}, which breaks the page outline for screen-reader navigation.`,
            fix: `Use <h${previous + 1}> here, or restructure so levels increase one at a time.`,
          }
        : { status: 'pass' };
      previous = current;
      return outcome;
    });
  },
};
