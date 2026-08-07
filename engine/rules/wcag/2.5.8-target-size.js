// WCAG SC 2.5.8 Target Size (Minimum) (Level AA)
// WCAG 2.2's new Target Size (Minimum): interactive targets ≥ 24×24 CSS px.
// Exceptions we honour, per the spec:
//   - inline: the target is in a sentence — an inline element with actual
//     text alongside it on the line. Being display:inline alone is NOT
//     enough: nav/footer link lists are inline by default but are standalone
//     targets, not text, and the spec does not exempt them.
//   - spacing: an undersized target is exempt when a 24px-diameter circle
//     centred on it intersects no other target's rectangle and no other
//     undersized target's circle (the spec's circle test, not a
//     centre-to-centre distance).
//   - zero-size rects (element not laid out — nothing to measure)
// Not detectable ("essential", "equivalent control elsewhere") — those need
// the human reviewing the finding.

const TARGETS = 'a[href], button, input, select, [role="button"], [role="link"]';

/** Is this target genuinely sitting in a line of text (the spec's "in a
 *  sentence / size constrained by line-height of non-target text" exception)?
 *  True for inline elements that share a line with non-target text — either a
 *  text node or an inline non-target element carrying text — checked up the
 *  inline-ancestor chain, so a link wrapped in a <sup>/<span> inside a
 *  sentence (Wikipedia-style citations) still counts as in-text. A link in a
 *  nav list (block/list-item parent, only other links beside it) does not. */
/**
 * A target the pointer can never meaningfully hit is exempt from a POINTER
 * target-size rule: the sr-only clip pattern (≤1px boxes), skip links
 * parked off-canvas until focused, clip-path'd controls, opacity: 0.
 * These are keyboard affordances, not pointer targets — and their phantom
 * rects must not count as "crowding" for the real targets around them.
 */
function isHiddenFromPointer(element, rect) {
  if (rect.width <= 1 || rect.height <= 1) return true;
  if (rect.right <= 0 || rect.bottom <= 0) return true; // parked above/left of the canvas
  const style = getComputedStyle(element);
  if ((parseFloat(style.opacity) || 0) === 0) return true;
  if (style.clipPath !== 'none' || (style.clip !== 'auto' && style.position === 'absolute')) return true;
  return false;
}

/**
 * Is this element the thing a click at that point would actually reach, or
 * is something painted over it there?
 *
 * The spacing exception is about targets COMPETING for pointer space, and
 * two targets that can never be hit at the same place do not compete. On any
 * page with a fixed header, scrolling slides ordinary content underneath it:
 * a footer link can end up geometrically 3px from a header button while
 * being completely unclickable there, and counting it as a crowder invents a
 * failure out of the scroll position. That was reported on pour's own site.
 *
 * Only asked about targets that are ALREADY crowding an undersized one, so
 * the hit-test cost is paid on the handful of candidate failures rather than
 * on every target of the page.
 *
 * Out-of-viewport points can't be hit-tested at all: elementsFromPoint is
 * viewport-relative and returns nothing outside it. There the honest answer
 * is "don't know", and don't-know must not silence a finding, so it counts
 * as reachable.
 */
function reachableRects(element, rect) {
  const doc = element.ownerDocument;
  const win = doc.defaultView;
  if (!win || typeof doc.elementsFromPoint !== 'function') return [rect];
  // Per LINE FRAGMENT, never the bounding box. An inline link that wraps has
  // one fragment per line, and the box enclosing them is mostly space the
  // element never paints: its middle falls in the leading BETWEEN the lines,
  // where elementsFromPoint does not contain the element at all. A
  // box-centre probe therefore reads "not hit-testable" for every wrapped
  // link. (Same geometry trap as link-in-text-block's own-line test.)
  //
  // Fragments also make the answer usefully partial. A footer link scrolled
  // half under a fixed header has its first line buried and its second line
  // perfectly clickable, so the honest result is not "reachable" or
  // "covered" but WHICH PART is reachable — and only that part can compete
  // for pointer space with anything nearby.
  const fragments = [...element.getClientRects()].filter((r) => r.width > 0 && r.height > 0);
  const probes = fragments.length ? fragments : [rect];
  const reachable = [];
  let testable = false;
  for (const fragment of probes) {
    const x = fragment.left + fragment.width / 2;
    const y = fragment.top + fragment.height / 2;
    if (x < 0 || y < 0 || x >= win.innerWidth || y >= win.innerHeight) continue;
    const stack = doc.elementsFromPoint(x, y);
    const index = stack.indexOf(element);
    if (index < 0) continue; // this fragment isn't hit-testable; try the next
    testable = true;
    // Anything above it that is part of the same control is not an
    // obstruction: a button's own icon paints over the button, an overlay
    // label over its input. Only a genuinely separate element blocks it.
    if (stack.slice(0, index).every((layer) => layer.contains(element) || element.contains(layer))) {
      reachable.push(fragment);
    }
  }
  // Nothing could be probed at all (entirely out of viewport,
  // pointer-events: none, nothing laid out): don't know, and don't-know must
  // not silence a finding, so the whole rect stands.
  if (!testable) return [rect];
  return reachable;
}

