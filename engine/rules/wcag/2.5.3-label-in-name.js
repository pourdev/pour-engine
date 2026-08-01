// WCAG SC 2.5.3 Label in Name (Level A)
// When a UI COMPONENT has a visible text label AND an aria-provided name,
// the visible text must appear in the accessible name — otherwise
// voice-control users saying the visible label cannot activate it.
//
// Scope per spec: interactive components only (things a user operates), and
// only their VISIBLE text. Screen-reader-only text (sr-only clips, offscreen
// text-indent) is not a visible label; aria-hidden text IS visible to
// sighted users and counts; symbolic content ("×", "→", emoji) is not a
// text label at all.
//
// Re-enabled 2026-07-27 (was parked 2026-07-25 for marginal hits): rewritten
// to compute genuinely visible text — sr-only exclusion, input values,
// aria-labelledby, slotted content — so it can run by default.
const BASES = [
  'button', 'a[href]', 'summary',
  'input[type="button"]', 'input[type="submit"]', 'input[type="reset"]',
  '[role="button"]', '[role="link"]', '[role="menuitem"]', '[role="tab"]',
  '[role="checkbox"]', '[role="radio"]', '[role="switch"]',
  // Labelable form fields: their visible label is the associated <label>
  // element, and an aria-name that omits its text breaks voice control just
  // as surely as it does on a button (SC text scopes to any UI component
  // whose label includes text, not only content-named controls).
  'input:not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="image"])',
  'select', 'textarea',
];
const COMPONENTS = BASES.flatMap((base) => [`${base}[aria-label]`, `${base}[aria-labelledby]`]).join(', ');

const HAS_LETTERS = /\p{L}/u;

/** Lowercase, letters/digits only between single spaces — so "Search…" and
 *  "search" compare equal. */
function normalize(text) {
  return text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/\s+/g, ' ').trim();
}

/** Is this element's own box visually erased (sr-only, offscreen, invisible)?
 *  aria-hidden is deliberately NOT checked: it hides content from assistive
 *  technology, not from sighted users. */
function visuallyErased(element) {
  const style = getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') return true;
  if (parseFloat(style.opacity) === 0 || parseFloat(style.fontSize) === 0) return true;
  const rect = element.getBoundingClientRect();
  const clipped = /hidden|clip/.test(`${style.overflow} ${style.overflowX} ${style.overflowY}`)
    || style.clipPath !== 'none' || (style.clip !== 'auto' && style.position === 'absolute');
  if ((rect.width <= 1 || rect.height <= 1) && clipped) return true;
  const indent = parseFloat(style.textIndent) || 0;
  if (Math.abs(indent) > rect.width && (clipped || Math.abs(indent) > 1000)) return true;
  return false;
}

/** The text a sighted user actually sees inside the component (slot-aware). */
function visibleText(nodes) {
  let text = '';
  for (const node of nodes) {
    if (node.nodeType === 3 /* TEXT_NODE */) { text += node.textContent; continue; }
    if (node.nodeType !== 1 /* ELEMENT_NODE */) continue;
    const tag = node.tagName.toLowerCase();
    if (tag === 'script' || tag === 'style' || tag === 'noscript' || tag === 'template') continue;
    if (node.hasAttribute('hidden') || visuallyErased(node)) continue;
    if (tag === 'slot') {
      const assigned = node.assignedNodes?.() ?? [];
      text += visibleText(assigned.length ? assigned : node.childNodes);
      continue;
    }
    text += visibleText(node.childNodes);
  }
  return text;
}

export default {
  id: 'label-in-name',
  impact: 'serious',
  tags: ['wcag21a', 'wcag253'],
  help: 'The visible label must be part of the accessible name',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/label-in-name.html',
  selector: COMPONENTS,
  evaluate(element, { accessibleName }) {
    const tag = element.tagName.toLowerCase();
    const buttonLike = tag === 'input' && ['button', 'submit', 'reset'].includes(element.type);
    let rawVisible;
    if (buttonLike) {
      rawVisible = element.getAttribute('value') ?? '';
    } else if (tag === 'input' || tag === 'select' || tag === 'textarea') {
      // A field's visible label is its associated <label> (for= or wrapping,
      // via the DOM `labels` list) — the part a voice-control user reads out.
      // No visible label, nothing to match: label-less fields are
      // form-label's finding, not a 2.5.3 mismatch.
      rawVisible = [...(element.labels ?? [])]
        .filter((label) => !visuallyErased(label))
        .map((label) => visibleText(label.childNodes))
        .join(' ');
    } else {
      rawVisible = visibleText(element.childNodes);
    }
    const visible = rawVisible.replace(/\s+/g, ' ').trim();
    // Icon/symbol-only or nothing visible: there is no text label to match.
    if (!visible || !HAS_LETTERS.test(visible)) return { status: 'pass' };
    const name = accessibleName(element);
    if (normalize(name).includes(normalize(visible))) return { status: 'pass' };
    return {
      status: 'fail',
      message: `The visible text "${visible}" is not contained in the accessible name "${name}" — saying the visible label out loud won't activate this control.`,
      fix: 'Make the aria-label start with the visible text, or remove the aria-label so the visible text names the control.',
    };
  },
};
