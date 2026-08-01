// WCAG SC 2.4.7 Focus Visible (Level AA)
// A stylesheet that strips focus outlines without providing a replacement
// indicator is the classic 2.4.7 failure (F78). Cross-origin sheets are
// unreadable and skipped; a replacement indicator can live in a different
// rule entirely — so this flags for review, it never asserts a fail.
function focusSuppressors(doc) {
  const suspects = [];
  const scan = (rules) => {
    for (const rule of rules) {
      if (rule.cssRules) { scan(rule.cssRules); continue; } // @media/@supports
      if (!rule.selectorText || !/:focus/.test(rule.selectorText)) continue;
      const style = rule.style;
      if (!style) continue;
      const outline = `${style.getPropertyValue('outline')} ${style.getPropertyValue('outline-style')} ${style.getPropertyValue('outline-width')}`;
      const removesOutline = /\bnone\b/.test(outline) || /(^|\s)0(px)?(\s|$)/.test(outline);
      if (!removesOutline) continue;
      const replaced = style.getPropertyValue('box-shadow') || style.getPropertyValue('border')
        || style.getPropertyValue('border-color') || style.getPropertyValue('background')
        || style.getPropertyValue('background-color') || style.getPropertyValue('text-decoration');
      if (!replaced) suspects.push(rule.selectorText);
    }
  };
  for (const sheet of doc.styleSheets) {
    try { scan(sheet.cssRules); } catch { /* cross-origin sheet */ }
  }
  return suspects;
}

export default {
  id: 'focus-visible',
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