/** Text this element contributes that is NOT inside a target — i.e. does it
 *  read as prose beside the link, or is it just another control in a list? */
function textOutsideTargets(element) {
  for (const node of element.childNodes) {
    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) return true;
    if (node.nodeType === Node.ELEMENT_NODE && !node.matches(TARGETS)
      && textOutsideTargets(node)) return true;
  }
  return false;
}

function isInTextLine(element) {
  let node = element;
  // inline-block/inline-flex links inside a sentence are still "in a line
  // of text" for the spec's exception — the line-height constrains them
  // exactly the same; the text-sibling requirement below is what keeps
  // nav/footer link lists (no non-target text) out of the exemption.
  while (node && getComputedStyle(node).display.startsWith('inline')) {
    for (const sibling of node.parentNode?.childNodes ?? []) {
      if (sibling === node) continue;
      if (sibling.nodeType === Node.TEXT_NODE && sibling.textContent.trim()) return true;
      // What counts is text the sibling contributes OUTSIDE any target, not
      // merely that the sibling isn't a target itself. Testing identity alone
      // let a list of links exempt itself — each <li> is not an anchor, so a
      // sibling <li><a>t</a></li> read as prose and granted the exception to
      // the whole cluster, exactly the nav list this function's contract says
      // to exclude (Wikipedia's "v · t · e" navbox slipped through there).
      // Testing `querySelector(TARGETS)` instead over-corrects the other way:
      // a prose wrapper containing a link is still prose.
      if (sibling.nodeType === Node.ELEMENT_NODE
        && !sibling.matches(TARGETS)
        && textOutsideTargets(sibling)
        && getComputedStyle(sibling).display.startsWith('inline')) return true;
    }
    node = node.parentElement;
  }
  return false;
}

/** Nearest distance from a point to a rectangle (0 when inside it). */
function pointToRectDistance(point, rect) {
  const dx = Math.max(rect.left - point.x, 0, point.x - rect.right);
  const dy = Math.max(rect.top - point.y, 0, point.y - rect.bottom);
  return Math.hypot(dx, dy);
}

/**
 * Both target-size criteria share the geometry; they differ in minimum and
 * exceptions:
 * 2.5.8 Target Size (Minimum), AA — 24px, WITH the spacing exception
 * 2.5.5 Target Size (Enhanced), AAA — 44px, NO spacing exception (the spec
 * lists only equivalent/inline/user-agent/essential there)
 */
