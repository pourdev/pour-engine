// WCAG SC 4.1.2 Name, Role, Value (Level A)
// aria-activedescendant and aria-owns matter most: a dangling
// activedescendant breaks composite-widget focus reporting entirely.
import { effectiveRole } from '../../lib/roles.js';
import { labelledByName } from '../../lib/accessible-name.js';

const REF_ATTRIBUTES = [
  'aria-labelledby', 'aria-describedby', 'aria-controls',
  'aria-activedescendant', 'aria-owns', 'aria-errormessage', 'aria-details',
];

// No hover/focus probe (removed 2026-08-26, David). From 1.2.81 to this
// change the rule dispatched hover and focus events at elements whose
// aria-describedby pointed nowhere, to catch tooltip libraries that create
// the target on demand. That mutated the page under audit: focus was taken
// and not given back, hover-driven menus opened, page scripts ran, mobile
// keyboards popped, and 300 ms went by per element. Once a dead describedby
// became a review rather than a fail (same morning) the probe only bought
// fewer review rows, which is not worth an audit that is no longer
// read-only. The deferred-tooltip pattern is now named in the review
// message instead, for the human to confirm.

// 4.1.2 is scoped to user interface components ("a part of the content
// that is perceived by users as a single control for a distinct function").
// A nameless labelledby is only the 4.1.2 failure proper on one of those: a
// landmark, list or group whose reference died is left unnamed, which WCAG
// permits for those roles, so the DOM proves an authoring error, not a
// component without a name. Same reading label-for-valid took on 2026-08-25.
// Corpus evidence (parity 2026-08-27): the one assert on 137 sites was an
// empty <aside tabindex="-1"> whose heading never rendered, while identical
// dead references on two visible <nav>s and a footer list passed only because the name
// computation falls through to their link text. The verdict must not turn
// on whether a landmark happens to contain words.
const WIDGET_ROLES = new Set([
  // ARIA 1.2 widget roles
  'button', 'checkbox', 'gridcell', 'link', 'menuitem', 'menuitemcheckbox', 'menuitemradio',
  'option', 'progressbar', 'radio', 'scrollbar', 'searchbox', 'separator', 'slider',
  'spinbutton', 'switch', 'tab', 'tabpanel', 'textbox', 'treeitem',
  // ARIA 1.2 composite widget roles
  'combobox', 'grid', 'listbox', 'menu', 'menubar', 'radiogroup', 'tablist', 'tree', 'treegrid',
  // window roles: a dialog is operated as one thing, and dialog-name asserts on it anyway
  'dialog', 'alertdialog',
]);
const NATIVE_CONTROLS = 'a[href], button, input:not([type="hidden"]), select, textarea, summary, audio[controls], video[controls], [contenteditable="true"]';

/** accname step 2D, the host-language naming that every role keeps
 *  (name-from-content is the only role-gated step): an image's alt, an
 *  svg's own <title>, a table's caption, a fieldset's legend, a figure's
 *  figcaption. The Tate footer's social icons are <svg aria-labelledby="title">
 *  with a <title>Facebook</title> child and no element with that id: named. */
function nativeName(element) {
  const tag = element.tagName.toLowerCase();
  if (tag === 'img' || tag === 'area') return element.getAttribute('alt')?.trim() ?? '';
  const child = { svg: 'title', table: 'caption', fieldset: 'legend', figure: 'figcaption' }[tag];
  if (!child) return '';
  return [...element.children].find((c) => c.tagName.toLowerCase() === child)?.textContent.trim() ?? '';
}

