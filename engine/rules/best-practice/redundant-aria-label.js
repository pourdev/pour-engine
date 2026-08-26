import { effectiveRole } from '../../lib/roles.js';

// "Redundant" only means anything for a role that takes its name FROM its
// contents. A landmark is never named by the text inside it, and neither is
// a select (its text is the option list), so an aria-label that happens to
// match that text is the element's ONLY name. Removing it, as this rule
// advises, leaves the element anonymous.
const NAME_FROM_CONTENT = new Set(['button', 'link', 'menuitem', 'menuitemcheckbox',
  'menuitemradio', 'option', 'tab', 'treeitem', 'checkbox', 'radio', 'switch', 'heading',
  'cell', 'gridcell', 'columnheader', 'rowheader', 'tooltip']);

const EMPTY_CONTENT = new Set(['none', 'normal', '""', "''"]);

/** Name-from-content is not textContent. accname 2F adds ::before/::after
 *  text, image alternatives and svg titles, and drops hidden subtrees; when
 *  any of those sit inside the element, the aria-label is what keeps the
 *  announced name clean (an icon-font glyph before "Menu" would otherwise
 *  be spoken as part of the name), so it is not redundant. Only computed
 *  for elements whose label already matched their text, so the per-element
 *  style reads stay bounded to real candidates (2026-08-25 overnight audit). */
function contentBeyondText(element) {
  const nodes = [element, ...element.querySelectorAll('*')];
  for (const node of nodes) {
    const tag = node.tagName.toLowerCase();
    if (tag === 'img' || tag === 'area' || tag === 'svg') return true;
    if (node !== element && (node.getAttribute('aria-hidden') === 'true' || node.hasAttribute('hidden'))) return true;
    const style = getComputedStyle(node);
    if (node !== element && (style.display === 'none' || style.visibility === 'hidden')) return true;
    if (!EMPTY_CONTENT.has(getComputedStyle(node, '::before').content)) return true;
    if (!EMPTY_CONTENT.has(getComputedStyle(node, '::after').content)) return true;
  }
  return false;
}

export default {
  id: 'redundant-aria-label',
  name: 'Redundant aria-label',
  impact: 'minor',
  tags: ['best-practice'],
  help: 'aria-label should not repeat the visible text',
  helpUrl: 'https://www.w3.org/TR/using-aria/#rule2',
  selector: '[aria-label]',
  evaluate(element) {
    if (!NAME_FROM_CONTENT.has(effectiveRole(element))) return { status: 'pass' };
    const label = element.getAttribute('aria-label').replace(/\s+/g, ' ').trim().toLowerCase();
    const visible = element.textContent.replace(/\s+/g, ' ').trim().toLowerCase();
    if (!visible || label !== visible) return { status: 'pass' };
    if (contentBeyondText(element)) return { status: 'pass' };
    return {
      status: 'fail',
      message: `aria-label="${element.getAttribute('aria-label')}" is identical to the element's visible text — it adds nothing and will drift out of sync when the text changes.`,
      fix: 'Remove the aria-label and let the visible text be the accessible name.',
    };
  },
};
