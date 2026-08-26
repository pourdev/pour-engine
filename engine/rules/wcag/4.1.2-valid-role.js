// WCAG SC 4.1.2 Name, Role, Value (Level A)
// Concrete, usable roles — abstract roles are invalid in markup.
const VALID_ROLES = new Set([
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
    // What the element falls back to when the bogus role is ignored. div/span
    // expose generic; <svg> exposes image (or graphics-document) in every
    // current engine, which is what an author writing role="img"/"image" on it
    // wanted anyway — so a typo there costs an AT user nothing. Elements with
    // real semantics to mask (headings, lists, controls) stay out of the hatch.
    const genericFallback = tag === 'div' || tag === 'span' || tag === 'svg';
    const focusable = element.tabIndex >= 0
      || element.matches('a[href], button, input, select, textarea, summary');
    const hasAriaProps = [...element.attributes].some(
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
        message: `role="${element.getAttribute('role')}" is not a valid ARIA role, so assistive technology ignores it and exposes the element's native <${tag}> semantics. Nothing is announced wrongly, but the author reached for a role that does not exist. Is the native <${tag}> role the right one here? If a different role was intended, that role is missing.`,
        fix: 'Use a valid role from the ARIA specification, or remove the attribute to keep the element’s native role.',
      };
    }
    return {
      status: 'fail',
      message: `role="${element.getAttribute('role')}" is not a valid ARIA role, so assistive technology ignores it${genericFallback ? '' : ` and falls back to the element’s native <${tag}> semantics`}.`,
      fix: 'Use a valid role from the ARIA specification, or remove the attribute to keep the element’s native role.',
    };
  },
};
