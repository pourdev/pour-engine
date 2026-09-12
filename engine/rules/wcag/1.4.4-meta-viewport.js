// WCAG SC 1.4.4 Resize Text (Level AA)
import { isEmbeddedDocument } from '../../lib/dom.js';

export default {
  id: 'meta-viewport',
  name: 'Viewport zoom lock',
  impact: 'critical',
  tags: ['wcag2aa', 'wcag144'],
  help: 'The viewport must let users zoom to at least 200%',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html',
  selector: 'meta[name="viewport"]',
  visibleOnly: false,
  evaluate(element) {
    // Browsers read the viewport meta of the TOP document only; one inside
    // an embedded frame is ignored wholesale, so it cannot stop anyone
    // zooming and must not be reported as if it did.
    if (isEmbeddedDocument(element.ownerDocument)) return { status: 'pass' };
    const content = element.getAttribute('content') ?? '';
    const disablesZoom = /user-scalable\s*=\s*(no|0)/i.test(content);
    const maxScale = content.match(/maximum-scale\s*=\s*([\d.]+)/i);
    const cappedZoom = maxScale && parseFloat(maxScale[1]) < 2;
    if (!disablesZoom && !cappedZoom) return { status: 'pass' };
    // Asserted the way ACT rule b4f0c3 asserts it, under its assumption that
    // the page provides no other way to enlarge the text (technique G178).
    // The message names that assumption so a reviewer who knows the page
    // has its own text-size control can dismiss the finding.
    // https://www.w3.org/WAI/standards-guidelines/act/rules/b4f0c3/
    return {
      status: 'fail',
      message: 'This viewport meta tag stops users zooming the page, so text cannot be enlarged with the browser. 1.4.4 is met only if the page provides its own control that enlarges all text to 200% (technique G178); this finding assumes it does not, since the tag cannot show it.',
      fix: 'Remove user-scalable=no and any maximum-scale below 2 from the viewport meta tag. If the page has its own text-size control that reaches 200%, record that and dismiss this finding.',
    };
  },
};
