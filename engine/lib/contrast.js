// WCAG contrast math (WCAG 2.x, relative luminance per sRGB).

// Computed colours do not all come back as `rgb()` any more. A colour the
// author wrote in a modern syntax is returned in THAT syntax: Chrome and
// Safari hand back `color(srgb 0.98 0.95 0.91)` verbatim, and Tailwind 4
// emits `oklch()` for its whole palette. Matching only the legacy comma form
// made every such colour parse as null, which resolveBackground reads as
// "nothing painted here" — so contrast got measured against whatever sat
// BEHIND the element instead of the element's own background, and a real
// failure could be reported as a pass or waved through as unreadable.
//
// Two tiers. The syntaxes we can convert exactly are converted here; anything
// else (display-p3, oklch, lab, color-mix output…) is handed to the browser,
// which paints one pixel and tells us the sRGB it produced. sRGB is the space
// WCAG's luminance maths is defined in, so that conversion is the right one.
const LEGACY_RGB = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+%?)\s*)?\)$/;
const MODERN_RGB = /^rgba?\(\s*([\d.]+%?)\s+([\d.]+%?)\s+([\d.]+%?)\s*(?:\/\s*([\d.]+%?)\s*)?\)$/;
const SRGB_COLOR = /^color\(\s*srgb\s+(-?[\d.]+%?)\s+(-?[\d.]+%?)\s+(-?[\d.]+%?)\s*(?:\/\s*([\d.]+%?)\s*)?\)$/;

const clamp255 = (value) => Math.min(255, Math.max(0, value));
/** A channel token: `128`, `50%`, or (in color()) `0.5` on a 0-1 scale. */
const channel = (token, unitScale) =>
  clamp255(token.endsWith('%') ? (parseFloat(token) / 100) * 255 : parseFloat(token) * unitScale);
const alphaOf = (token) => {
  if (token === undefined) return 1;
  const value = parseFloat(token);
  return Math.min(1, Math.max(0, token.endsWith('%') ? value / 100 : value));
};

/** Colour spaces we convert ourselves, exactly and with no DOM. */
function parseKnownSyntax(cssColor) {
  const rgb = LEGACY_RGB.exec(cssColor) ?? MODERN_RGB.exec(cssColor);
  if (rgb) return { r: channel(rgb[1], 1), g: channel(rgb[2], 1), b: channel(rgb[3], 1), a: alphaOf(rgb[4]) };
  const srgb = SRGB_COLOR.exec(cssColor);
  if (srgb) return { r: channel(srgb[1], 255), g: channel(srgb[2], 255), b: channel(srgb[3], 255), a: alphaOf(srgb[4]) };
  return null;
}

// One reused 1×1 canvas. Only unknown syntaxes reach it, and the result is
// cached by string, so a page pays for it once per distinct colour.
let probe;
let probeUnavailable = false;
function paintToSrgb(cssColor) {
  if (probeUnavailable) return null;
  try {
    probe ??= document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    if (!probe) { probeUnavailable = true; return null; }
    // An invalid value leaves fillStyle untouched, so two different sentinels
    // tell "the browser rejected it" apart from "it really is that colour".
    probe.fillStyle = '#000000';
    probe.fillStyle = cssColor;
    const asBlack = probe.fillStyle;
    probe.fillStyle = '#ffffff';
    probe.fillStyle = cssColor;
    if (asBlack === '#000000' && probe.fillStyle === '#ffffff') return null; // rejected by the browser
    probe.clearRect(0, 0, 1, 1);
    probe.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = probe.getImageData(0, 0, 1, 1).data;
    // getImageData un-premultiplies, which loses precision as alpha falls;
    // recover the colour from the alpha the browser reported.
    return { r, g, b, a: a / 255 };
  } catch {
    probeUnavailable = true; // no canvas (or readback blocked): stop trying
    return null;
  }
}

/** Parse a computed CSS colour → {r,g,b,a}, or null when it cannot be read.
 *  Cached by string: pages use a handful of distinct colours across
 *  thousands of elements, and parsing was a top cost in contrast audits.
 *  Callers must not mutate the returned object. */
const colorCache = new Map();
export function parseColor(cssColor) {
  if (cssColor == null) return null;
  if (colorCache.has(cssColor)) return colorCache.get(cssColor);
  const color = parseKnownSyntax(cssColor) ?? paintToSrgb(cssColor);
  if (colorCache.size < 10_000) colorCache.set(cssColor, color); // bounded: computed colors are few
  return color;
}

function channelLuminance(value) {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function luminance({ r, g, b }) {
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
}

/** WCAG contrast ratio between two opaque colours: 1 (none) → 21 (max). */
export function contrastRatio(foreground, background) {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Display a ratio truncated, never rounded up: 4.495 must read "4.49",
 * because "4.50:1 — below the 4.5:1 minimum" reads as a contradiction.
 * Shared by the rules and the /contrast/ checker so the two surfaces can
 * never show the same ratio differently. Above 10 one decimal is plenty
 * (no text threshold lives up there), and "21:1" reads better than
 * "21.0:1" — a trailing zero implies precision the eye can use.
 */
export function showRatio(ratio) {
  const text = ratio >= 10
    ? (Math.floor(ratio * 10) / 10).toFixed(1)
    : (Math.floor(ratio * 100) / 100).toFixed(2);
  return text.replace(/\.0+$/, '');
}

/** Alpha-composite `top` over `bottom` (both {r,g,b,a}) → opaque colour. */
export function composite(top, bottom) {
  const a = top.a + bottom.a * (1 - top.a);
  const blend = (t, b) => (t * top.a + b * bottom.a * (1 - top.a)) / (a || 1);
  return { r: blend(top.r, bottom.r), g: blend(top.g, bottom.g), b: blend(top.b, bottom.b), a };
}

/**
 * Walk up from an element to find the effective opaque background colour.
 * Returns null when it can't be determined (background image/gradient, or
 * nothing opaque found) — callers should report "incomplete", not guess.
 */
// Per-audit memoization: thousands of text elements share the same ancestor
// chains, so resolved backgrounds and opacities are cached per element. The
// engine calls resetAuditCaches() at the start of every run — caches must
// never survive into a re-audit of a changed page.
let backgroundCache = new WeakMap();
let opacityCache = new WeakMap();
let opacityAnimatorsCache = null;
let mediaRectsCache = null;
let panelRectsCache = null;
let pseudoCache = new WeakMap();
let zeroClipCache = new WeakMap();
let firstLineRulesCache = new WeakMap();
const HAS_IMAGE = Symbol('background-image in chain');

export function resetAuditCaches() {
  backgroundCache = new WeakMap();
  opacityCache = new WeakMap();
  opacityAnimatorsCache = null;
  mediaRectsCache = null;
  panelRectsCache = null;
  pseudoCache = new WeakMap();
  zeroClipCache = new WeakMap();
  firstLineRulesCache = new WeakMap();
}

/**
 * True when the element sits inside a subtree erased by a ZERO-AREA clip —
 * the sr-only recipe (clip: rect(0,0,0,0) / clip-path: inset(50%) on an
 * absolutely positioned wrapper) applied to an ANCESTOR, which is where it
 * usually lives: a chart's accessible data table hides the table, and the
 * judged element is a cell inside it. Only provably zero-area patterns
 * count: a clip rect with no width or height (any `auto` component keeps
 * the element judged), or a percentage inset consuming a full axis.
 * Partial clips never hide. Verdicts cache per ancestor, so a page pays
 * per container, not per descendant.
 */
export function inZeroClipSubtree(element) {
  for (let a = element; a; a = a.parentElement) {
    let hidden = zeroClipCache.get(a);
    if (hidden === undefined) {
      const s = getComputedStyle(a);
      hidden = false;
      if (s.clip !== 'auto' && s.position !== 'static') {
        const m = /rect\(([^)]+)\)/.exec(s.clip);
        if (m) {
          const parts = m[1].split(',').map((v) => v.trim());
          if (!parts.includes('auto') && parts.length === 4) {
            const [t, r, b, l] = parts.map(parseFloat);
            if (r - l <= 0 || b - t <= 0) hidden = true;
          }
        }
      }
      if (!hidden && s.clipPath && s.clipPath !== 'none') {
        const m = /inset\(([^)]+)\)/.exec(s.clipPath);
        if (m && !m[1].includes('px')) {
          const parts = m[1].trim().split(/\s+/).map(parseFloat);
          const [t, r = t, b = t, l = r] = parts;
          if (t + b >= 100 || l + r >= 100) hidden = true;
        }
      }
      zeroClipCache.set(a, hidden);
    }
    if (hidden) return true;
  }
  return false;
}

/**
 * The computed `background-color` STRING that ended the background walk, as
 * the author's stylesheet produced it. Only when one opaque colour settled
 * it: translucent layers composite into something no single declaration in
 * the CSS holds, and there is nothing honest to point at.
 *
 * Reported so a failure names a colour the developer can actually find. A
 * page written in oklch() or color(srgb …) gets told its ratio in sRGB, and
 * searching the stylesheet for that rgb() value finds nothing at all.
 */
export function backgroundColorSource(element) {
  for (let node = element; node && node.nodeType === 1;
    node = node.assignedSlot ?? node.parentElement ?? node.getRootNode()?.host) {
    const style = getComputedStyle(node);
    if (style.backgroundImage !== 'none' && !paintsNothing(style.backgroundImage)) return null;
    const color = parseColor(style.backgroundColor);
    if (!color || color.a === 0) continue; // transparent: keep walking, as the resolver does
    return color.a >= 1 ? style.backgroundColor : null; // translucent: composited, no single source
  }
  return null;
}

/**
 * Absolute URLs of images that sampling found to have no opaque pixels.
 * Populated by imageLuminanceRange (async) and read by the background walk
 * (sync): by the time a rule falls back to the walk, the image over that
 * text has already been sampled, so the fact is in hand. Lives as long as
 * the sample cache does — it describes the image, not the page.
 */
