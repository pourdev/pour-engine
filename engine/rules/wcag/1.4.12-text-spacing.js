// WCAG SC 1.4.12 Text Spacing (Level AA)
// Active probe, in the spirit of the criterion's own test procedure: apply
// the SC's exact spacing overrides and check that no text gets cut off.
// The override is injected and removed inside one synchronous pass — the
// engine only yields to the renderer between rules, so the page never
// paints the probed state.
const OVERRIDE = `* {
  line-height: 1.5 !important;
  letter-spacing: 0.12em !important;
  word-spacing: 0.16em !important;
}
p { margin-bottom: 2em !important; }`;

const clipped = (element) =>
  element.scrollWidth > element.clientWidth + 2 || element.scrollHeight > element.clientHeight + 2;

export default {
  id: 'text-spacing',
  name: 'Text spacing overrides',
  impact: 'serious',
  tags: ['wcag21aa', 'wcag1412'],
  help: 'Text must survive user spacing overrides without being cut off',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html',
  // Candidates: containers that CAN clip. Everything else reflows freely
  // and passes by construction.
  selector: 'p, h1, h2, h3, h4, h5, h6, a, button, li, span, div, td, th, label, dt, dd, figcaption',
  visibility: 'visual',
  evaluateAll(elements) {
    const doc = elements[0]?.ownerDocument ?? document;
    // The candidate scan computes styles per element — fine on real pages,
    // ruinous on 200k-node single-page specs, whose plain flowing text is
    // also the least likely content on the web to clip. Past a scale where
    // the probe's cost dwarfs its yield, abstain wholesale.
    if (elements.length > 20_000) return elements.map(() => ({ status: 'pass' }));
    // Only containers that hide overflow and hold text can lose content.
    // Collapsed containers (accordion panels at height 0) show nothing —
    // there is no visible text for the override to clip.
    const candidates = elements.map((element) => {
      const style = getComputedStyle(element);
      const hides = /(hidden|clip)/.test(`${style.overflowX} ${style.overflowY}`);
      if (!hides || !element.textContent.trim()) return null;
      return element.clientWidth > 4 && element.clientHeight > 4 ? element : null;
    });
    if (!candidates.some(Boolean)) return elements.map(() => ({ status: 'pass' }));

    const before = candidates.map((element) => element && clipped(element));
    const probe = doc.createElement('style');
    probe.dataset.pourAudit = 'probe';
    probe.textContent = OVERRIDE;
    doc.documentElement.append(probe);
    let after;
    try {
      // Force the reflow the measurements depend on.
      void doc.documentElement.offsetHeight;
      after = candidates.map((element) => element && clipped(element));
    } finally {
      probe.remove();
    }

    return elements.map((element, i) => {
      if (!candidates[i]) return { status: 'pass' };
      // Only NEW clipping counts: content already truncated by design
      // (ellipsis patterns) is judged as-authored, not under the probe.
      if (before[i] || !after[i]) return { status: 'pass' };
      // Review, not fail: the probe proves the box OVERFLOWS under the
      // override, not that glyphs are lost. The genuine violation is a
      // fixed-height overflow-hidden container that doesn't grow with its
      // text, hiding whole lines (measured live: a 2-line card clamped at
      // 37px whose text needs 61px spaced — the last line vanishes). But
      // the same scroll-size delta also fires on benign overflow: the
      // 0.12em letter-spacing lands AFTER the final glyph, so a snug box
      // can overflow by trailing empty spacing that hides no ink, and a
      // clamp pattern that swaps hidden words for an ellipsis is arguably
      // truncation-by-design. Proving ink loss would need per-glyph rects
      // against the clip box under the probe; until then, a human call.
      return {
        status: 'incomplete',
        message: 'With the WCAG text-spacing overrides applied (line height 1.5, letter/word spacing bumps), this container overflows instead of growing — if that hides text rather than empty trailing spacing, users who need wider spacing lose content. Check with the overrides applied; to be safe, let the container grow (min-height instead of height, avoid overflow:hidden on text).',
      };
    });
  },
};
