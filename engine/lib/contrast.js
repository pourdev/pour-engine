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
const HAS_IMAGE = Symbol('background-image in chain');

export function resetAuditCaches() {
  backgroundCache = new WeakMap();
  opacityCache = new WeakMap();
  opacityAnimatorsCache = null;
  mediaRectsCache = null;
  panelRectsCache = null;
  pseudoCache = new WeakMap();
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
    node = node.parentElement ?? node.getRootNode()?.host) {
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
      const behind = resolveBackground(element.parentElement ?? element.getRootNode()?.host, doc);
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
 * 'unresolved' when something paints there that flat colour math can't
 * follow, or null when no pseudo of this host paints over the point.
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
    const paints = style.backgroundImage !== 'none' || (parseColor(style.backgroundColor)?.a ?? 0) > 0;
    if (!paints) continue;
    // In-flow pseudos (the overwhelming majority: bullets, icons, rules,
    // badges) occupy their own box in the content flow beside the text
    // rather than painting behind it. Only out-of-flow ones can be the
    // backdrop, so everything else is simply not a layer here — treating
    // them as unknowable would abstain on half the web.
    if (style.position !== 'absolute' && style.position !== 'fixed') continue;
    const rect = style.position === 'absolute' ? pseudoRect(host, style) : null;
    // Paint we can't place can't be ruled in or out — say so rather than
    // silently leaving it out of the stack.
    if (!rect) { layers = 'unresolved'; break; }
    if (rect.empty) continue; // placed, and covers nothing
    let color = parseColor(style.backgroundColor);
    const opacity = parseFloat(style.opacity);
    if (color && Number.isFinite(opacity) && opacity < 1) color = { ...color, a: color.a * opacity };
    // Gradient and image paint rides along as CSS so callers can sample it,
    // the same way they sample an element's background-image — a gradient
    // scrim over a card headline is a bracketable backdrop, not a mystery.
    const imageCss = style.backgroundImage !== 'none' ? style.backgroundImage : null;
    layers.push({ rect, color, imageCss });
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
 * sample, 'unresolved' when paint in the chain can't be placed, or null when
 * no pseudo covers the text.
 */
export function pseudoBackdropForText(element) {
  const point = textSamplePoint(element);
  if (!point) return null;
  let acc = null;
  for (let node = element; node && node.nodeType === 1; node = node.parentElement ?? node.getRootNode()?.host) {
    const layers = pseudoLayers(node);
    // Paint we can't place can't be ruled in or out, in either direction.
    if (layers === 'unresolved') return 'unresolved';
    for (const { rect, color, imageCss } of layers) {
      if (point.x < rect.left || point.x > rect.right || point.y < rect.top || point.y > rect.bottom) continue;
      // Gradient/image paint is bracketable by sampling, so hand it to the
      // caller rather than giving up on the whole element.
      if (imageCss) return { image: { css: imageCss, element: node } };
      if (!color || color.a === 0) continue;
      acc = acc ? composite(acc, color) : color;
      if (acc.a >= 1) return { color: acc };
    }
  }
  return acc ? { color: acc } : null;
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
  const own = parseColor(getComputedStyle(element).backgroundColor);
  if (own && own.a > 0) {
    if (own.a >= 1) return { color: own, scrim };
    acc = own;
  }
  if (start === -1) return 'unresolved';
  for (const layer of stack.slice(start + 1)) {
    // Replaced elements paint their content, not a background — a photo or
    // video in the stack is an image backdrop whatever its styles say.
    if (/^(img|video|canvas|svg|picture|object|embed|iframe)$/i.test(layer.tagName)) {
      return { image: layer, scrim };
    }
    const style = getComputedStyle(layer);
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
      if (!rects.length || rects.some(covers)) return { image: layer, scrim };
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
export function parseTextShadows(cssText) {
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
export function mediaRects(doc) {
  if (!mediaRectsCache) {
    mediaRectsCache = [];
    for (const el of doc.querySelectorAll('img, video, canvas, svg')) {
      const rect = el.getBoundingClientRect();
      // Sub-icon-sized media can't plausibly serve as a text backdrop.
      // Decorative media with pointer-events: none (animated gradient
      // canvases, ambient video) paints under text yet never appears in
      // elementsFromPoint stacks — flagged so callers can distrust even a
      // hit-test-verified backdrop where such media overlaps.
      if (rect.width >= 8 && rect.height >= 8) {
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
export function imageLuminanceRange(url, overlays = []) {
  const cacheKey = overlays.length ? `${url}|${overlayKey(overlays)}` : url;
  if (imageRangeCache.has(cacheKey)) return imageRangeCache.get(cacheKey);
  const promise = new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timer = setTimeout(() => resolve(null), 1500); // never stall an audit on a slow image
    img.onload = () => {
      clearTimeout(timer);
      try {
        const size = 32;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;
        let min = 1;
        let max = 0;
        // The colours at those extremes, kept for the same reason the
        // gradient range keeps them: translucent text blends with the actual
        // pixels, and a luminance cannot be un-gamma'd back into an rgb.
        let minColor = null;
        let maxColor = null;
        let opaquePixels = 0;
        for (let i = 0; i < data.length; i += 4) {
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
        resolve(min <= max
          ? { min, max, minColor, maxColor, width: img.naturalWidth, height: img.naturalHeight }
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
export function backgroundImagePaintRects(element) {
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
  if ((style.backgroundImage.match(/url\(|gradient\(/g) ?? []).length !== 1) return null;
  if (style.backgroundRepeat !== 'no-repeat') return null; // may tile under the text
  if (style.backgroundSize === 'cover' || style.backgroundSize === 'contain') return null;
  const box = element.getBoundingClientRect();
  const dimension = (value, total, auto) => {
    if (value?.endsWith('px')) return parseFloat(value);
    if (value?.endsWith('%')) return (parseFloat(value) / 100) * total;
    return auto;
  };
  const size = style.backgroundSize.split(' ');
  const width = dimension(size[0], box.width, intrinsic?.width);
  const height = dimension(size[1] ?? size[0], box.height, intrinsic?.height);
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
  const pos = style.backgroundPosition.split(' ');
  const offsetX = offset(pos[0], box.width, width);
  const offsetY = offset(pos[1] ?? '50%', box.height, height);
  if (offsetX === null || offsetY === null || Number.isNaN(offsetX) || Number.isNaN(offsetY)) return null;
  const left = box.left + offsetX;
  const top = box.top + offsetY;
  return { left, top, right: left + width, bottom: top + height };
}

/**
 * Luminance range of a CSS gradient, from its colour stops. Interpolated
 * colours stay close enough to their stops' luminances to bracket.
 */
export function gradientLuminanceRange(backgroundImageCss, overlays = []) {
  const stops = (backgroundImageCss.match(/rgba?\([^)]+\)/g) ?? []).map(parseColor).filter(Boolean);
  if (!stops.length || stops.some((c) => c.a < 1)) return null; // translucent stops reveal what's beneath
  const composited = stops.map((stop) => (overlays.length ? applyOverlays(stop, overlays) : stop));
  const lums = composited.map(luminance);
  const min = Math.min(...lums);
  const max = Math.max(...lums);
  // The COLOURS at the extremes, not just their luminances: translucent text
  // takes its presented colour from the pixels beneath, so bracketing that
  // blend needs the actual rgb to composite against, and luminance alone
  // cannot be un-gamma'd back into one.
  return {
    min,
    max,
    minColor: composited[lums.indexOf(min)],
    maxColor: composited[lums.indexOf(max)],
  };
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

/** WCAG "large text": ≥24px, or ≥18.66px (14pt) bold. */
export function isLargeText(style) {
  const size = parseFloat(style.fontSize);
  const weight = parseInt(style.fontWeight, 10) || 400;
  return size >= 24 || (size >= 18.66 && weight >= 700);
}
