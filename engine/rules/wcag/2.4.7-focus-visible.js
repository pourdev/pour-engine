// WCAG SC 2.4.7 Focus Visible (Level AA)
// A stylesheet that strips focus outlines without providing a replacement
// indicator is the classic 2.4.7 failure (F78). Cross-origin sheets are
// unreadable and skipped; a replacement indicator can live in a different
// rule entirely — so this flags for review, it never asserts a fail.
function focusSuppressors(doc) {
  const suspects = [];
  const replacementIn = (style) => style.getPropertyValue('box-shadow') || style.getPropertyValue('border')
    || style.getPropertyValue('border-color') || style.getPropertyValue('background')
    || style.getPropertyValue('background-color') || style.getPropertyValue('text-decoration');

  const inspect = (rule) => {
    if (!rule.selectorText || !/:focus/.test(rule.selectorText)) return;
    // `:focus:not(:focus-visible) { outline: none }` is the PUBLISHED pattern
    // for showing the ring to keyboard users only: it strips the indicator
    // precisely in the state where the browser has decided not to show focus,
    // and leaves the keyboard state alone. Flagging it fails the pattern the
    // guidance recommends, and it ships in most modern CSS resets.
    if (/:not\(\s*:focus-visible\s*\)/.test(rule.selectorText)) return;
    const style = rule.style;
    if (!style) return;
    const outline = `${style.getPropertyValue('outline')} ${style.getPropertyValue('outline-style')} ${style.getPropertyValue('outline-width')}`;
    const removesOutline = /\bnone\b/.test(outline) || /(^|\s)0(px)?(\s|$)/.test(outline);
    if (!removesOutline) return;
    // A replacement indicator may not sit in the rule's own style block: any
    // declaration written AFTER a nested rule is parsed into a separate
    // CSSNestedDeclarations child (a style-bearing rule with no selector), so
    // reading only rule.style would report a suppressor that is in fact
    // replaced two lines further down.
    const nested = [...(rule.cssRules ?? [])]
      .filter((child) => child.style && !child.selectorText);
    if (replacementIn(style) || nested.some((child) => replacementIn(child.style))) return;
    suspects.push(rule.selectorText);
  };
  // Inspect each rule, THEN descend into any children. Testing `rule.cssRules`
  // first and skipping used to walk straight past every plain style rule:
  // since CSS Nesting shipped, a CSSStyleRule carries its own cssRules list,
  // and an empty CSSRuleList is still a truthy object, so the check meant for
  // @media/@supports swallowed the whole sheet and the rule could never fire.
  // A style rule can both declare and nest, so both halves have to run.
  const scan = (rules) => {
    for (const rule of rules) {
      inspect(rule);
      if (rule.cssRules?.length) scan(rule.cssRules); // @media/@supports/nesting
    }
  };
  for (const sheet of doc.styleSheets) {
    try { scan(sheet.cssRules); } catch { /* cross-origin sheet */ }
  }
  return suspects;
}

export default {
  id: 'focus-visible',
  name: 'Visible focus',
  impact: 'serious',
  tags: ['wcag2aa', 'wcag247'],
  help: 'Keyboard focus must remain visible',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html',
  selector: 'html',
  visibleOnly: false,
  evaluate(element) {
    const suspects = focusSuppressors(element.ownerDocument);
    if (!suspects.length) return { status: 'pass' };
    const shown = suspects.slice(0, 3).join(', ');
    return {
      status: 'incomplete',
      message: `${suspects.length} CSS rule(s) remove the focus outline without setting a replacement in the same rule (e.g. ${shown}) — if no other rule provides a visible indicator, keyboard users lose their place. Tab through the page to check.`,
    };
  },
};