const transparentImages = new Set();

/** True when every layer of this computed background-image is a url() known
 *  to paint nothing — so the layer cannot change what is behind it. Any
 *  gradient, or any unsampled image, makes that unknowable. */
function paintsNothing(backgroundImage) {
  if (backgroundImage.includes('gradient(')) return false;
  const urls = [...backgroundImage.matchAll(/url\(["']?(.*?)["']?\)/g)].map((m) => m[1]);
  return urls.length > 0 && urls.every((url) => transparentImages.has(url));
}

function canvasColor(doc) {
  // Pages using color-scheme: dark get a dark canvas from the browser even
  // with no author background — assuming white there inverts every result.
  const scheme = getComputedStyle(doc.documentElement).colorScheme ?? '';
  const prefersDark = typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;
  const useDark = /dark/.test(scheme) && (!/light/.test(scheme) || prefersDark);
  return useDark ? { r: 18, g: 18, b: 18, a: 1 } : { r: 255, g: 255, b: 255, a: 1 };
}

/** Resolved background color behind an element (compositing translucent
 *  layers down to the canvas), or null when a background image intervenes.
 *  Walks the FLAT tree (crosses shadow-host boundaries) and memoizes per
 *  element — repeated ancestors resolve once per audit. */
function resolveBackground(element, doc) {
  if (!element || element.nodeType !== 1) return canvasColor(doc);
  if (backgroundCache.has(element)) {
    const cached = backgroundCache.get(element);
    return cached === HAS_IMAGE ? null : cached;
  }
  let result;
  const style = getComputedStyle(element);
  if (style.backgroundImage !== 'none' && !paintsNothing(style.backgroundImage)) {
    result = null;
  } else {
    const color = parseColor(style.backgroundColor);
    if (color && color.a >= 1) {
      result = color;
    } else {
      // The FLAT-tree parent: a slotted element's backdrop chain runs
      // through its slot into the shadow tree it renders in — walking the
      // light parent instead skipped every background painted inside the
      // outer component's shadow (a consent banner's blue container lived
      // there, and its slotted copy was judged against the page white).
      const behind = resolveBackground(
        element.assignedSlot ?? element.parentElement ?? element.getRootNode()?.host, doc);
      result = behind === null ? null : (color && color.a > 0 ? composite(color, behind) : behind);
    }
  }
  backgroundCache.set(element, result === null ? HAS_IMAGE : result);
  return result;
}

export function effectiveBackground(element) {
  return resolveBackground(element, element.ownerDocument);
}

/**
 * Is the element's effective opacity mid-flight — a running CSS
 * animation/transition (including scroll-driven timelines) touching opacity
 * on it or any flat-tree ancestor? A contrast reading taken mid-fade is a
 * snapshot of a transient frame, not the page's resting state — callers
 * should report those for human review instead of failing them.
 */
/** Per-audit set of elements with a running animation/transition that
 *  touches opacity. Built from ONE document.getAnimations() call: per-node
 *  getAnimations() filters every animation on the page each time, which is
 *  O(elements × animations) — on animation-heavy pages (scroll-driven
 *  fades everywhere) that alone took minutes; the document-wide call is
 *  single-digit milliseconds. */
function opacityAnimators(doc) {
  if (!opacityAnimatorsCache) {
    // target → the opacity it will REST at (null = unknowable, assume full).
    opacityAnimatorsCache = new WeakMap();
    for (const animation of (typeof doc.getAnimations === 'function' ? doc.getAnimations() : [])) {
      // Only animations actually RUNNING are mid-flight. A finished fade
      // (fill: forwards) resting at a dim opacity, or a paused one, IS the
      // presented state — the computed style already reflects it.
      if (animation.playState !== 'running') continue;
      const target = animation.effect?.target;
      if (!target) continue;
      const keyframes = animation.effect.getKeyframes?.() ?? [];
      if (!keyframes.some((frame) => frame.opacity !== undefined)) continue;
      // Where does this animation LAND? Finite + fill forwards/both rests at
      // its last opacity keyframe — an entrance fading to 30% is presented
      // at 30% forever after, and must be judged there, not at full.
      // Infinite loops and non-filling animations rest at the underlying
      // style value, which the mid-flight computed style can't reveal: null.
      let rest = null;
      const timing = animation.effect.getComputedTiming?.() ?? {};
      if (Number.isFinite(timing.endTime) && (timing.fill === 'forwards' || timing.fill === 'both')) {
        const last = [...keyframes].reverse().find((frame) => frame.opacity !== undefined);
        const value = parseFloat(last?.opacity);
        if (Number.isFinite(value)) rest = value;
      }
      const previous = opacityAnimatorsCache.get(target);
      // Two opacity animations on one element: keep the more conservative
      // (dimmer) resting value; null (unknown) never overrides a known one.
      if (previous === undefined || (rest !== null && (previous === null || rest < previous))) {
        opacityAnimatorsCache.set(target, rest);
      }
    }
  }
  return opacityAnimatorsCache;
}

export function opacityAnimating(element) {
  const animators = opacityAnimators(element.ownerDocument);
  for (let node = element; node && node.nodeType === 1; node = node.parentElement ?? node.getRootNode()?.host) {
    if (animators.has(node)) return true;
  }
  return false;
}

/** The cumulative opacity this element RESTS at once running animations
 *  land: animating nodes contribute their fill-forwards end value (or full
 *  opacity when the landing point is unknowable), others their computed
 *  opacity. This is what mid-flight text should be judged against. */
export function restingOpacity(element) {
  const animators = opacityAnimators(element.ownerDocument);
  let product = 1;
  for (let node = element; node && node.nodeType === 1; node = node.parentElement ?? node.getRootNode()?.host) {
    if (animators.has(node)) {
      const rest = animators.get(node);
      product *= rest === null ? 1 : rest;
    } else {
      product *= parseFloat(getComputedStyle(node).opacity) || 0;
    }
  }
  return product;
}

/** Product of the element's and its flat-tree ancestors' opacity, memoized
 *  per audit. Near-zero means the element isn't visually presented at all. */
export function cumulativeOpacity(element) {
  if (!element || element.nodeType !== 1) return 1;
  let cached = opacityCache.get(element);
  if (cached === undefined) {
    const parent = element.parentElement ?? element.getRootNode()?.host ?? null;
    cached = (parseFloat(getComputedStyle(element).opacity) || 0) * cumulativeOpacity(parent);
    opacityCache.set(element, cached);
  }
  return cached;
}

/** One node's own opacity at rest: the landing value of a running
 *  animation on it, otherwise its computed opacity. */
function nodeRestingOpacity(node) {
  const animators = opacityAnimators(node.ownerDocument);
  if (animators.has(node)) {
    const rest = animators.get(node);
    return rest === null ? 1 : rest;
  }
  const value = parseFloat(getComputedStyle(node).opacity);
  return Number.isFinite(value) ? value : 1;
}

/**
 * The pair a viewer is presented with when the text sits inside an
 * opacity group that also paints its own background.
 *
 * CSS group opacity renders an element and its subtree together, then
 * blends that whole picture over what lies behind the element. Folding the
 * opacity into the text colour alone and judging it against the group's
 * own (undimmed) background describes a pair the page never paints: black
 * text in a white card at opacity .5 over a mid-grey page is presented as
 * rgb(64) on rgb(191), 5.6:1, while "half-black on white" scores 3.97:1.
 *
 * Walks the flat tree from the text to the OUTERMOST node with opacity
 * below 1, compositing each node's background beneath the accumulated text
 * and background pixels and then scaling both by that node's opacity, which
 * is exactly the order the renderer applies. The result is composited over
 * the background resolved behind the outermost carrier.
 *
 * Returns null when the chain carries no opacity, or no background paint
 * inside the group (the old text-only blend is then correct), or paint this
 * arithmetic cannot follow (an image, a blend mode, a filter inside the
 * group). Returns { unresolved: true, opacity } when the backdrop behind the
 * carrier is itself an image: the pair is then a human call, not a guess.
 * Otherwise { foreground, background, opacity, text, paint }: the presented
 * pair (both opaque) and the group's own pixels before compositing.
 * (2026-08-25 overnight audit, defect 1.)
 */
export function opacityGroupPaint(element, foreground) {
  const flatParent = (node) => node.parentElement ?? node.getRootNode()?.host ?? null;
  let top = null;
  let opacity = 1;
  for (let node = element; node && node.nodeType === 1; node = flatParent(node)) {
    const own = nodeRestingOpacity(node);
    if (own < 1) { top = node; opacity *= own; }
  }
  if (!top) return null;
  let text = { ...foreground };
  let paint = { r: 0, g: 0, b: 0, a: 0 };
  let painted = false;
  for (let node = element; node && node.nodeType === 1; node = flatParent(node)) {
    const style = getComputedStyle(node);
    if (style.backgroundImage !== 'none' && !paintsNothing(style.backgroundImage)) return null;
    if ((style.mixBlendMode && style.mixBlendMode !== 'normal')
      || (style.filter && style.filter !== 'none')
      || (style.backdropFilter && style.backdropFilter !== 'none')) return null;
    const color = parseColor(style.backgroundColor);
    if (color && color.a > 0) {
      // A node's background lies beneath its content and inside its own
      // opacity group, so it composites in before that group's alpha applies.
      text = composite(text, color);
      paint = composite(paint, color);
      painted = true;
    }
    const own = nodeRestingOpacity(node);
    if (own < 1) {
      text = { ...text, a: text.a * own };
      paint = { ...paint, a: paint.a * own };
    }
    if (node === top) break;
  }
  if (!painted) return null;
  const behindNode = flatParent(top);
  const behind = behindNode ? effectiveBackground(behindNode) : canvasColor(element.ownerDocument);
  if (!behind) return { unresolved: true, opacity };
  // `text` and `paint` are the group's own rendered pixels, alpha intact,
  // so a caller can re-present the pair over a different backdrop (an
  // overlapping panel the walk cannot see) without walking again.
  return { foreground: composite(text, behind), background: composite(paint, behind), opacity, text, paint };
}

/**
 * Is something painted between this element and the ancestor that provides
 * its background colour — a positioned <img>, video, overlay…? If so, the
 * ancestor-walk colour is not what the user actually sees (white caption
 * over a dark photo on a white section, for example).
 * Returns the obscuring layer element, or null. Samples the element's
 * centre point: cheap, but misses partial overlaps and elements scrolled
 * out of view — a known approximation.
 */
export function backgroundObscured(element) {
  const doc = element.ownerDocument;
  if (typeof doc.elementsFromPoint !== 'function') return null;
  // Text sitting on the element's OWN opaque paint can't be affected by
  // anything painted beneath — only a background inherited from an
  // ancestor's walk-up can be intercepted by an in-between layer.
  const own = parseColor(getComputedStyle(element).backgroundColor);
  if (own && own.a >= 1) return null;
  const rect = element.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  const win = doc.defaultView;
  const x = Math.min(Math.max(rect.left + rect.width / 2, 0), win.innerWidth - 1);
  const y = Math.min(Math.max(rect.top + rect.height / 2, 0), win.innerHeight - 1);
  const stack = doc.elementsFromPoint(x, y);
  const start = stack.indexOf(element);
  // Outside the viewport the hit-test can't see the element at all, so
  // "nothing found" would be a false all-clear, not a verdict — callers
  // must fall back to a scroll-independent check before asserting a fail.
  if (start === -1) return 'unverifiable';

  for (const layer of stack.slice(start + 1)) {
    if (layer.contains(element)) {
      const style = getComputedStyle(layer);
      if (style.backgroundImage !== 'none') return layer;
      const bg = parseColor(style.backgroundColor);
      if (bg && bg.a >= 1) return null; // opaque ancestor: anything deeper is hidden
      continue;
    }
    return layer; // non-ancestor painted beneath the text (hero image, overlay…)
  }
  return null;
}

/** Centre of the element's first rendered text box — the point worth
 *  hit-testing. A Range around the first non-blank text node beats the
 *  element's own rect centre: wide containers with left-aligned text would
 *  hit-test empty space. Falls back to the element rect. */
function textSamplePoint(element) {
  for (const node of element.childNodes) {
    if (node.nodeType !== 3 || !node.textContent.trim()) continue;
    const range = element.ownerDocument.createRange();
    range.selectNodeContents(node);
    const rect = range.getClientRects()[0];
    if (rect && rect.width && rect.height) {
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }
  }
  const rect = element.getBoundingClientRect();
  return rect.width && rect.height
    ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    : null;
}

/**
 * The backdrop actually painted beneath the element's text, resolved with
 * the browser's own hit-testing — true paint order, not a reimplemented
 * stacking model. Walks the elementsFromPoint stack downward from the
 * element, compositing translucent background colours until an opaque one
 * settles the answer. This is what sees backdrops the ancestor walk cannot:
 * positioned siblings, hero panels, overlays painted under overlaid text.
 *
 * Returns:
 *   { color, scrim }   — backdrop resolved with confidence
 *   { image: element, scrim } — an image/background-image paints beneath:
 *                        sample it
 *   'offscreen'        — sample point outside the viewport; hit-testing is
 *                        blind there, callers need a scroll-independent path
 *   'unresolved'       — in-viewport but unanswerable (shadow retargeting hid
 *                        the element from the stack, blend/filter layers…)
 *
 * `scrim` (when present) is the list of translucent viewport-scale layers
 * painted ON TOP of the text — a modal veil, loading overlay, consent dimmer.
 * The text is presented through them, so the resting colours are not what the
 * user sees; scrimPaint() turns them into the paint that dims it.
 *
 * Known approximation: pointer-events:none layers paint but never appear in
 * hit-test stacks, so a decorative tint above the resolved colour can be
 * missed. The ancestor walk (which callers still run) covers the common
 * cases of that shape.
 */
const px = (value) => (typeof value === 'string' && value.endsWith('px') ? parseFloat(value) : NaN);

/**
 * The viewport rect a positioned pseudo-element paints into, or null when
 * its geometry isn't statically resolvable.
 *
 * An absolutely positioned box resolves against its containing block's
 * PADDING box, which is the nearest ancestor that establishes one — usually
 * the host itself (authors nearly always set position: relative for exactly
 * this), but not always, so the chain is walked rather than assumed.
 * Non-px insets, rotations and scales return null, which makes callers
 * abstain rather than guess a rect.
 */
function containingBlockFor(host) {
  for (let node = host; node && node.nodeType === 1; node = node.parentElement) {
    const style = getComputedStyle(node);
    // Transforms, filters and containment make an element a containing block
    // for its absolutely positioned descendants just as positioning does.
    if (style.position !== 'static' || style.transform !== 'none'
      || style.filter !== 'none' || /paint|layout|strict|content/.test(style.contain ?? '')) return node;
  }
  return null; // the initial containing block — viewport-relative, not resolved here
}

function pseudoRect(host, style) {
  const block = containingBlockFor(host);
  if (!block) return null;
  const hostStyle = getComputedStyle(block);
  // A zero-extent containing block is still a valid ORIGIN — a collapsed
  // positioned wrapper whose pseudo paints outside it is ordinary CSS. Only
  // the opposing-inset derivation needs a real extent, and the degenerate
  // boxes that produces are caught by the sanity check at the end.
  const hostRect = block.getBoundingClientRect();

  // Absolute positioning resolves against the containing block's PADDING box.
  const borderLeft = px(hostStyle.borderLeftWidth) || 0;
  const borderTop = px(hostStyle.borderTopWidth) || 0;
  const cbLeft = hostRect.left + borderLeft;
  const cbTop = hostRect.top + borderTop;
  const cbWidth = hostRect.width - borderLeft - (px(hostStyle.borderRightWidth) || 0);
  const cbHeight = hostRect.height - borderTop - (px(hostStyle.borderBottomWidth) || 0);

  // getComputedStyle reports the CONTENT box, so padding and border have to
  // be added back to get the extent that actually paints.
  const extraX = (px(style.paddingLeft) || 0) + (px(style.paddingRight) || 0)
    + (px(style.borderLeftWidth) || 0) + (px(style.borderRightWidth) || 0);
  const extraY = (px(style.paddingTop) || 0) + (px(style.paddingBottom) || 0)
    + (px(style.borderTopWidth) || 0) + (px(style.borderBottomWidth) || 0);

  // An opposing inset pair pins both edges directly; otherwise one inset plus
  // the used size does. `auto` on both sides leaves the box where static flow
  // would have put it — not resolvable here.
  const span = (startValue, endValue, sizeValue, origin, extent, extra) => {
    const start = px(startValue);
    const end = px(endValue);
    const size = px(sizeValue);
    if (Number.isFinite(start) && Number.isFinite(end)) return [origin + start, origin + extent - end];
    if (Number.isFinite(start) && Number.isFinite(size)) return [origin + start, origin + start + size + extra];
    if (Number.isFinite(end) && Number.isFinite(size)) {
      const far = origin + extent - end;
      return [far - size - extra, far];
    }
    return null;
  };
  const x = span(style.left, style.right, style.width, cbLeft, cbWidth, extraX);
  const y = span(style.top, style.bottom, style.height, cbTop, cbHeight, extraY);
  if (!x || !y) return null;

  let [left, right] = x;
  let [top, bottom] = y;
  if (style.transform && style.transform !== 'none') {
    // Only a pure translation keeps the box axis-aligned and the same size;
    // rotation/scale/skew would need real geometry, so they stay unresolved.
    const matrix = /^matrix\(([^)]+)\)$/.exec(style.transform);
    if (!matrix) return null;
    const [a, b, c, d, e, f] = matrix[1].split(',').map(Number);
    if (a !== 1 || b !== 0 || c !== 0 || d !== 1) return null;
    left += e; right += e; top += f; bottom += f;
  }
  // A degenerate box is not unknowable — it is a box that paints nothing
  // (collapsed separator rules are usually exactly this: 1px wide, 0 tall).
  // Callers skip it rather than abstaining on the whole element.
  return { left, top, right, bottom, empty: !(right > left) || !(bottom > top) };
}

/**
 * The backdrop a host's own ::before/::after paints over `point`.
 *
 * This is the one resolution path that can see pseudo-element paint at all:
 * they carry no DOM node, so the ancestor walk (which reads element computed
 * styles) and elementsFromPoint (which retargets them to their host) are both
 * structurally blind to them. The sliding indicator pill behind a selected
 * segmented-control option is the canonical case — the text really does sit
 * on the pill, not on the track colour both other paths report.
 *
 * Returns { color } (opaque or translucent paint over the point),
 * or null when no pseudo of this host paints over the point. Paint that
 * can't be placed becomes a { film } entry — an upper bound on its alpha —
 * so callers can bracket its effect instead of giving up on the element.
 */
/** The paint a host's pseudo-elements contribute, resolved once per audit.
 *  Two extra getComputedStyle calls per host would otherwise land on every
 *  text element on the page; cached, the per-point test below is rect math. */
function pseudoLayers(host) {
  let layers = pseudoCache.get(host);
  if (layers !== undefined) return layers;
  layers = [];
  // Paint order within a host: background, ::before, content, ::after — so a
  // later entry covers an earlier one, and both sit above the host's own
  // background but below its text.
  for (const which of ['::before', '::after']) {
    const style = getComputedStyle(host, which);
    if (style.content === 'none' || style.display === 'none' || style.visibility === 'hidden') continue;
    const color = parseColor(style.backgroundColor);
    const paints = style.backgroundImage !== 'none' || (color?.a ?? 0) > 0;
    if (!paints) continue;
    // In-flow pseudos (the overwhelming majority: bullets, icons, rules,
    // badges) occupy their own box in the content flow beside the text
    // rather than painting behind it. Only out-of-flow ones can be the
    // backdrop, so everything else is simply not a layer here — treating
    // them as unknowable would abstain on half the web.
    if (style.position !== 'absolute' && style.position !== 'fixed') continue;
    const opacity = parseFloat(style.opacity);
    const opacityFactor = Number.isFinite(opacity) ? opacity : 1;
    const rect = style.position === 'absolute' ? pseudoRect(host, style) : null;
    if (!rect) {
      // Paint we can't place still can't paint MORE than its alpha allows:
      // whatever colour it is and wherever it sits, it moves any channel
      // beneath it by at most alpha × 255. Record that bound as a "film"
      // so callers can bracket the verdict — a 3.5%-opacity grain overlay
      // (position: fixed, the common full-page-texture pattern) must not
      // send every element on the page to a human.
      const alphaBound = Math.min(1, opacityFactor * (style.backgroundImage !== 'none' ? 1 : color.a));
      // Position rides along: a FIXED unplaceable pseudo is the full-page
      // overlay pattern and dims everything below the walk; an ABSOLUTE one
      // that defeated the geometry solver (rotation, percentage insets) is
      // a decorative shape that nearer opaque paint covers in normal
      // stacking — the walk needs to know which it is.
      if (alphaBound > 0) layers.push({ film: alphaBound, fixed: style.position === 'fixed' });
      continue;
    }
    if (rect.empty) continue; // placed, and covers nothing
    let layerColor = color;
    if (layerColor && opacityFactor < 1) layerColor = { ...layerColor, a: layerColor.a * opacityFactor };
    // Gradient and image paint rides along as CSS so callers can sample it,
    // the same way they sample an element's background-image — a gradient
    // scrim over a card headline is a bracketable backdrop, not a mystery.
    // Repeat/size/position ride along too: a no-repeat url() paints its
    // intrinsic rect inside this box, not the whole of it, and only the
    // caller (which knows where the text is) can rule on that geometry.
    const imageCss = style.backgroundImage !== 'none' ? style.backgroundImage : null;
    const imageMeta = imageCss
      ? { repeat: style.backgroundRepeat, size: style.backgroundSize, position: style.backgroundPosition }
      : null;
    layers.push({ rect, color: layerColor, imageCss, imageMeta });
  }
  pseudoCache.set(host, layers);
  return layers;
}

/**
 * The nearest pseudo-element paint covering this element's text, walking the
 * flat tree upward: an out-of-flow ::before/::after paints above its host's
 * background but below its host's descendants, so the first one that covers
 * the text is the real backdrop.
 *
 * This is the only path that can see pseudo-element paint at all — they carry
 * no DOM node, so the ancestor walk (element computed styles) and
 * elementsFromPoint (which retargets them to their host) are both
 * structurally blind. The sliding indicator behind a selected
 * segmented-control option is the canonical case: the text really does sit on
 * the pill, not on the track colour both other paths report.
 *
 * Pure geometry, deliberately: unlike the hit-test it needs no viewport, so
 * it answers for text scrolled far off screen too.
 *
 * Returns { color } (opaque, or translucent paint to composite over the
 * walked background), { image } for gradient/image paint the caller should
 * sample, or null when no pseudo covers the text. Whenever the chain also
 * holds paint that CAN'T be placed, the result carries `film`: an upper
 * bound on that paint's alpha, accumulated across every unplaceable layer.
 * The caller brackets the verdict against it — a film of alpha a moves any
 * channel by at most a × 255 whether it sits behind the text or over it,
 * and paint hidden beneath an opaque layer moves nothing, so the bound
 * holds regardless of paint order.
 */
export function pseudoBackdropForText(element) {
  const point = textSamplePoint(element);
  if (!point) return null;
  let acc = null;
  let image = null;
  let settled = false; // an opaque colour or an image hit: deeper layers are covered
  let film = 0;
  // Paint (an opaque background-color or a background-image) on an element
  // BETWEEN the text and a pseudo's host makes the pseudo's place in the
  // stack unprovable from here: CSS paint order can put an out-of-flow
  // ancestor pseudo above OR below that intermediate paint depending on
  // positioning, z-index and tree order — the full stacking model this walk
  // deliberately does not reimplement. Such layers are surfaced with
  // `beyondPaint` so the caller brackets the verdict instead of asserting
  // against paint that may never show behind the glyphs (a full-page
  // decorative body::before wash under sections with their own solid
  // backgrounds produced 90 false contrast failures on one university home).
  let crossed = false;
  let beyondPaint = false;
  for (let node = element; node && node.nodeType === 1; node = node.parentElement ?? node.getRootNode()?.host) {
    for (const layer of pseudoLayers(node)) {
      // Films accumulate over the whole chain — an ancestor's fixed ::after
      // (grain overlays, veils) paints above everything below it. But an
      // ABSOLUTE pseudo whose geometry could not be solved (a rotated or
      // percent-positioned decorative shape) sits in normal flow stacking:
      // once opaque paint lies between the text and its host, that paint
      // covers it, and filming the verdict anyway sent every element under
      // a decorative page shape to the review lane (127 reviews on one
      // charity home whose buttons carry their own solid backgrounds).
      if (layer.film) {
        if (!layer.fixed && crossed) continue;
        film = 1 - (1 - film) * (1 - layer.film);
        continue;
      }
      if (settled) continue;
      const { rect, color, imageCss } = layer;
      if (point.x < rect.left || point.x > rect.right || point.y < rect.top || point.y > rect.bottom) continue;
      // Gradient/image paint is bracketable by sampling, so hand it to the
      // caller rather than giving up on the whole element. The pseudo's box
      // and image geometry travel with it: covering the sample point is a
      // fact about the BOX, and a no-repeat icon may still paint nowhere
      // near the text.
      if (imageCss) {
        image = { css: imageCss, element: node, box: rect, meta: layer.imageMeta };
        settled = true;
        beyondPaint = beyondPaint || crossed;
        continue;
      }
      if (!color || color.a === 0) continue;
      acc = acc ? composite(acc, color) : color;
      beyondPaint = beyondPaint || crossed;
      if (acc.a >= 1) settled = true;
    }
    // Crossing updates AFTER the node's own pseudos: a host's ::before
    // paints above its own background, so its own paint never makes its own
    // pseudo ambiguous — only paint on elements nearer the text does.
    if (!crossed) {
      const style = getComputedStyle(node);
      if ((style.backgroundImage !== 'none' && !paintsNothing(style.backgroundImage))
        || (parseColor(style.backgroundColor)?.a ?? 0) >= 1) crossed = true;
    }
  }
  if (image) return { image, ...(film > 0 && { film }), ...(beyondPaint && { beyondPaint }) };
  if (acc) return { color: acc, ...(film > 0 && { film }), ...(beyondPaint && { beyondPaint }) };
  return film > 0 ? { film } : null;
}

/**
 * The range the contrast ratio can occupy once an unplaceable translucent
 * layer (a "film" of alpha ≤ film) may be painting somewhere in the stack.
 *
 * Two physical scenarios bound everything: the film behind the glyphs
 * (shifting only the background) or over the whole element (shifting text
 * and background alike, as t3-style full-page grain overlays do). Within
 * each, luminance is monotone per colour channel and the ratio's derivative
 * carries one sign across channels, so the extremes sit at an all-black or
 * all-white film — five evaluations bound the true range.
 *
 * `crossed` flags the one case the endpoints can't bound from below: a film
 * behind the text whose extremes land the background's luminance on OPPOSITE
 * sides of the text's, where an intermediate colour collapses the ratio
 * toward 1:1. Callers must not assert a pass when it is set; a fail needs
 * only `max`, which the endpoints do bound.
 */
export function filmedContrastBounds(foreground, background, film) {
  const ratios = [contrastRatio(foreground, background)];
  const textLum = luminance(foreground);
  const sides = [];
  for (const channel of [0, 255]) {
    const paint = { r: channel, g: channel, b: channel, a: film };
    const shiftedBackground = composite(paint, background);
    ratios.push(contrastRatio(foreground, shiftedBackground)); // film behind the text
    ratios.push(contrastRatio(composite(paint, foreground), shiftedBackground)); // film over text and backdrop alike
    sides.push(Math.sign(textLum - luminance(shiftedBackground)));
  }
  return {
    min: Math.min(...ratios),
    max: Math.max(...ratios),
    crossed: sides[0] !== sides[1],
  };
}

/** A layer qualifies as a scrim over `element` when it is translucent paint
 *  (or a backdrop-filter) covering most of the viewport and the whole
 *  element — the shape of a modal/loading veil, not a badge or header.
 *  Returns EVERY such layer, topmost first: consent flows routinely stack a
 *  dimmer under a banner container, and the dimmed state the user sees is
 *  all of them composited, not just the first one found. */
function scrimIn(layersAbove, element, win) {
  const rect = element.getBoundingClientRect();
  const found = [];
  for (const layer of layersAbove) {
    if (layer.contains(element) || element.contains(layer)) continue;
    const style = getComputedStyle(layer);
    const color = parseColor(style.backgroundColor);
    const alpha = (color ? color.a : 0) * (parseFloat(style.opacity) || 1);
    const hasBackdropFilter = style.backdropFilter && style.backdropFilter !== 'none';
    // Fully opaque covers simply hide the text (nothing to judge through);
    // near-invisible tints don't meaningfully change presented contrast.
    if (!hasBackdropFilter && (alpha < 0.15 || alpha >= 1)) continue;
    const r = layer.getBoundingClientRect();
    const coversViewport = (Math.min(r.right, win.innerWidth) - Math.max(r.left, 0))
      * (Math.min(r.bottom, win.innerHeight) - Math.max(r.top, 0))
      >= 0.6 * win.innerWidth * win.innerHeight;
    const coversElement = r.left <= rect.left + 1 && r.top <= rect.top + 1
      && r.right >= rect.right - 1 && r.bottom >= rect.bottom - 1;
    if (coversViewport && coversElement) found.push(layer);
  }
  return found.length ? found : null;
}

/**
 * The flat paint of scrim layers (topmost first, as `scrimIn` returns them),
 * ready for applyOverlays — or null when the dimmed state can't be computed
 * as flat colour at all. A backdrop-filter resamples the pixels beneath it
 * (blur, saturate, invert) and a blend mode or filter rewrites them: no
 * colour arithmetic reproduces either, so those veils stay a human call.
 */
export function scrimPaint(layers) {
  const paints = [];
  for (const layer of layers) {
    const style = getComputedStyle(layer);
    if (style.backdropFilter && style.backdropFilter !== 'none') return null;
    if (style.filter && style.filter !== 'none') return null;
    if (style.mixBlendMode && style.mixBlendMode !== 'normal') return null;
    if (style.backgroundImage !== 'none') return null;
    const color = parseColor(style.backgroundColor);
    if (!color) return null;
    const alpha = color.a * (parseFloat(style.opacity) || 1);
    if (alpha <= 0) continue;
    paints.push({ ...color, a: alpha });
  }
  return paints.length ? paints : null;
}

export function paintedBackdrop(element) {
  const doc = element.ownerDocument;
  const win = doc.defaultView;
  if (typeof doc.elementsFromPoint !== 'function') return 'unresolved';
  const point = textSamplePoint(element);
  if (!point) return 'unresolved';
  if (point.x < 0 || point.y < 0 || point.x >= win.innerWidth || point.y >= win.innerHeight) {
    return 'offscreen';
  }
  const stack = doc.elementsFromPoint(point.x, point.y);
  const start = stack.indexOf(element);
  const scrim = start > 0 ? scrimIn(stack.slice(0, start), element, win) : null;
  // The element's own background paints directly under its text — it heads
  // the stack. Its background-image was already adjudicated upstream by the
  // image-sampling path, so only its colour participates here.
  let acc = null;
  // The translucent layers met on the way down, nearest the text first, in
  // the shape backgroundImageSource hands out as `overlays`. When the walk
  // ends on an image they are the paint BETWEEN the image and the glyphs
  // (the hero pattern: a photo as <img>, a 70% black scrim div, a white
  // heading), and the sampled pixels must be seen through them. Dropping
  // them judged the raw photo and failed text that sat on the dimmed one.
  // (2026-08-25 overnight audit, defect 2.)
  const overlays = [];
  const own = parseColor(getComputedStyle(element).backgroundColor);
  if (own && own.a > 0) {
    if (own.a >= 1) return { color: own, scrim };
    acc = own;
    overlays.push(own);
  }
  if (start === -1) return 'unresolved';
  // Ancestors the hit-test cannot see. pointer-events: none is inherited
  // and takes an element (and, unless they opt back in, its descendants)
  // out of every hit-test stack, but it paints exactly as before. A white
  // title inside a fixed black header with pointer-events: none, the title
  // itself set back to auto, hit-tests as [title, page, body]: the black
  // layer is skipped and the walk below composites the page colour under
  // the glyphs (business.hsbc.com, 2026-08-27, asserted 1.10:1 white on
  // #f3f3f3 under a black bar). So the painting ancestors missing from the
  // stack are folded back in, each at its place in paint order: an
  // ancestor paints beneath all of its descendants, so its turn comes when
  // the next stack layer is no longer inside it. Only ancestors whose box
  // holds the sample point count; a parent the text has been positioned
  // out of paints nowhere under it and is rightly absent.
  const missing = [];
  const inStack = new Set(stack);
  for (let a = element.parentElement ?? element.getRootNode()?.host; a && a.nodeType === 1; a = a.parentElement ?? a.getRootNode()?.host) {
    if (inStack.has(a)) continue;
    const box = a.getBoundingClientRect();
    if (point.x < box.left || point.x >= box.right || point.y < box.top || point.y >= box.bottom) continue;
    const st = getComputedStyle(a);
    const c = parseColor(st.backgroundColor);
    if ((c && c.a > 0) || (st.backgroundImage !== 'none' && !paintsNothing(st.backgroundImage))) missing.push(a);
  }
  const layers = [];
  for (const layer of stack.slice(start + 1)) {
    while (missing.length && !missing[0].contains(layer)) layers.push(missing.shift());
    layers.push(layer);
  }
  layers.push(...missing);
  for (const layer of layers) {
    // Replaced elements paint their content, not a background — a photo or
    // video in the stack is an image backdrop whatever its styles say.
    if (/^(img|video|canvas|svg|picture|object|embed|iframe)$/i.test(layer.tagName)) {
      return { image: layer, scrim, overlays };
    }
    const style = getComputedStyle(layer);
    // A shadow HOST in the stack hides its shadow tree from the hit-test
    // (elementsFromPoint retargets internal elements to the host), so paint
    // inside it is invisible here: compositing the host as "transparent"
    // and reading layers behind it judged slotted banner text against the
    // page white while the component's shadow painted a blue container
    // between them. Whatever renders inside is unknowable to this walk.
    if (layer.shadowRoot) return 'unresolved';
    // Blend modes and filters change the paint in ways flat colour math
    // can't follow — that's a human check, not a resolution.
    if ((style.mixBlendMode && style.mixBlendMode !== 'normal')
      || (style.filter && style.filter !== 'none')
      || (style.backdropFilter && style.backdropFilter !== 'none')) return 'unresolved';
    // An ancestor carrying a background-image is only this text's backdrop if
    // that image actually paints where the text is. The element's own image is
    // adjudicated upstream against its paint rect; ancestors were not, so a
    // decorative 4px accent stripe down a callout's left edge counted as the
    // backdrop for text sitting 44px to its right, and the stripe's colour
    // then failed the whole paragraph. Adjudicate at the same point the hit
    // test used: if the rect resolves and does not cover it, this image is not
    // what is behind the glyphs, so fall through to the layer's own colour.
    // An unresolvable rect keeps the old behaviour, which errs toward asking a
    // human rather than asserting from geometry we could not compute.
    if (style.backgroundImage !== 'none') {
      const rects = backgroundImagePaintRects(layer);
      // An unresolvable layer (null) counts as covering: not knowing where a
      // layer paints is a reason to ask a human, never to rule it out.
      const covers = (r) => !r
        || (point.x >= r.left && point.x < r.right && point.y >= r.top && point.y < r.bottom);
      if (!rects.length || rects.some(covers)) return { image: layer, scrim, overlays };
    }
    let color = parseColor(style.backgroundColor);
    if (!color) return 'unresolved';
    // A layer's own opacity thins its paint. (Group opacity shared with the
    // text via common ancestors is already folded into the foreground.)
    const layerOpacity = parseFloat(style.opacity);
    if (layerOpacity < 1) color = { ...color, a: color.a * layerOpacity };
    if (color.a === 0) continue;
    acc = acc ? composite(acc, color) : color;
    if (acc.a >= 1) return { color: acc, scrim };
    overlays.push(color);
  }
  // Every layer was translucent: the canvas shows through underneath.
  const canvas = canvasColor(doc);
  return { color: acc ? composite(acc, canvas) : canvas, scrim };
}

/**
 * Non-ancestor elements with an opaque background colour big enough to act
 * as a text backdrop, with their viewport rects — collected once per audit.
 * The fail path's scroll-independent bracket for text the hit-test can't
 * reach: "could a coloured panel be painted where this text is, making the
 * walked-up background the wrong one?" Only positioned or floated subtrees
 * paint across sibling boundaries like that, which keeps the scan focused.
 * Skipped on monster pages — the full-document style pass would dominate
 * the audit; those pages keep the previous (walk-only) behaviour.
 */
export function opaquePanelRects(doc) {
  if (!panelRectsCache) {
    panelRectsCache = { panels: [], veil: null };
    const win = doc.defaultView;
    const all = doc.querySelectorAll('body *');
    if (all.length <= 30000) {
      for (const el of all) {
        const style = getComputedStyle(el);
        if (style.position === 'static' && style.cssFloat === 'none') continue;
        const color = parseColor(style.backgroundColor);
        const rect = el.getBoundingClientRect();
        if (color && color.a >= 1 && rect.width >= 24 && rect.height >= 12) {
          // pointer-events: none panels paint but never appear in hit-test
          // stacks — they can contradict even a "verified" backdrop.
          panelRectsCache.panels.push({ element: el, rect, color, hitTestBlind: style.pointerEvents === 'none' });
        }
        // Same walk, second question: is a viewport-scale translucent FIXED
        // veil up (modal scrim, loading dimmer)? Fixed overlays follow the
        // viewport, so they dim offscreen content too — the one backdrop
        // hazard that scrolling cannot escape.
        if (!panelRectsCache.veil && (style.position === 'fixed' || style.position === 'sticky')
          && style.visibility !== 'hidden') {
          const alpha = (color ? color.a : 0) * (parseFloat(style.opacity) || 1);
          const hasBackdropFilter = style.backdropFilter && style.backdropFilter !== 'none';
          const coversViewport = rect.width >= 0.9 * win.innerWidth && rect.height >= 0.9 * win.innerHeight;
          if (coversViewport && (hasBackdropFilter || (alpha >= 0.15 && alpha < 1))) {
            panelRectsCache.veil = el;
          }
        }
      }
    }
  }
  return panelRectsCache.panels;
}

/** The viewport-covering translucent fixed overlay currently up, if any —
 *  detected in the opaquePanelRects walk (call order doesn't matter). */
export function viewportVeil(doc) {
  opaquePanelRects(doc);
  return panelRectsCache.veil;
}

/** Parse a computed text-shadow list into layers. Computed style serializes
 *  the colour first ("rgb(0, 0, 0) 1px 0px 2px") with px lengths; author-ish
 *  orderings are tolerated. */
function parseTextShadows(cssText) {
  if (!cssText || cssText === 'none') return [];
  const layers = [];
  for (const part of cssText.split(/,(?![^(]*\))/)) {
    const colorMatch = /rgba?\([^)]*\)|#[0-9a-fA-F]{3,8}\b/.exec(part);
    const lengths = [...part.replace(colorMatch?.[0] ?? '', '').matchAll(/(-?\d*\.?\d+)px/g)]
      .map((m) => parseFloat(m[1]));
    if (lengths.length < 2) continue;
    layers.push({ x: lengths[0], y: lengths[1], blur: lengths[2] ?? 0, color: parseColor(colorMatch?.[0] ?? '') });
  }
  return layers;
}

/**
 * The colour of a solid halo formed by the element's text-shadow, or null.
 * WCAG technique G18 measures letter contrast against a halo when one hugs
 * the glyphs. A halo counts when a single colour's layers surround the text
 * — a radial ring (zero offset, non-zero blur) or offsets covering all four
 * directions — crisply enough to read as an outline rather than a fog:
 * offsets and blur within ~25% of the font size, effectively opaque paint.
 * The thresholds are this engine's own judgement of "hugs the letterforms";
 * they are deliberately conservative — ambiguous shadows stay unresolved.
 */
export function textShadowHalo(cssText, fontSize) {
  const cap = Math.max(2, fontSize * 0.25);
  const byColor = new Map();
  for (const layer of parseTextShadows(cssText)) {
    if (!layer.color || layer.color.a < 0.95) continue;
    if (layer.blur > cap || Math.abs(layer.x) > cap || Math.abs(layer.y) > cap) continue;
    const key = `${Math.round(layer.color.r)},${Math.round(layer.color.g)},${Math.round(layer.color.b)}`;
    const dirs = byColor.get(key) ?? { color: layer.color, up: false, down: false, left: false, right: false };
    if (layer.blur >= Math.max(Math.abs(layer.x), Math.abs(layer.y), 0.5)) {
      // Blur at least as wide as the offset bleeds around every glyph edge.
      dirs.up = dirs.down = dirs.left = dirs.right = true;
    } else {
      if (layer.x > 0) dirs.right = true;
      if (layer.x < 0) dirs.left = true;
      if (layer.y > 0) dirs.down = true;
      if (layer.y < 0) dirs.up = true;
    }
    byColor.set(key, dirs);
  }
  for (const dirs of byColor.values()) {
    if (dirs.up && dirs.down && dirs.left && dirs.right) return dirs.color;
  }
  return null;
}

/** True when every shadow layer is too faint or too diffuse to affect
 *  legibility (soft decorative glows) — the text can be judged against its
 *  background alone. */
export function textShadowNegligible(cssText, fontSize) {
  return parseTextShadows(cssText)
    .every((l) => !l.color || l.color.a < 0.15 || l.blur > fontSize * 0.5);
}

/**
 * Every rendered media element on the page (images, video, canvas, svg)
 * with its viewport rect, collected once per audit. The contrast rule's
 * fail path uses this as its scroll-independent question — "could a
 * picture be painted where this text is?" — for elements the viewport
 * hit-test can't reach. Open shadow roots aren't walked here; a known
 * approximation that errs toward failing (never toward a false pass).
 */
/**
 * The part of an element's border box its ancestors allow it to PAINT.
 * An object-fit: cover video is routinely taller than its overflow-hidden
 * crop, and the spilled region is guaranteed blank — treating the raw box
 * as a possible backdrop sent captions sitting 16px past a cropped video
 * to review. The walk respects positioning: an absolutely positioned
 * element escapes the clips of ancestors below its containing block
 * (position or transform/filter establish one), and a fixed element's
 * clippers are rare enough that the walk stops rather than guess — every
 * uncertain path keeps the FULL box, erring toward review, never past a
 * real overlap. Returns null when the clip leaves nothing paintable.
 */
function paintableRect(element, rect) {
  let { left, top, right, bottom } = rect;
  let mode = getComputedStyle(element).position;
  for (let a = element.parentElement; a; a = a.parentElement) {
    if (mode === 'fixed') break; // conservative: no clip assumed above
    const s = getComputedStyle(a);
    const containingBlock = s.position !== 'static' || s.transform !== 'none' || (s.filter && s.filter !== 'none');
    if (mode === 'absolute' && !containingBlock) continue; // escapes this ancestor's clip
    // Only overflow: hidden/clip cut paint scroll-independently. A
    // scrollable ancestor (auto/scroll) clips the CURRENT scroll state —
    // a carousel slide parked outside the strip swings back under the
    // user's finger, image and its overlaid caption together, so its
    // media must keep counting as a possible backdrop (BBC's promo
    // carousel sent two white-on-photo headlines to a false pass here).
    const clips = (o) => o === 'hidden' || o === 'clip';
    if (clips(s.overflowX) || clips(s.overflowY)) {
      const b = a.getBoundingClientRect();
      if (clips(s.overflowX)) { left = Math.max(left, b.left); right = Math.min(right, b.right); }
      if (clips(s.overflowY)) { top = Math.max(top, b.top); bottom = Math.min(bottom, b.bottom); }
      if (right <= left || bottom <= top) return null;
    }
    // Above a consumed ancestor the element is clipped exactly as that
    // ancestor is: continue the walk in its shoes.
    mode = s.position;
  }
  return { left, top, right, bottom, width: right - left, height: bottom - top,
    x: left, y: top };
}

export function mediaRects(doc) {
  if (!mediaRectsCache) {
    mediaRectsCache = [];
    for (const el of doc.querySelectorAll('img, video, canvas, svg')) {
      // The box an ancestor clips away can never paint, so it is not a
      // backdrop hazard however far it reaches.
      const rect = paintableRect(el, el.getBoundingClientRect());
      // Sub-icon-sized media can't plausibly serve as a text backdrop.
      // Decorative media with pointer-events: none (animated gradient
      // canvases, ambient video) paints under text yet never appears in
      // elementsFromPoint stacks — flagged so callers can distrust even a
      // hit-test-verified backdrop where such media overlaps.
      if (rect && rect.width >= 8 && rect.height >= 8) {
        mediaRectsCache.push({ element: el, rect, hitTestBlind: getComputedStyle(el).pointerEvents === 'none' });
      }
    }
  }
  return mediaRectsCache;
}

/**
 * The nearest background-image being painted behind this element (walking
 * up until an opaque background colour would hide anything deeper).
 * Returns { css, element } or null.
 */
export function backgroundImageSource(element) {
  // Translucent background colours passed on the way up are painted BETWEEN
  // the image and the text: the scrim over a hero photo is the everyday case.
  // They are collected nearest-text first, so folding them back over a sampled
  // image pixel means walking this list in reverse (see applyOverlays).
  const overlays = [];
  for (let current = element; current; current = current.parentElement) {
    const style = getComputedStyle(current);
    // An element's own background-image paints ABOVE its own background
    // colour, so the element carrying the image contributes no overlay.
    if (style.backgroundImage !== 'none') return { css: style.backgroundImage, element: current, overlays };
    const color = parseColor(style.backgroundColor);
    if (color && color.a >= 1) return null;
    if (color && color.a > 0) overlays.push(color);
  }
  return null;
}

/** Paint `overlays` (nearest-text first) back over a base colour. */
export function applyOverlays(base, overlays) {
  let result = base;
  for (let i = overlays.length - 1; i >= 0; i--) result = composite(overlays[i], result);
  return result;
}

const overlayKey = (overlays) =>
  overlays.map((c) => `${c.r},${c.g},${c.b},${c.a}`).join(';');

/**
 * Luminance range (min/max) of an image's pixels, downscaled for speed.
 * null when the image can't be read: cross-origin without CORS headers
 * (canvas tainting), load failure, or timeout. `{ transparent: true }` when
 * the image reads fine but has no opaque pixels at all — it paints nothing,
 * which is a very different fact from "unknown" and must not be reported as
 * one. Cached per URL.
 */
const imageRangeCache = new Map();
/** The largest sampling grid an image is read through, per axis. Above it
 *  the read is `reduced` (see sampleGridFor) and callers must not assert a
 *  pass from the range: detail finer than the grid could hide under the
 *  glyphs. A 1024-square read is a million samples, once per image. */
const MAX_SAMPLE_AXIS = 1024;

/**
 * How finely to sample an image painted over `extent` CSS pixels: one sample
 * per four painted pixels, never fewer than the historical 32 per axis, and
 * capped at MAX_SAMPLE_AXIS. A 32-square read of a 1024px hero averaged
 * every 32x32 block into one value, so 16px black squares in a white image
 * (logos, lettering, texture, anything glyph-sized) vanished from the range
 * and a pass was asserted from pixels that never contained them. Four
 * painted pixels per sample is finer than a glyph stroke; whatever is
 * narrower than that is the dither WCAG's relative-luminance Note 4 lets an
 * average stand for. `reduced` says the cap bit, so the grid is coarser than
 * that. (2026-08-25 overnight audit, defect 4.)
 */
export function sampleGridFor(extent) {
  if (!extent || !(extent.width > 0) || !(extent.height > 0)) return null;
  const axis = (value) => Math.min(MAX_SAMPLE_AXIS, Math.max(32, Math.ceil(value / 4)));
  const width = axis(extent.width);
  const height = axis(extent.height);
  return { width, height, reduced: extent.width / width > 4.5 || extent.height / height > 4.5 };
}

export function imageLuminanceRange(url, overlays = [], grid = null) {
  const width = grid?.width ?? 32;
  const height = grid?.height ?? 32;
  const sizeKey = width === 32 && height === 32 ? '' : `|${width}x${height}`;
  const cacheKey = `${url}${overlays.length ? `|${overlayKey(overlays)}` : ''}${sizeKey}`;
  if (imageRangeCache.has(cacheKey)) return imageRangeCache.get(cacheKey);
  const promise = new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timer = setTimeout(() => resolve(null), 1500); // never stall an audit on a slow image
    img.onload = () => {
      clearTimeout(timer);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, width, height);
        const data = ctx.getImageData(0, 0, width, height).data;
        let min = 1;
        let max = 0;
        // The colours at those extremes, kept for the same reason the
        // gradient range keeps them: translucent text blends with the actual
        // pixels, and a luminance cannot be un-gamma'd back into an rgb.
        let minColor = null;
        let maxColor = null;
        let opaquePixels = 0;
        let alphaSeen = false;
        for (let i = 0; i < data.length; i += 4) {
          // Any see-through pixel means part of this layer shows whatever is
          // painted beneath it — the sampled range alone then describes only
          // the ink, not the backdrop the eye meets. Callers widen the range
          // with the underlying paint (rangeWithBackdrop) or abstain.
          if (data[i + 3] < 255) alphaSeen = true;
          if (data[i + 3] < 128) continue; // mostly-transparent pixels reveal what's beneath — unknowable
          opaquePixels += 1;
          // Composite each pixel through anything painted between the image
          // and the text before measuring: a photo under a 75% black scrim is
          // seen as the blend, never as the photo.
          const pixel = { r: data[i], g: data[i + 1], b: data[i + 2], a: 1 };
          const shown = overlays.length ? applyOverlays(pixel, overlays) : pixel;
          const l = luminance(shown);
          if (l < min) { min = l; minColor = shown; }
          if (l > max) { max = l; maxColor = shown; }
        }
        // Not one opaque pixel: a spacer, a cleared sprite, or a decorative
        // layer left in place with nothing in it. It covers the background
        // without changing a single one of its pixels.
        if (!opaquePixels) {
          transparentImages.add(url);
          // Any background the walk already gave up on ("there's an image in
          // the chain") may have been given up on because of THIS image.
          // Those answers are now wrong, and which ones is not worth
          // tracking: a page has a handful of transparent images at most, so
          // the walk simply re-runs. Without this the verdict would depend
          // on which rule happened to reach the element first.
          backgroundCache = new WeakMap();
          resolve({ transparent: true, width: img.naturalWidth, height: img.naturalHeight });
          return;
        }
        // `reduced`: the grid was capped below four painted pixels per sample
        // AND the image really holds more pixels than the grid, so detail
        // was averaged away. An icon stretched across a huge box loses
        // nothing to the cap and is not flagged.
        const reduced = Boolean(grid?.reduced) && (img.naturalWidth > width || img.naturalHeight > height);
        resolve(min <= max
          ? { min, max, minColor, maxColor, hasAlpha: alphaSeen, width: img.naturalWidth, height: img.naturalHeight, reduced }
          : null);
      } catch {
        resolve(null); // tainted canvas: cross-origin image without CORS headers
      }
    };
    img.onerror = () => { clearTimeout(timer); resolve(null); };
    img.src = url;
  });
  imageRangeCache.set(cacheKey, promise);
  return promise;
}

