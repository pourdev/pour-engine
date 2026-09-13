// WCAG SC 1.3.4 Orientation (Level AA, added in WCAG 2.1)
// "Content does not restrict its view and operation to a single display
// orientation, such as portrait or landscape, unless a specific display
// orientation is essential."
//
// What a stylesheet can show: a rule inside an @media (orientation: …)
// block that hides or counter-rotates the page root restricts the whole
// page to the other orientation, the "please rotate your device" wall
// (body { display: none }) and the forced-landscape hack
// (body { transform: rotate(90deg) }). Asserted the way ACT rule b33eff
// asserts a quarter turn between orientations, under its stated assumption
// that no orientation is essential; the message names that exception. Both
// orientations count: a rule for the orientation the device is not in right
// now is still a restriction, and ACT evaluates both.
//
// What the live page adds (2026-09-12): when the block IS active, computed
// style shows whether the declaration is in force, so an overridden or
// cancelled declaration is not a failure. When the block is dormant, a
// later declaration for the same root in the same orientation undoes an
// earlier one, in cascade order (display: block after display: none,
// transform: none after a rotation). Unsupported @supports branches and
// disabled sheets are skipped. Script locks (screen.orientation.lock()) and
// cross-origin sheets stay invisible to a static pass.
//
// Deliberately NOT flagged: orientation queries that restyle or hide
// individual regions (ordinary responsive design), and a root pseudo-element
// (body::before is one generated box). Root pseudo-class selectors only
// count when the live root matches them (body:not(.ready) once .ready is on
// locks nothing).
// https://www.w3.org/WAI/WCAG22/Understanding/orientation.html
// https://www.w3.org/WAI/standards-guidelines/act/rules/b33eff/
const ROOT_PART = /^(html|body|:root)((?::[a-z-]+(?:\([^()]*\))?)*)$/i;
const LOCK_ROTATE = /rotate(?:3d\([^)]*,\s*)?\(?\s*(?:-?(?:90|270)deg|0\.25turn|-0\.25turn|100grad|-100grad)/i;

function matchingRoots(selectorText, doc) {
  const roots = new Set();
  for (const part of (selectorText ?? '').split(',')) {
    const match = ROOT_PART.exec(part.trim());
    if (!match) continue;
    const root = /^body$/i.test(match[1]) ? doc.body : doc.documentElement;
    try { if (root?.matches(part.trim())) roots.add(root); } catch { /* invalid selector */ }
  }
  return [...roots];
}

// CSS transforms and the independent rotate property compose. A 90-degree
// declaration can be overridden, or cancelled by an opposite rotation.
function quarterTurn(style, win) {
  let angle = 0;
  if (style.transform && style.transform !== 'none') {
    try {
      const matrix = new win.DOMMatrixReadOnly(style.transform);
      if (!matrix.is2D) return null;
      angle += Math.atan2(matrix.b, matrix.a) * 180 / Math.PI;
    } catch { return null; }
  }
  if (style.rotate && style.rotate !== 'none') {
    const rotation = /^(?:(?:z|0\s+0\s+1)\s+)?(-?[\d.]+)(deg|rad|grad|turn)$/.exec(style.rotate);
    if (!rotation) return null;
    const scale = { deg: 1, rad: 180 / Math.PI, grad: 0.9, turn: 360 }[rotation[2]];
    angle += Number(rotation[1]) * scale;
  }
  return Math.abs(((angle % 180) + 180) % 180 - 90) < 0.01;
}

/** Walk the sheet in cascade order, keeping the LAST relevant declaration
 *  per root, orientation and property, so a later declaration in the same
 *  orientation block undoes an earlier lock. */
function scanRules(rules, orientationContext, active, state, doc, query) {
  const win = doc.defaultView;
  for (const rule of rules ?? []) {
    if (rule.type === win.CSSRule.SUPPORTS_RULE) {
      // An unsupported branch cannot apply in either orientation.
      if (query.supports(rule.conditionText)) scanRules(rule.cssRules, orientationContext, active, state, doc, query);
      continue;
    }
    if (rule.type === win.CSSRule.MEDIA_RULE) {
      const condition = rule.conditionText ?? rule.media.mediaText;
      const orientation = /orientation\s*:\s*(portrait|landscape)/i.exec(condition)?.[1];
      const context = orientation ? { condition, orientation } : orientationContext;
      scanRules(rule.cssRules, context, active && query.media(condition), state, doc, query);
      continue;
    }
    if (orientationContext && rule.style) {
      const { display, visibility, transform, rotate } = rule.style;
      const declared = {
        display: display ? (display === 'none' ? 'hidden' : null) : undefined,
        visibility: visibility ? (visibility === 'hidden' ? 'hidden' : null) : undefined,
        transform: transform ? (LOCK_ROTATE.test(transform) ? 'rotated' : null) : undefined,
        rotate: rotate ? (LOCK_ROTATE.test(`rotate(${rotate})`) ? 'rotated' : null) : undefined,
      };
      if (Object.values(declared).some((value) => value !== undefined)) {
        for (const root of matchingRoots(rule.selectorText, doc)) {
          const key = `${orientationContext.orientation.toLowerCase()}|${root === doc.body ? 'body' : 'html'}`;
          if (!state.has(key)) state.set(key, {});
          const entry = state.get(key);
          for (const [property, kind] of Object.entries(declared)) {
            if (kind === undefined) continue;
            entry[property] = kind ? { kind, active, selector: rule.selectorText, ...orientationContext } : null;
          }
        }
      }
    }
    // Layers and other grouping rules retain the surrounding media state.
    // Unknown conditional groups cannot establish an active restriction.
    if (rule.cssRules) scanRules(rule.cssRules, orientationContext,
      active && rule.conditionText === undefined, state, doc, query);
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
  visibleOnly: false, // a restriction can hide the root itself
  evaluate(element) {
    const doc = element.ownerDocument;
    const win = doc.defaultView;
    const state = new Map();
    // Each media and supports condition is asked once per audit. Framework
    // stylesheets repeat a handful of breakpoints thousands of times: ethz.ch
    // carries 10,604 @media blocks over 98 distinct conditions, and asking
    // matchMedia for every block cost this rule about half of its 10 ms there
    // (measured 2026-09-13). The answers cannot change within one pass.
    const mediaAnswers = new Map();
    const supportsAnswers = new Map();
    const query = {
      media: (condition) => {
        if (!mediaAnswers.has(condition)) mediaAnswers.set(condition, win.matchMedia(condition).matches);
        return mediaAnswers.get(condition);
      },
      supports: (condition) => {
        if (!supportsAnswers.has(condition)) supportsAnswers.set(condition, win.CSS.supports(condition));
        return supportsAnswers.get(condition);
      },
    };
    for (const sheet of doc.styleSheets) {
      if (sheet.disabled) continue;
      const media = sheet.media?.mediaText;
      if (media && !query.media(media)) continue;
      let rules;
      try { rules = sheet.cssRules; } catch { continue; } // cross-origin: unreadable, skip
      scanRules(rules, null, true, state, doc, query);
    }
    const findings = [];
    for (const [key, entry] of state) {
      const root = key.endsWith('|body') ? doc.body : doc.documentElement;
      for (const finding of Object.values(entry)) {
        if (!finding) continue;
        if (finding.active) {
          // The block applies right now, so the computed style is the truth:
          // an overridden or cancelled declaration locks nothing.
          const computed = win.getComputedStyle(root);
          const effective = finding.kind === 'hidden'
            ? computed.display === 'none' || computed.visibility === 'hidden'
            : quarterTurn(computed, win);
          if (effective === false) continue;
        }
        findings.push(finding);
      }
    }
    if (!findings.length) return { status: 'pass' };
    const finding = findings.find((candidate) => candidate.active) ?? findings[0];
    const verb = finding.kind === 'hidden' ? 'hides the page' : 'rotates the page to force the other orientation';
    return {
      status: 'fail',
      message: `A stylesheet rule (${finding.selector} under @media ${finding.condition}) ${verb} when the device is in ${finding.orientation}${finding.active ? ', and it is in effect now' : ''}: the content is locked to a single display orientation. 1.3.4 allows that only where one orientation is essential, which a stylesheet cannot show; this finding assumes it is not.`,
      fix: 'Let the layout adapt to both orientations instead of hiding or rotating the page. If a single orientation is genuinely essential (rare), document why and dismiss this finding.',
    };
  },
};
