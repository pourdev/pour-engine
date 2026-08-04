// WCAG SC 2.2.2 Pause, Stop, Hide (Level A)
// "For any moving, blinking or scrolling information that (1) starts
// automatically, (2) lasts more than five seconds, and (3) is presented in
// parallel with other content, there is a mechanism for the user to pause,
// stop, or hide it…"
//
// Two shapes are checkable, and they need different verdicts.
//
// <marquee> and <blink> exist only to move, ship no control of their own,
// and are obsolete: a definite failure.
//
// A CSS animation set to repeat for ever is the modern ticker. Clauses 1
// and 2 are settled by the CSS itself — it starts with the page and never
// ends — but clause 3's "mechanism" may be any button anywhere on the page,
// and no static pass can tell a pause control from any other button. So the
// finding goes to a human with the evidence attached, never asserted.
//
// Only motion carrying TEXT is reported. Spinners, drifting decorative
// blobs and shimmer effects move too, and flagging every loading indicator
// on the web would bury the finding that matters. Silence there is
// abstaining, not clearing.
const MOTION_PROPERTIES = new Set([
  'transform', 'translate', 'rotate', 'scale', 'offsetDistance', 'offsetPath', 'offsetRotate',
  'left', 'right', 'top', 'bottom',
  'marginLeft', 'marginRight', 'marginTop', 'marginBottom',
  'backgroundPosition', 'backgroundPositionX', 'backgroundPositionY', 'objectPosition',
]);

/** Does this keyframe set move the element around, rather than merely
 *  restyle it? A hue cycle is not movement; a translate is. */
function keyframesMove(keyframes) {
  return keyframes.some((frame) => Object.keys(frame).some((property) => MOTION_PROPERTIES.has(property)));
}

/** Blinking: the element is repeatedly taken away and put back. A gentle
 *  breathing pulse (0.6 → 1) is not what the criterion is about, so an
 *  opacity cycle only counts when it reaches near-invisible AND near-full. */
function keyframesBlink(keyframes) {
  if (keyframes.some((frame) => frame.visibility === 'hidden')) return true;
  const opacities = keyframes
    .map((frame) => parseFloat(frame.opacity))
    .filter((value) => !Number.isNaN(value));
  return opacities.some((value) => value <= 0.25) && opacities.some((value) => value >= 0.75);
}

/**
 * Elements that an endlessly repeating animation is currently moving,
 * mapped to the evidence. One document-wide getAnimations() call, never one
 * per element: per-node getAnimations() filters every animation on the page
 * each time, which turns animation-heavy pages quadratic.
 */
function endlesslyMoving(doc) {
  const moving = new Map();
  if (typeof doc.getAnimations !== 'function') return moving;
  let animations;
  try { animations = doc.getAnimations(); } catch { return moving; }
  for (const animation of animations) {
    // Paused, finished, or reversed-to-a-stop animations move nothing.
    if (animation.playState !== 'running' || !animation.playbackRate) continue;
    // Scroll- and view-driven animations advance only as the user scrolls,
    // so they do not "start automatically" in the sense of the criterion.
    if (animation.timeline && animation.timeline !== doc.timeline) continue;
    const effect = animation.effect;
    const target = effect?.target;
    if (!target || target.nodeType !== 1) continue;
    const timing = effect.getComputedTiming?.() ?? {};
    if (timing.iterations !== Infinity || !(timing.duration > 0)) continue;
    let keyframes;
    try { keyframes = effect.getKeyframes(); } catch { continue; }
    const moves = keyframesMove(keyframes);
    if (!moves && !keyframesBlink(keyframes)) continue;
    // A pseudo-element's motion is still the host element's motion.
    if (!moving.has(target)) {
      moving.set(target, { name: animation.animationName, verb: moves ? 'moves' : 'blinks' });
    }
  }
  return moving;
}

export default {
  id: 'pause-stop-hide',
  impact: 'serious',
  tags: ['wcag2a', 'wcag222'],
  help: 'Moving content must be pausable',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html',
  selector: '*',
  // The criterion is about VISIBLE movement — a display:none marquee moves
  // nothing. aria-hidden content still moves on screen, so the rendered
  // check (not the AT-exposure check) is the right filter.
  visibility: 'visual',
  // One getAnimations() call for the whole page, then a lookup per element.
  evaluateAll(elements) {
    if (!elements.length) return [];
    const moving = endlesslyMoving(elements[0].ownerDocument);
    return elements.map((element) => {
      if (element.tagName === 'MARQUEE' || element.tagName === 'BLINK') {
        // scrollamount="0" is the documented way to ship a <marquee> that
        // doesn't actually move.
        if (element.tagName === 'MARQUEE' && element.getAttribute('scrollamount') === '0') {
          return { status: 'pass' };
        }
        return {
          status: 'fail',
          message: `<${element.tagName.toLowerCase()}> scrolls or blinks with no way to pause it, which is unusable for people with attention or vestibular conditions.`,
          fix: 'Replace it with static content, or a CSS animation with a pause control that honours prefers-reduced-motion.',
        };
      }
      const animation = moving.get(element);
      if (!animation || !element.textContent.trim()) return { status: 'pass' };
      const named = animation.name ? ` (the “${animation.name}” animation)` : '';
      return {
        status: 'incomplete',
        message: `This content ${animation.verb} continuously${named}: the animation repeats for ever, so it runs well past the five seconds at which WCAG 2.2.2 requires a way to pause, stop or hide it. Check the page offers one, and that it reaches this content.`,
      };
    });
  },
};