/**
 * Where a single no-repeat background image actually paints (viewport
 * coordinates), or null when that can't be known statically (repeating
 * layers, cover/contain, unknown intrinsic size). Lets the contrast rule
 * clear text that never overlaps the image — e.g. external-link icons
 * painted in a link's right padding (Wikipedia-style).
 */
/**
 * Paint rect for EVERY layer of a background-image list, one entry per layer,
 * null where a layer's geometry cannot be resolved.
 *
 * background-size/position/repeat are comma-separated lists that pair up with
 * the image list, so a four-layer background can be four separate 1px lines —
 * which is how design systems draw a tile's border without a border. Judging
 * such a background as one blob meant text in the middle of a tile was ruled
 * unjudgeable because of four hairlines around its edge.
 *
 * A layer resolves to null (unknown, treat as covering) when it tiles, when
 * cover/contain hands sizing to an intrinsic this function does not have, or
 * when its position is not a plain length or percentage.
 */
function backgroundImagePaintRects(element) {
  const style = getComputedStyle(element);
  const images = splitLayers(style.backgroundImage);
  if (!images.length) return [];
  const box = element.getBoundingClientRect();
  const sizes = splitLayers(style.backgroundSize);
  const positions = splitLayers(style.backgroundPosition);
  const repeats = splitLayers(style.backgroundRepeat);
  const per = (list, i) => (list.length ? list[i % list.length] : undefined);

  return images.map((image, i) => {
    if (image === 'none') return { left: 0, top: 0, right: 0, bottom: 0 }; // paints nothing
    const repeat = per(repeats, i) ?? 'repeat';
    if (repeat !== 'no-repeat') return null; // may tile under the text
    const size = per(sizes, i) ?? 'auto';
    if (size === 'cover' || size === 'contain') return null;
    const parts = splitParts(size);
    const extent = (value, total) => {
      if (value?.endsWith('px')) return parseFloat(value);
      if (value?.endsWith('%')) return (parseFloat(value) / 100) * total;
      return null; // 'auto' on a gradient means the full box, but only for a
      // single-layer background; per-layer we decline rather than guess.
    };
    const width = extent(parts[0], box.width);
    const height = extent(parts[1] ?? parts[0], box.height);
    if (width === null || height === null
      || Number.isNaN(width) || Number.isNaN(height)) return null;
    const pos = splitParts(per(positions, i) ?? '0% 0%');
    const offset = (value, total, span) => {
      if (value?.endsWith('%')) return (parseFloat(value) / 100) * (total - span);
      if (value?.endsWith('px')) return parseFloat(value);
      return null;
    };
    const offsetX = offset(pos[0], box.width, width);
    const offsetY = offset(pos[1] ?? '50%', box.height, height);
    // NaN, not just null: `calc(100% - 1px)` is a real position a design
    // system writes, and a NaN that escapes as a rect is worse than an
    // unresolved one — it compares false against everything, so a genuine
    // image backdrop would be silently ruled clear of the text.
    if (offsetX === null || offsetY === null
      || Number.isNaN(offsetX) || Number.isNaN(offsetY)) return null;
    const left = box.left + offsetX;
    const top = box.top + offsetY;
    return { left, top, right: left + width, bottom: top + height };
  });
}

