// WCAG SC 1.3.4 Orientation (Level AA, added in WCAG 2.1)
// "Content does not restrict its view and operation to a single display
// orientation, such as portrait or landscape, unless a specific display
// orientation is essential."
//
// What a stylesheet can PROVE: a rule inside an @media (orientation: …)
// block that hides or counter-rotates the page root is restricting the
// whole page to the other orientation — the "please rotate your device"
// wall (body { display: none }) and the forced-landscape hack
// (body { transform: rotate(90deg) }). The rotate hack even disproves the
// "essential" escape by itself: content that renders rotated demonstrably
// works in both orientations.
//
// Deliberately NOT flagged: orientation media queries that restyle or hide
// individual regions — that is ordinary responsive design, not a lock.
// Script-driven locks (screen.orientation.lock()) and cross-origin
// stylesheets (unreadable under CORS) are invisible to a static pass; the
// rule asserts only what it can see and stays silent otherwise.
// The root ELEMENT only, optionally qualified by pseudo-classes. A pseudo-
// element (body::before, html::backdrop) is one generated box, and hiding
// it in portrait is the region restyling this rule deliberately leaves
// alone; matching it asserted "hides the page" over a decorative band
// (2026-08-25 overnight audit). Pseudo-classes are kept, but only assert
// when the live root actually matches them (see rootSelector).
const ROOT_PART = /^(html|body|:root)((?::[a-z-]+(?:\([^()]*\))?)*)$/i;
const LOCK_ROTATE = /rotate(?:3d\([^)]*,\s*)?\(?\s*(?:-?(?:90|270)deg|0\.25turn|-0\.25turn|100grad|-100grad)/i;

function rootSelector(selectorText, doc) {
  return (selectorText ?? '').split(',').some((part) => {
    const match = ROOT_PART.exec(part.trim());
    if (!match) return false;
    if (!match[2]) return true; // bare root: always in force
    // body:not(.ready) { visibility: hidden } locks nothing once the class
    // is on; the selector must match the root as it stands to be a lock.
    const root = /^body$/i.test(match[1]) ? doc.body : doc.documentElement;
    try { return !!root && root.matches(part.trim()); } catch { return false; }
  });
}

function scanRules(rules, insideOrientation, findings, doc) {
  for (const rule of rules ?? []) {
    const condition = rule.conditionText ?? rule.media?.mediaText;
    if (condition !== undefined && rule.cssRules) {
      const orientation = /orientation\s*:\s*(portrait|landscape)/i.exec(condition)?.[1];
      scanRules(rule.cssRules, orientation ? { condition, orientation } : insideOrientation, findings, doc);
      continue;
    }
    if (insideOrientation && rule.style && rootSelector(rule.selectorText, doc)) {
      const { display, visibility, transform, rotate } = rule.style;
      if (display === 'none' || visibility === 'hidden') {
        findings.push({ kind: 'hidden', selector: rule.selectorText, ...insideOrientation });
      } else if (LOCK_ROTATE.test(transform ?? '') || LOCK_ROTATE.test(rotate ?? '')) {
        findings.push({ kind: 'rotated', selector: rule.selectorText, ...insideOrientation });
      }
    } else if (rule.cssRules) {
      scanRules(rule.cssRules, insideOrientation, findings);
    }
  }
}

export default {
  id: 'orientation-lock',
  name: 'Orientation lock',
  impact: 'serious',
  tags: ['wcag21aa', 'wcag134'],
  help: 'Content must work in both portrait and landscape',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/orientation.html',
  selector: 'html',
  // The evidence is in the stylesheet, not in the root's own rendering — and
  // the lock hides the root exactly when it is in force, so a visibility
  // filter here would silence the rule in the only state that matters.
  visibleOnly: false,
  evaluate(element) {
    const findings = [];
    for (const sheet of element.ownerDocument.styleSheets) {
      let rules;
      try { rules = sheet.cssRules; } catch { continue; } // cross-origin: unreadable, skip
      scanRules(rules, null, findings, element.ownerDocument);
    }
    if (!findings.length) return { status: 'pass' };
    const f = findings[0];
    const verb = f.kind === 'hidden' ? 'hides the page' : 'rotates the page to force the other orientation';
    return {
      status: 'fail',
      message: `A stylesheet rule (${f.selector} under @media ${f.condition}) ${verb} when the device is in ${f.orientation} — the content is locked to a single display orientation.`,
      fix: 'Let the layout adapt to both orientations instead of hiding or rotating the page. If a single orientation is genuinely essential (rare), document why.',
    };
  },
};
