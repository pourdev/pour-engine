// WCAG SC 4.1.2 Name, Role, Value (Level A)
// aria-activedescendant and aria-owns matter most: a dangling
// activedescendant breaks composite-widget focus reporting entirely.
const REF_ATTRIBUTES = [
  'aria-labelledby', 'aria-describedby', 'aria-controls',
  'aria-activedescendant', 'aria-owns', 'aria-errormessage', 'aria-details',
];

// Deferred-tooltip pattern: libraries (Deque's own docs component included)
// write aria-describedby="tooltip7" at rest and only CREATE #tooltip7 when
// the trigger is hovered or focused — which is exactly when a screen reader
// announces the description, so the pattern works. Only DESCRIPTIVE refs
// get this benefit of the doubt: a NAME that exists only on hover is broken
// for rotor navigation even when the deferral works, so aria-labelledby
// (and the rest) keep failing at rest.
const PROBEABLE = new Set(['aria-describedby', 'aria-details']);
// A handful of probes covers any real page; a template bug that dangles
// fifty refs is broken enough that the un-probed remainder failing as
// before is the right answer.
const PROBE_BUDGET = 8;
const PROBE_WAIT_MS = 250;

/** Fire the events a tooltip library listens for, wait for it to react,
 *  check whether the ids materialised, then put the page back. */
async function probeDeferred(element, ids) {
  const over = ['pointerover', 'mouseover', 'mouseenter'];
  const out = ['pointerout', 'mouseout', 'mouseleave'];
  for (const type of over) element.dispatchEvent(new MouseEvent(type, { bubbles: type !== 'mouseenter' }));
  element.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
  try { element.focus?.({ preventScroll: true }); } catch { /* non-focusable */ }
  await new Promise((resolve) => setTimeout(resolve, PROBE_WAIT_MS));
  const root = element.getRootNode();
  const appeared = ids.every((id) => root.getElementById?.(id));
  // Restore: the audit must leave the page as it found it, and later rules
  // must not meet a tooltip that only exists because we hovered.
  for (const type of out) element.dispatchEvent(new MouseEvent(type, { bubbles: type !== 'mouseleave' }));
  element.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
  try { element.blur?.(); } catch { /* ignore */ }
  await new Promise((resolve) => setTimeout(resolve, 50));
  return appeared;
}

function inspect(element) {
  // ARIA id references cannot cross shadow boundaries: they resolve only
  // within the element's own root (document or shadow tree).
  const root = element.getRootNode();
  // Collapsed-disclosure pattern: a trigger with aria-expanded="false"
  // whose aria-controls panel doesn't exist YET (rendered on expand) is
  // ubiquitous and harmless while collapsed — name computation doesn't
  // touch aria-controls, so nothing resolves wrongly today.
  const collapsed = element.getAttribute('aria-expanded') === 'false';
  const missing = [];
  const ambiguous = [];
  for (const attr of REF_ATTRIBUTES) {
    for (const id of (element.getAttribute(attr) ?? '').split(/\s+/).filter(Boolean)) {
      if (!root.getElementById?.(id)) {
        if (attr === 'aria-controls' && collapsed) continue;
        missing.push({ attr, id });
        continue;
      }
      const count = root.querySelectorAll(`[id="${CSS.escape(id)}"]`).length;
      if (count > 1) {
        ambiguous.push(`${attr}="${id}" — ${count} elements share this id; the reference binds to the FIRST one in the DOM`);
      }
    }
  }
  return { missing, ambiguous };
}

function outcome({ missing, ambiguous }, probed, element, accessibleName) {
  if (missing.length) {
    // A dangling ref is skipped by the accname computation, so the HARM
    // depends on what remains. A labelledby that dangles while the element
    // still names itself (contents, aria-label) is inert clutter — real,
    // fragile, validator-flagged, but announced correctly today. The same
    // dangle on an otherwise nameless element is the 4.1.2 failure proper:
    // names are consumed at REST (element lists, rotor), so the finding
    // says which of the two this is instead of one blanket accusation.
    const restingName = (accessibleName?.(element) ?? '').trim();
    const detail = missing
      .map(({ attr, id }) => {
        if (attr === 'aria-labelledby') {
          return restingName
            ? `aria-labelledby="${id}" points to nothing — the reference is ignored and this element's name ("${restingName.slice(0, 40)}") currently comes from elsewhere; announced correctly today, but the dead reference is fragile`
            : `aria-labelledby="${id}" points to nothing and leaves this element without an accessible name`;
        }
        return `${attr}="${id}" points to nothing — assistive technology silently ignores it`;
      })
      .join('; ');
    return {
      status: 'fail',
      message: `Broken ARIA references: ${detail}.${probed ? ' Probed with focus and hover in case the target is created on demand — it never appeared.' : ''}`,
      fix: 'Correct or remove the reference, or give the target element that id.',
    };
  }
  if (ambiguous.length) {
    // Duplicate ids resolve deterministically to the first copy — often
    // the right one (desktop/mobile double-renders). Real, but a human
    // must judge whether the first copy is the wrong copy.
    return {
      status: 'incomplete',
      message: `Ambiguous ARIA references: ${ambiguous.join('; ')}. If the first copy in the DOM is the intended target, this works today — but it's fragile.`,
    };
  }
  return { status: 'pass' };
}

export default {
  id: 'aria-valid-refs',
  // Moderate, not critical: with 4.1.1 Parsing retired in WCAG 2.2 these
  // are 4.1.2 name/state defects, and aria-controls in particular has weak
  // assistive-technology support — real, but rarely blocking.
  impact: 'moderate',
  tags: ['wcag2a', 'wcag412'],
  help: 'ARIA id references must point to elements that exist',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html',
  selector: REF_ATTRIBUTES.map((attr) => `[${attr}]`).join(', '),
  async evaluateAll(elements, { accessibleName } = {}) {
    let budget = PROBE_BUDGET;
    const outcomes = new Array(elements.length);
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      const found = inspect(element);
      const deferredOnly = found.missing.length > 0
        && found.missing.every(({ attr }) => PROBEABLE.has(attr));
      if (deferredOnly && budget > 0) {
        budget--;
        if (await probeDeferred(element, found.missing.map(({ id }) => id))) {
          // The description materialises exactly when it would be announced.
          outcomes[i] = { status: 'pass' };
          continue;
        }
        outcomes[i] = outcome(found, true, element, accessibleName);
        continue;
      }
      outcomes[i] = outcome(found, false, element, accessibleName);
    }
    return outcomes;
  },
};