/** Split a space-separated CSS value, keeping function calls whole. Splitting
 *  `calc(100% - 1px)` on whitespace yields `calc(100%`, which parseFloat reads
 *  as 100 and every guard downstream then trusts. */
function splitParts(value) {
  const out = [];
  let depth = 0;
  let current = '';
  for (const ch of value) {
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (/\s/.test(ch) && depth === 0) { if (current) out.push(current); current = ''; continue; }
    current += ch;
  }
  if (current) out.push(current);
  return out;
}

/** Split a comma-separated CSS list, ignoring commas inside parentheses. */
function splitLayers(value) {
  if (!value || value === 'none') return value === 'none' ? ['none'] : [];
  const out = [];
  let depth = 0;
  let current = '';
  for (const ch of value) {
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (ch === ',' && depth === 0) { out.push(current.trim()); current = ''; continue; }
    current += ch;
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

export function backgroundImagePaintRect(element, intrinsic) {
  const style = getComputedStyle(element);
  // Layers are counted at the top level of the list: an SVG data URI that
  // references a pattern with url(#p) inside itself is still one layer.
  // (2026-08-25 overnight audit, defect 8.)
  if (splitLayers(style.backgroundImage).filter((layer) => layer !== 'none').length !== 1) return null;
  const box = element.getBoundingClientRect();
  return imagePaintRectInBox(
    { left: box.left, top: box.top, right: box.right, bottom: box.bottom },
    { repeat: style.backgroundRepeat, size: style.backgroundSize, position: style.backgroundPosition },
    intrinsic,
  );
}

/**
 * The same paint-rect math for any painting box a caller already has —
 * above all a pseudo-element's resolved box, which no element rect can
 * describe. Returns null when the geometry is not statically knowable
 * (tiling, cover/contain, keyword positions).
 */
export function imagePaintRectInBox(box, meta, intrinsic) {
  if (!box || !meta) return null;
  if (meta.repeat !== 'no-repeat') return null; // may tile under the text
  if (meta.size === 'cover' || meta.size === 'contain') return null;
  const boxWidth = box.right - box.left;
  const boxHeight = box.bottom - box.top;
  const dimension = (value, total, auto) => {
    if (value?.endsWith('px')) return parseFloat(value);
    if (value?.endsWith('%')) return (parseFloat(value) / 100) * total;
    return auto;
  };
  const size = meta.size.split(' ');
  const width = dimension(size[0], boxWidth, intrinsic?.width);
  const height = dimension(size[1] ?? size[0], boxHeight, intrinsic?.height);
  if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
  // position N% aligns the image's N% point with the container's N% point.
  // Anything else (calc() from three-value syntax, keywords) is not
  // statically resolvable — returning a guessed 0 would invent a paint
  // position over the text, so unknown positions make the rect unknowable.
  const offset = (value, total, extent) => {
    if (value?.endsWith('%')) return (parseFloat(value) / 100) * (total - extent);
    if (value?.endsWith('px')) return parseFloat(value);
    return null;
  };
  const pos = meta.position.split(' ');
  const offsetX = offset(pos[0], boxWidth, width);
  const offsetY = offset(pos[1] ?? '50%', boxHeight, height);
  if (offsetX === null || offsetY === null || Number.isNaN(offsetX) || Number.isNaN(offsetY)) return null;
  const left = box.left + offsetX;
  const top = box.top + offsetY;
  return { left, top, right: left + width, bottom: top + height };
}

/**
 * Widen a sampled luminance range with the layer painted beneath the image,
 * for images that do not cover their box with opaque pixels (hasAlpha).
 * A semi-transparent pixel blends per channel between its own colour and
 * the underlying paint, and luminance is monotone in each channel, so a
 * range extended with the underlying colour bounds every blend the eye can
 * meet. Returns null when the underlying paint is unknown or itself
 * see-through: no bound exists then, and the caller must not assert either
 * verdict from the ink pixels alone — a mostly-transparent illustration
 * sampled dark was asserting failures for text that really sat on the white
 * showing through it.
 */
export function rangeWithBackdrop(range, under, overlays = []) {
  if (!range || !range.hasAlpha) return range;
  if (!under || under.a < 1) return null;
  const shown = overlays.length ? applyOverlays(under, overlays) : under;
  const underLum = luminance(shown);
  return {
    ...range,
    min: Math.min(range.min, underLum),
    max: Math.max(range.max, underLum),
    minColor: underLum < range.min ? shown : range.minColor,
    maxColor: underLum > range.max ? shown : range.maxColor,
  };
}

/** The layers of a computed background-image list, split on top-level
 *  commas only: commas inside url() and gradient() belong to the layer. */
export function splitBackgroundLayers(backgroundImageCss) {
  return splitLayers(backgroundImageCss);
}

/**
 * The URL inside one url() layer, or null when the layer is not a url().
 * The whole layer is the function call, so the URL runs to the layer's own
 * closing paren: a regex that stopped at the FIRST ")" cut an SVG data URI
 * short at the url(#pattern) reference inside it, and the truncated image
 * then failed to load. (2026-08-25 overnight audit, defect 8.)
 */
export function backgroundLayerUrl(layer) {
  const match = /^url\(([\s\S]*)\)$/.exec((layer ?? '').trim());
  if (!match) return null;
  let inner = match[1].trim();
  const quote = inner[0];
  if ((quote === '"' || quote === "'") && inner.endsWith(quote)) {
    inner = inner.slice(1, -1).replace(new RegExp(`\\\\${quote}`, 'g'), quote);
  }
  return inner;
}

/** Tokens that open a gradient argument without naming a colour: angles,
 *  side keywords, shapes, positions and colour hints. */
const GRADIENT_NON_COLOR = /^(?:(?:to|at|from|in|circle|ellipse|closest-side|closest-corner|farthest-side|farthest-corner)\b|calc\(|-?\d|\.\d)/i;

/**
 * The colour stops of ONE gradient layer, every stop run through parseColor
 * so modern syntaxes (oklch(), lab(), color()) count as stops instead of
 * being skipped by an rgb()-only regex. Returns
 *   { colors, unparsed, translucent, space }
 * where `unparsed` counts stops no parser could read, `translucent` says at
 * least one stop has alpha below 1 (the gradient reveals what is beneath
 * it), and `space` names an interpolation colour space other than sRGB when
 * the gradient declares one (in-between colours cannot then be computed by
 * sRGB arithmetic). (2026-08-25 overnight audit, defect 8.)
 */
export function gradientStops(layer) {
  const result = { colors: [], unparsed: 0, translucent: false, space: null };
  const open = layer.indexOf('(');
  const close = layer.lastIndexOf(')');
  if (open === -1 || close <= open) return result;
  for (const part of splitLayers(layer.slice(open + 1, close))) {
    const space = /(?:^|\s)in\s+([a-z0-9-]+)/i.exec(part);
    if (space && space[1].toLowerCase() !== 'srgb') result.space = space[1].toLowerCase();
    // The colour token: the first function call in the part (rgb(), oklch(),
    // color()...), read to its matching paren, or else the leading word.
    let token = null;
    const call = /([a-z][a-z0-9-]*)\(/i.exec(part);
    if (call) {
      let depth = 0;
      for (let i = call.index; i < part.length; i++) {
        if (part[i] === '(') depth += 1;
        if (part[i] === ')') { depth -= 1; if (depth === 0) { token = part.slice(call.index, i + 1); break; } }
      }
    } else {
      token = part.trim().split(/\s+/)[0] ?? '';
    }
    if (!token || GRADIENT_NON_COLOR.test(token)) continue;
    // currentcolor survives into some computed serialisations and the canvas
    // probe would happily paint it black: that is not a parse, it is a guess.
    const color = /^currentcolor$/i.test(token) ? null : parseColor(token);
    if (!color) { result.unparsed += 1; continue; }
    if (color.a < 1) result.translucent = true;
    result.colors.push(color);
  }
  return result;
}

/**
 * Luminance range of ONE gradient layer, from the colours it actually
 * paints: the interpolation between each pair of adjacent stops is sampled
 * at `steps` points, not just its ends. Interpolated colours do NOT stay
 * inside the stops' luminance range: sRGB interpolation trades the channels
 * off against each other, and luminance is convex per channel, so a hue-
 * crossing gradient (red to blue) is darkest in the middle, where black text
 * that passes at both ends drops to 3.5:1. Sixteen steps per segment
 * resolves that curve to well within the ratio's second decimal. Returns
 * null when the stops cannot be sampled (unparseable, translucent, or a
 * non-sRGB interpolation space); gradientStops() says which.
 * Positions and colour hints are ignored: they move colours along the
 * gradient line, they do not add or remove any, so the sampled set is the
 * painted set (a hard stop paints fewer colours than sampled, which only
 * ever widens the range, and a wider range asserts less).
 * (2026-08-25 overnight audit, defect 3.)
 */
export function sampledGradientRange(layer, overlays = [], steps = 16) {
  const { colors, unparsed, translucent, space } = gradientStops(layer);
  if (!colors.length || unparsed || translucent || space) return null;
  const samples = [];
  if (colors.length === 1) samples.push(colors[0]);
  for (let i = 0; i + 1 < colors.length; i++) {
    const from = colors[i];
    const to = colors[i + 1];
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      samples.push({
        r: from.r + (to.r - from.r) * t,
        g: from.g + (to.g - from.g) * t,
        b: from.b + (to.b - from.b) * t,
        a: 1,
      });
    }
  }
  const composited = samples.map((sample) => (overlays.length ? applyOverlays(sample, overlays) : sample));
  let min = Infinity;
  let max = -Infinity;
  let minColor = null;
  let maxColor = null;
  for (const sample of composited) {
    const l = luminance(sample);
    if (l < min) { min = l; minColor = sample; }
    if (l > max) { max = l; maxColor = sample; }
  }
  return { min, max, minColor, maxColor, sampled: true };
}

/** Contrast ratio from two luminances. */
function ratioFromLuminance(l1, l2) {
  const [lighter, darker] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Verdict for text of a known colour over a background whose luminance
 * spans [range.min, range.max]. Definite in BOTH directions and
 * positioning-independent: pass only if the worst-case pixel passes,
 * fail only if the best-case pixel fails, otherwise 'mixed'.
 */
export function rangeVerdict(foreground, range, required) {
  const textLum = luminance(foreground);
  const inside = textLum >= range.min && textLum <= range.max;
  const worst = inside ? 1 : Math.min(ratioFromLuminance(textLum, range.min), ratioFromLuminance(textLum, range.max));
  const best = Math.max(ratioFromLuminance(textLum, range.min), ratioFromLuminance(textLum, range.max));
  if (worst >= required) return { verdict: 'pass', worst, best };
  if (best < required) return { verdict: 'fail', worst, best };
  return { verdict: 'mixed', worst, best };
}

/**
 * Does any stylesheet in this tree scope style ::first-line or
 * ::first-letter at all? Walked once per root per audit (nested rules and
 * imports included) so the two extra pseudo computed-style reads below are
 * paid only on pages that can need them. An unreadable cross-origin sheet
 * counts as "yes": not knowing is a reason to look, never to skip.
 */
function rootHasFirstLineRules(root) {
  let has = firstLineRulesCache.get(root);
  if (has !== undefined) return has;
  has = false;
  const scan = (rules) => {
    for (const rule of rules) {
      if (rule.selectorText && /::?first-(?:line|letter)\b/.test(rule.selectorText)) return true;
      const inner = rule.cssRules ?? rule.styleSheet?.cssRules;
      if (inner && scan(inner)) return true;
    }
    return false;
  };
  const sheets = [...(root.styleSheets ?? []), ...(root.adoptedStyleSheets ?? [])];
  for (const sheet of sheets) {
    try {
      if (scan(sheet.cssRules)) { has = true; break; }
    } catch {
      has = true;
      break;
    }
  }
  firstLineRulesCache.set(root, has);
  return has;
}

/**
 * Colours that repaint part of this element's own text through ::first-line
 * or ::first-letter, when they differ from the colour the element itself
 * computes. Each entry is { pseudo, color, style } with the pseudo's computed
 * style attached, because a drop cap may also change size and weight and so
 * its own large-scale threshold. Only block containers get a first line of
 * their own; inline elements are left to their base colour.
 * (2026-08-25 overnight audit, defect 6.)
 */
export function pseudoTextColors(element, style) {
  if (style.display === 'inline' || style.display === 'contents') return [];
  if (!rootHasFirstLineRules(element.getRootNode())) return [];
  const paintedColor = (s) => (s.webkitTextFillColor && s.webkitTextFillColor !== s.color ? s.webkitTextFillColor : s.color);
  const base = paintedColor(style);
  const found = [];
  for (const pseudo of ['::first-line', '::first-letter']) {
    const pseudoStyle = getComputedStyle(element, pseudo);
    const css = paintedColor(pseudoStyle);
    if (!css || css === base) continue;
    const color = parseColor(css);
    if (color) found.push({ pseudo, color, style: pseudoStyle });
  }
  return found;
}

/** WCAG "large text": ≥24px, or ≥18.66px (14pt) bold. */
export function isLargeText(style) {
  const size = parseFloat(style.fontSize);
  const weight = parseInt(style.fontWeight, 10) || 400;
  // 18pt and 14pt at CSS's 96dpi: 24px, and 56/3 = 18.666…px exactly.
  return size >= 24 || (size >= 56 / 3 && weight >= 700);
}
