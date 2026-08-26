import { collectRoots } from '../../lib/dom.js';
import { level } from './heading-order.js';

// The outline is what the accessibility tree builds: it spans every open
// shadow root (a web-component shell whose only h1 renders in its shadow
// tree HAS an h1, exactly as landmark-one-main counts mains), and a
// heading's level is aria-level when set, else the tag's own digit, on any
// h1-h6 or role="heading". heading-order's level helper decides both rules,
// so <h2 aria-level="1"> starts the outline and <h1 aria-level="2"> does
// not (2026-08-25 overnight audit).
const HEADING = 'h1, h2, h3, h4, h5, h6, [role="heading"]';

export default {
  id: 'page-heading-one',
  name: 'Leading page heading',
  impact: 'moderate',
  tags: ['best-practice'],
  help: 'Every page should start its outline with an <h1>',
  helpUrl: 'https://www.w3.org/WAI/tutorials/page-structure/headings/',
  selector: 'html',
  visibleOnly: false,
  evaluate(element) {
    const hasLevelOne = collectRoots(element.ownerDocument)
      .some((root) => [...root.querySelectorAll(HEADING)].some((heading) => level(heading) === 1));
    if (hasLevelOne) return { status: 'pass' };
    return {
      status: 'fail',
      message: 'No <h1> — the page outline has no starting point for screen-reader navigation.',
      fix: 'Add one <h1> naming what the page is about.',
    };
  },
};
