// WCAG SC 4.1.2 Name, Role, Value (Level A)
import { attributesOf } from '../../lib/dom.js';
// Concrete, usable roles — abstract roles are invalid in markup.
export const VALID_ROLES = new Set([
  'alert', 'alertdialog', 'application', 'article', 'banner', 'blockquote', 'button',
  'caption', 'cell', 'checkbox', 'code', 'columnheader', 'combobox', 'complementary',
  'contentinfo', 'definition', 'deletion', 'dialog', 'directory', 'document', 'emphasis',
  'feed', 'figure', 'form', 'generic', 'grid', 'gridcell', 'group', 'heading', 'img',
  'insertion', 'link', 'list', 'listbox', 'listitem', 'log', 'main', 'marquee', 'math',
  'menu', 'menubar', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'meter', 'navigation',
  'none', 'note', 'option', 'paragraph', 'presentation', 'progressbar', 'radio', 'radiogroup',
  'region', 'row', 'rowgroup', 'rowheader', 'scrollbar', 'search', 'searchbox', 'separator',
  'slider', 'spinbutton', 'status', 'strong', 'subscript', 'superscript', 'switch', 'tab',
  'table', 'tablist', 'tabpanel', 'term', 'textbox', 'time', 'timer', 'toolbar', 'tooltip',
  'tree', 'treegrid', 'treeitem',
  // ARIA 1.3 additions. `image` is the spec's own primary spelling with
  // `img` kept as the synonym — img is the one ARIA role that isn't a whole
  // word, which is why authors reach for `image`, and Safari (2021),
  // Firefox (116) and Chromium all map it. Flagging it was a false positive
  // on real sites; verified against Chromium's accessibility tree, where
  // role="image" resolves to image and only a genuinely bogus role falls
  // back to generic.
  'image', 'comment', 'mark', 'suggestion',
]);

/** Edit distance between two short tokens (Levenshtein). */
function editDistance(a, b) {
  const rows = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) rows[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      rows[i][j] = Math.min(
        rows[i - 1][j] + 1,
        rows[i][j - 1] + 1,
        rows[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return rows[a.length][b.length];
}

/** The valid role closest to any of the written tokens, when one sits
 *  within two edits of it; null when nothing is that close. */
function nearestRole(tokens) {
  let best = null;
  let bestDistance = 3;
  for (const token of tokens) {
    const t = token.toLowerCase();
    for (const role of VALID_ROLES) {
      if (Math.abs(role.length - t.length) > 2) continue;
      const distance = editDistance(t, role);
      if (distance > 0 && distance < bestDistance) { best = role; bestDistance = distance; }
    }
  }
  return best;
}

export default {
  id: 'valid-role',
  name: 'Valid roles',
  impact: 'critical',
  tags: ['wcag2a', 'wcag412'],
  help: 'role attributes must use valid ARIA roles',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html',
  selector: '[role]',
  evaluate(element) {
    // A role attribute may list fallbacks; the first valid token wins.
    // doc-* (DPub-ARIA) and graphics-* (Graphics-ARIA) modules are valid too.
    const tokens = element.getAttribute('role').trim().split(/\s+/).filter(Boolean);
    const isValid = (token) => {
      const t = token.toLowerCase();
      return VALID_ROLES.has(t) || t.startsWith('doc-') || t.startsWith('graphics-');
    };
    if (tokens.some(isValid)) return { status: 'pass' };
    // An invalid role is ignored and the element falls back to its NATIVE
    // role. When that fallback is generic anyway (plain div/span, not
    // focusable, no ARIA states riding on the bogus role), nothing an AT
    // user receives is wrong — role="text" on presentational spans is the
    // canonical harmless case. The failure worth reporting is an invalid
    // role MASKING real semantics or decorating an interactive element.
    const tag = element.tagName.toLowerCase();
    // A near-miss is almost always a typo: name the role that is one or two
    // edits away, so "buton" reads as the misspelling it is rather than as
    // a mystery ("role="buton" isn't really… what?" was the first reaction
    // to the bare message on a seeded fault, 2026-08-27).
    const nearest = nearestRole(tokens);
    const hint = nearest ? ` (did you mean role="${nearest}"?)` : '';
    const fix = nearest
      ? `Correct the spelling to role="${nearest}", or remove the attribute to keep the element’s native role.`
      : 'Use a valid role from the ARIA specification, or remove the attribute to keep the element’s native role.';
    // What the element falls back to when the bogus role is ignored. div/span
    // expose generic; <svg> exposes image (or graphics-document) in every
    // current engine, which is what an author writing role="img"/"image" on it
    // wanted anyway — so a typo there costs an AT user nothing. Elements with
    // real semantics to mask (headings, lists, controls) stay out of the hatch.
    const genericFallback = tag === 'div' || tag === 'span' || tag === 'svg';
    const focusable = element.tabIndex >= 0
      || element.matches('a[href], button, input, select, textarea, summary');
    const hasAriaProps = [...attributesOf(element)].some(
      (attr) => attr.name.startsWith('aria-') && attr.name !== 'aria-hidden');
    if (genericFallback && !focusable && !hasAriaProps) return { status: 'pass' };
    // The same two triggers decide for EVERY tag (2026-08-25 overnight
    // audit). ARIA 1.2 section 9.1: an unrecognised role token is treated as
    // if no role had been provided, so <h2 role="text"> is exposed exactly
    // as <h2>. Name, role and value are all intact and determinable; what
    // the DOM cannot tell is what the author meant, so when the element is
    // not focusable and carries no ARIA state on the back of the bogus role
    // this is a question, not an assertion. Focusable or state-bearing
    // elements keep failing: a focusable element left generic, or a state
    // riding on a role the browser threw away, is the real 4.1.2 harm.
    if (!focusable && !hasAriaProps) {
      return {
        status: 'incomplete',
        message: `role="${element.getAttribute('role')}" is not a valid ARIA role${hint}, so assistive technology ignores it and exposes the element's native <${tag}> semantics. Nothing is announced wrongly, but the author reached for a role that does not exist. Is the native <${tag}> role the right one here? If a different role was intended, that role is missing.`,
        fix,
      };
    }
    return {
      status: 'fail',
      message: `role="${element.getAttribute('role')}" is not a valid ARIA role${hint}, so assistive technology ignores it${genericFallback ? '' : ` and falls back to the element’s native <${tag}> semantics`}.`,
      fix,
    };
  },
};