export function createTargetSizeRule({ id, tags, help, helpUrl, min, spacingException }) {
  return {
  id,
  impact: 'serious',
  tags,
  help,
  helpUrl,
  selector: 'button, a[href], input:not([type="hidden"]), select, [role="button"], [role="link"]',
  visibility: 'visual', // pointer targets are visual regardless of aria-hidden
  // Judged as a set: the spacing exception needs the other targets' positions.
  evaluateAll(elements) {
    // A control's <label> is part of its activation area — clicking the
    // label activates the control, so the TARGET is the union of both
    // boxes. Without this, every label-wrapped checkbox list fails on the
    // 13px input alone.
    const targetRect = (element) => {
      const rect = element.getBoundingClientRect();
      const label = element.labels?.[0];
      if (!label) return rect;
      const labelRect = label.getBoundingClientRect();
      if (!labelRect.width || !labelRect.height) return rect;
      const left = Math.min(rect.left, labelRect.left);
      const top = Math.min(rect.top, labelRect.top);
      const right = Math.max(rect.right, labelRect.right);
      const bottom = Math.max(rect.bottom, labelRect.bottom);
      return { left, top, right, bottom, width: right - left, height: bottom - top };
    };
    // The spec's User Agent Control exception: a default-styled native
    // checkbox/radio is sized by the browser, not the author.
    const uaControlled = (element) => element.tagName === 'INPUT'
      && (element.type === 'checkbox' || element.type === 'radio')
      && getComputedStyle(element).appearance !== 'none';
    const rects = elements.map(targetRect);
    const centers = rects.map((r) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 }));
    // Zero-area rects are degenerate: either not laid out, or an empty
    // control no pointer can hit at all — its real defect (an empty name,
    // usually) belongs to the name rules, not to size judgment. Pointer-
    // invisible targets (clipped skip links etc.) are excluded the same
    // way, on both sides of the crowding test.
    const laidOut = rects.map((r, i) => r.width > 0 && r.height > 0 && !isHiddenFromPointer(elements[i], r));
    const undersized = rects.map((r, i) => laidOut[i] && (r.width < min || r.height < min));
    // One rect fully inside another is one control drawn twice (stretched-
    // link cards, overlay + inner button) — not two targets crowding.
    const encloses = (a, b) =>
      a.left <= b.left && a.right >= b.right && a.top <= b.top && a.bottom >= b.bottom;

    // ── Obscured targets ──────────────────────────────────────────────
    // The criterion measures the region that ACCEPTS the pointer action.
    // When another target paints over part of this one, clicks in the
    // overlap go to the other target, so the accepting region is only the
    // part left uncovered — a 26px logo link tiled 20px from the next link
    // offers the pointer 20px, whatever its box says (found on ant.design).
    // Box-sized-fine targets are therefore re-measured as the largest
    // uncovered sub-rectangle before they may pass.
    //
    // Overlap only counts between targets that MOVE TOGETHER. A footer
    // link sliding under a fixed header overlaps it at this scroll
    // position and not the next, and asserting a size failure from scroll
    // state invents a defect the layout does not have (the same trap the
    // reachability test below documents). Targets share motion when they
    // share a fixed/sticky context — both inside the same pinned bar, or
    // neither pinned at all.
    const fixedContexts = new Map();
    const fixedContextOf = (element) => {
      if (fixedContexts.has(element)) return fixedContexts.get(element);
      let context = null;
      for (let node = element; node && node !== element.ownerDocument.documentElement; node = node.parentElement) {
        const position = getComputedStyle(node).position;
        if (position === 'fixed' || position === 'sticky') { context = node; break; }
      }
      fixedContexts.set(element, context);
      return context;
    };
    const overlapOf = (a, b) => {
      const left = Math.max(a.left, b.left);
      const top = Math.max(a.top, b.top);
      const right = Math.min(a.right, b.right);
      const bottom = Math.min(a.bottom, b.bottom);
      // Only MATERIAL overlap obscures. A 1–2px intrusion is the border-
      // collapse convention (button groups with negative margins) plus
      // layout rounding — asserting a size failure from a 1px shave off a
      // 24px control invents a defect no pointer will ever notice (seen
      // live: a consent button measured 112×23 through a 1px overlap).
      return right - left > 2 && bottom - top > 2
        ? { left, top, right, bottom, width: right - left, height: bottom - top } : null;
    };
    /** Does target j's paint sit ABOVE target i where they overlap? The
     *  paint stack at the overlap's midpoint answers it directly; the first
     *  layer belonging to exactly one of the two decides. Off-viewport
     *  points cannot be probed, and guessing from document order or
     *  z-index is not evidence on pages full of stacking contexts
     *  (transforms, opacity), so an unprovable overlap asserts nothing —
     *  an audit run with the region scrolled into view proves it then. */
    const paintsOver = (j, i, overlap) => {
      const doc = elements[i].ownerDocument;
      const win = doc.defaultView;
      const x = overlap.left + overlap.width / 2;
      const y = overlap.top + overlap.height / 2;
      if (!win || typeof doc.elementsFromPoint !== 'function'
        || x < 0 || y < 0 || x >= win.innerWidth || y >= win.innerHeight) return false;
      for (const layer of doc.elementsFromPoint(x, y)) {
        const inJ = elements[j] === layer || elements[j].contains(layer);
        const inI = elements[i] === layer || elements[i].contains(layer);
        if (inJ && !inI) return true;
        if (inI && !inJ) return false;
      }
      return false; // neither reachable there — a third element's problem, not j's
    };
    /** Largest uncovered sub-rectangle after removing the overlap: the best
     *  of the four slabs beside/above/below it (exact for one obscurer,
     *  a safe under-approximation applied sequentially for several). */
    const uncovered = (rect, overlap) => {
      const slabs = [
        { left: rect.left, top: rect.top, right: overlap.left, bottom: rect.bottom },
        { left: overlap.right, top: rect.top, right: rect.right, bottom: rect.bottom },
        { left: rect.left, top: rect.top, right: rect.right, bottom: overlap.top },
        { left: rect.left, top: overlap.bottom, right: rect.right, bottom: rect.bottom },
      ].map((s) => ({ ...s, width: s.right - s.left, height: s.bottom - s.top }))
        .filter((s) => s.width >= 1 && s.height >= 1);
      // Note: rect may be a DOMRect, whose properties do not survive object
      // spread — the zero-rect is built from explicit reads.
      if (!slabs.length) {
        return { left: rect.left, top: rect.top, right: rect.left, bottom: rect.top, width: 0, height: 0 };
      }
      return slabs.reduce((best, s) => (s.width * s.height > best.width * best.height ? s : best));
    };
    // Spatial hash so finding overlap candidates stays near-linear on pages
    // with tens of thousands of targets: only targets sharing a cell can
    // intersect, so each target is tested against its cell-mates only.
    const CELL = 256;
    let cellIndex = null;
    const cellsOf = (r) => {
      const keys = [];
      for (let cx = Math.floor(r.left / CELL); cx <= Math.floor(r.right / CELL); cx++) {
        for (let cy = Math.floor(r.top / CELL); cy <= Math.floor(r.bottom / CELL); cy++) {
          keys.push(`${cx}:${cy}`);
        }
      }
      return keys;
    };
    const overlapCandidates = (i) => {
      if (!cellIndex) {
        cellIndex = new Map();
        rects.forEach((r, j) => {
          if (!laidOut[j]) return;
          for (const key of cellsOf(r)) {
            if (!cellIndex.has(key)) cellIndex.set(key, []);
            cellIndex.get(key).push(j);
          }
        });
      }
      const seen = new Set();
      for (const key of cellsOf(rects[i])) {
        for (const j of cellIndex.get(key) ?? []) if (j !== i) seen.add(j);
      }
      return seen;
    };
    /** The pointer-accepting rect of a box-sized-fine target, reduced by
     *  every overlapping target painted above it — or null when nothing
     *  qualifying overlaps. */
    const obscuredRect = (i) => {
      let effective = null;
      for (const j of overlapCandidates(i)) {
        if (elements[j].contains(elements[i]) || elements[i].contains(elements[j])) continue; // same control, nested markup
        if (encloses(rects[j], rects[i]) || encloses(rects[i], rects[j])) continue; // one control drawn twice
        // Two links to the same place are one control in two boxes (a
        // card's image link over its title link): clicks in the overlap
        // land on the same destination, which is the criterion's
        // "equivalent" case, provable here because the hrefs match.
        if (typeof elements[i].href === 'string' && elements[i].href === elements[j].href) continue;
        const overlap = overlapOf(effective ?? rects[i], rects[j]);
        if (!overlap) continue;
        if (fixedContextOf(elements[j]) !== fixedContextOf(elements[i])) continue; // scroll-state, not layout
        if (!paintsOver(j, i, overlap)) continue;
        effective = uncovered(effective ?? rects[i], overlap);
      }
      return effective;
    };

    return elements.map((element, i) => {
      if (!laidOut[i]) return { status: 'pass' }; // not laid out / not a pointer target
      if (!undersized[i]) {
        // Box is big enough — but the pointer only gets the uncovered part.
        const effective = obscuredRect(i);
        if (!effective || (effective.width >= min && effective.height >= min)) return { status: 'pass' };
        if (isInTextLine(element)) return { status: 'pass' };
        // A target the pointer never actually hits is a keyboard
        // affordance, not a pointer target — an in-flow skip link whose
        // box sits beneath the header's paint (python.org's is hit-tested
        // to its container at every probe point). Probed per fragment:
        // if every in-viewport probe misses the element, pointers never
        // interact with it and its pointer size is nobody's defect.
        // (Hit-tests paid only here, on candidate failures.)
        const everHit = (() => {
          const doc = element.ownerDocument;
          const win = doc.defaultView;
          if (!win || typeof doc.elementsFromPoint !== 'function') return true;
          const fragments = [...element.getClientRects()].filter((r) => r.width > 0 && r.height > 0);
          let tested = false;
          for (const fragment of (fragments.length ? fragments : [rects[i]])) {
            const x = fragment.left + fragment.width / 2;
            const y = fragment.top + fragment.height / 2;
            if (x < 0 || y < 0 || x >= win.innerWidth || y >= win.innerHeight) continue;
            tested = true;
            if (doc.elementsFromPoint(x, y).includes(element)) return true;
          }
          return !tested; // nothing probe-able → don't know → don't silence
        })();
        if (!everHit) return { status: 'pass' };
        // The spacing exception cannot apply: the obscuring target is at
        // distance zero. UA-control cannot either: the browser sized the
        // box, but the author's layout took part of it away.
        const rect = rects[i];
        return {
          status: 'fail',
          message: `This target's box is ${Math.round(rect.width)}×${Math.round(rect.height)}px, but another target overlaps it and clicks in the overlap go there — the part that still accepts the pointer is ${Math.round(effective.width)}×${Math.round(effective.height)}px, below the ${min}×${min}px minimum.`,
          fix: 'Space the targets so they no longer overlap, or enlarge this one until the uncovered part reaches the minimum.',
          data: {
            box: { width: Math.round(rect.width), height: Math.round(rect.height) },
            effective: { width: Math.round(effective.width), height: Math.round(effective.height) },
          },
        };
      }
      if (uaControlled(element)) return { status: 'pass' }; // UA Control exception
      if (isInTextLine(element)) return { status: 'pass' };
      if (spacingException) {
        // Spacing exception: the min-sized circle around this target must
        // clear every other target's rect and every other undersized
        // target's circle.
        const crowds = (other, j) => {
          if (j === i || !laidOut[j]) return false;
          if (other.contains(element) || element.contains(other)) return false; // same control, nested markup
          if (encloses(rects[j], rects[i]) || encloses(rects[i], rects[j])) return false;
          const within = (box) => {
            if (undersized[j]) {
              const c = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
              if (Math.hypot(c.x - centers[i].x, c.y - centers[i].y) < min) return true;
            }
            return pointToRectDistance(centers[i], box) < min / 2;
          };
          // Whole-rect test first, as a cheap superset: no part of a target
          // can be closer than the box enclosing it, so a box that doesn't
          // reach rules the target out without any hit-testing. Only the
          // survivors pay for the paint-order queries, which on a page of
          // hundreds of targets is a handful.
          if (!within(rects[j])) return false;
          // Then the honest test: only the parts a pointer can actually
          // reach compete for pointer space. A link whose first line is
          // buried under a fixed header and whose second line is clear is
          // crowding from its second line or not at all.
          return reachableRects(other, rects[j]).some(within);
        };
        const crowded = elements.some(crowds);
        if (!crowded) return { status: 'pass' };
        // Deliberately NOT applied to the target itself. A crowder that
        // can't be clicked breaks the premise of the exception, because it
        // isn't competing for anything. A target that happens to be under a
        // cookie banner right now is still 20×20 the moment that banner is
        // dismissed, and suppressing it would hide a real defect behind a
        // transient overlay, which is the wrong way round.
      }
      const rect = rects[i];
      return {
        status: 'fail',
        message: spacingException
          ? `This target is ${Math.round(rect.width)}×${Math.round(rect.height)}px AND another target crowds it (within ${min}px) — small targets are only acceptable with clear space around them; crowded ones are hard to hit for users with motor impairments.`
          : `This target is ${Math.round(rect.width)}×${Math.round(rect.height)}px — below the ${min}×${min}px minimum, hard to hit for users with motor impairments.`,
        fix: `Increase the element’s size or padding to at least ${min}×${min}px${spacingException ? ', or add spacing between the targets' : ''}.`,
      };
    });
  },
  };
}

export default createTargetSizeRule({
  id: 'target-size',
  tags: ['wcag22aa', 'wcag258'],
  help: 'Interactive targets must be at least 24×24 pixels',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html',
  min: 24,
  spacingException: true,
});