function isUserInterfaceComponent(element) {
  if (element.matches(NATIVE_CONTROLS)) return true;
  if (WIDGET_ROLES.has(effectiveRole(element))) return true;
  // A tabbable element is operated as a control whatever its role;
  // tabindex="-1" (a skip-link or scroll target) is not.
  return element.tabIndex >= 0;
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

function outcome({ missing, ambiguous }, element, accessibleName) {
  if (missing.length) {
    // A dangling ref is skipped by the accname computation, so the HARM
    // depends on what remains, and 4.1.2 only cares about name, role and
    // user-settable value (re-decided by David 2026-08-26 against measured
    // verdicts on the corpus; the old "fragile, validator-flagged"
    // argument was 4.1.1's, and 2.2 retired it):
    //   - aria-labelledby that dangles while the element still names
    //     itself from elsewhere: the name is fully determinable (accname
    //     step 2B processes the valid IDREFs), so it is not a finding here;
    //   - aria-labelledby that leaves a USER INTERFACE COMPONENT nameless,
    //     and aria-activedescendant (a focused composite reports the wrong
    //     active item): the 4.1.2 failure proper, asserted. The same dead
    //     reference on a landmark, list or group is asked about (2026-08-27,
    //     see isUserInterfaceComponent);
    //   - aria-describedby that points nowhere at rest: a description is
    //     not name, role or a user-set value, and tooltip libraries create
    //     the target on hover or focus, so the DOM proves an authoring
    //     error at most. Asked, never asserted;
    //   - aria-controls, aria-owns, aria-details, aria-errormessage: the
    //     standing policy (asserted; the comparator asserts these too).
    const component = isUserInterfaceComponent(element);
    // The resting name for a component is the full computation (a button
    // names itself from its contents). A landmark, list or group is not
    // allowed name-from-content (accname step 2F), so for those only the
    // surviving labelledby ids, aria-label and title count: otherwise a
    // <nav> full of links would read as named and the dead reference vanish.
    const restingName = component
      ? (accessibleName?.(element) ?? '').trim()
      : (labelledByName(element) || element.getAttribute('aria-label') || nativeName(element) || element.getAttribute('title') || '').trim();
    const relevant = missing.filter(({ attr }) => !(attr === 'aria-labelledby' && restingName));
    if (!relevant.length) return { status: 'pass' };
    const line = ({ attr, id }) => attr === 'aria-labelledby'
      ? `aria-labelledby="${id}" points to nothing and leaves this element without an accessible name`
      : `${attr}="${id}" points to nothing — assistive technology silently ignores it`;
    const asserted = relevant.filter(({ attr }) => attr !== 'aria-describedby' && (attr !== 'aria-labelledby' || component));
    if (asserted.length) {
      return {
        status: 'fail',
        message: `Broken ARIA references: ${relevant.map(line).join('; ')}.`,
        fix: 'Correct or remove the reference, or give the target element that id.',
      };
    }
    const unnamed = relevant.filter(({ attr }) => attr === 'aria-labelledby');
    if (unnamed.length) {
      const tag = element.tagName.toLowerCase();
      return {
        status: 'incomplete',
        message: `${unnamed.map(({ id }) => `aria-labelledby="${id}" points to nothing`).join('; ')}, so this <${tag}> has no accessible name. It is not a user interface component, so 4.1.2 does not require one, but the reference was meant to label it: correct it, or remove it if the label was never needed.`,
        fix: 'Correct or remove the reference, or give the target element that id.',
      };
    }
    return {
      status: 'incomplete',
      message: `${relevant.map(line).join('; ')} at rest. The element keeps its name and role, so this is not a proven 4.1.2 failure: if the description is created when the element is hovered or focused (a tooltip library), this works; otherwise correct the reference.`,
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
  name: 'ARIA id references',
  // Moderate, not critical: with 4.1.1 Parsing retired in WCAG 2.2 these
  // are 4.1.2 name/state defects, and aria-controls in particular has weak
  // assistive-technology support — real, but rarely blocking.
  impact: 'moderate',
  tags: ['wcag2a', 'wcag412'],
  help: 'ARIA id references must point to elements that exist',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html',
  selector: REF_ATTRIBUTES.map((attr) => `[${attr}]`).join(', '),
  evaluate(element, { accessibleName } = {}) {
    return outcome(inspect(element), element, accessibleName);
  },
};
