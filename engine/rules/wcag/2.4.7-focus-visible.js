// WCAG SC 2.4.7 Focus Visible (Level AA)
// A stylesheet that strips focus outlines without providing a replacement
// indicator is the classic 2.4.7 failure (F78). Cross-origin sheets are
// unreadable and skipped; a replacement indicator can live in a different
// rule entirely — so this flags for review, it never asserts a fail.
// The focus pseudo-classes themselves, and nothing else: :focus-within is a
// PARENT's state and stripping ":focus" out of it would leave "-within".
const FOCUS_TOKEN = /:focus(?:-visible)?(?![\w-])/g;
const HAS_FOCUS = /:focus(?:-visible)?(?![\w-])/;

function focusSuppressors(doc) {
  const suspects = [];
  const replacementIn = (style) => style.getPropertyValue('box-shadow') || style.getPropertyValue('border')
    || style.getPropertyValue('border-color') || style.getPropertyValue('background')
    || style.getPropertyValue('background-color') || style.getPropertyValue('text-decoration');
  const outlineOf = (style) => `${style.getPropertyValue('outline')} ${style.getPropertyValue('outline-style')} ${style.getPropertyValue('outline-width')}`;
  const removesOutline = (outline) => /\bnone\b/.test(outline) || /(^|\s)0(px)?(\s|$)/.test(outline);
  // The elements a focus selector reaches, with the focus state itself
  // taken off, so `a:focus` and `a:focus-visible` both read "a".
  const subjects = (selectorText) => selectorText.split(',')
    .map((part) => part.replace(FOCUS_TOKEN, '').replace(/\s+/g, ' ').trim());
  // Per sheet: the suppressors found, and the later rules that give the
  // same elements an indicator back. A suspect is dismissed only when a
  // LATER rule in the SAME sheet, keyed on :focus or :focus-visible, covers
  // every subject it names and declares a visible outline or a replacement.
  // That is the keyboard-only pattern in its other spelling
  // (`a:focus{outline:0}` then `a:focus-visible{outline:3px solid}`) and
  // the plain two-rule split (`a:focus{outline:none}` then
  // `a:focus{box-shadow:...}`): both provably provide the mode of operation
  // the criterion asks for, and both reviewed until 2026-08-25 (overnight
  // audit). A replacement on a DIFFERENT element (a :focus-within parent)
  // stays a review; whether that box reads as the focused control is a
  // human question.
  let sheet = null;
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
    // A replacement indicator may not sit in the rule's own style block: any
    // declaration written AFTER a nested rule is parsed into a separate
    // CSSNestedDeclarations child (a style-bearing rule with no selector), so
    // reading only rule.style would report a suppressor that is in fact
    // replaced two lines further down.
    const styles = [style, ...[...(rule.cssRules ?? [])]
      .filter((child) => child.style && !child.selectorText).map((child) => child.style)];
    const replaced = styles.some(replacementIn);
    const outlines = styles.map(outlineOf).filter((o) => o.trim());
    const showsOutline = outlines.some((o) => !removesOutline(o));
    if (HAS_FOCUS.test(rule.selectorText) && (replaced || showsOutline)) {
      sheet.providers.push({ order: sheet.order, subjects: subjects(rule.selectorText) });
    }
    if (!outlines.some(removesOutline) || replaced) return;
    sheet.suspects.push({ order: sheet.order, selector: rule.selectorText, subjects: subjects(rule.selectorText) });
  };
  const covered = (subject, provider) => provider.subjects.some((p) => p === subject || p === '*' || p === '');
  const settle = () => {
    for (const suspect of sheet.suspects) {
      const restored = suspect.subjects.every((subject) => sheet.providers.some((provider) =>
        provider.order > suspect.order && covered(subject, provider)));
      if (!restored) suspects.push(suspect.selector);
    }
  };
  // Inspect each rule, THEN descend into any children. Testing `rule.cssRules`
  // first and skipping used to walk straight past every plain style rule:
  // since CSS Nesting shipped, a CSSStyleRule carries its own cssRules list,
  // and an empty CSSRuleList is still a truthy object, so the check meant for
  // @media/@supports swallowed the whole sheet and the rule could never fire.
  // A style rule can both declare and nest, so both halves have to run.
  const scan = (rules) => {
    for (const rule of rules) {
      sheet.order++;
      inspect(rule);
      if (rule.cssRules?.length) scan(rule.cssRules); // @media/@supports/nesting
    }
  };
  for (const styleSheet of doc.styleSheets) {
    sheet = { order: 0, suspects: [], providers: [] };
    try { scan(styleSheet.cssRules); } catch { /* cross-origin sheet */ }
    settle();
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
