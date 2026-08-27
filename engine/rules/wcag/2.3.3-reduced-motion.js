// WCAG SC 2.3.3 Animation from Interactions (Level AAA)
// "Motion animation triggered by interaction can be disabled, unless the
// animation is essential to the functionality or the information being
// conveyed."
//
// The criterion is about movement a person's own action sets off: the page
// scrolls and things glide, a pointer arrives and a card lifts, a link is
// followed and the viewport slides. The web's one standard way to let a
// reader turn such motion off is the prefers-reduced-motion media feature
// (technique C39): a page that honours it anywhere has a mechanism; one
// that animates on interaction and never mentions it has none.
//
// Three kinds of evidence are readable from the loaded page:
//   - scroll- and view-driven animations (animation-timeline: scroll() /
//     view()), read from the Web Animations API as animations on a timeline
//     other than the document's, whose keyframes move the element;
//   - smooth scrolling (scroll-behavior: smooth) on the root or the body,
//     which turns every in-page link and anchor jump into a glide;
//   - style rules keyed to :hover, :focus, :focus-visible, :focus-within or
//     :active that set a motion property (transform, translate, offset
//     path, position) on a subject that transitions or animates it: an
//     instant snap on hover is a change of place, not motion.
// Whether any of it is essential is the criterion's own test and a human
// call, so the rule reviews, never asserts. One question per page, on the
// root: the finding is about the page's motion policy, not about each
// element that moves. A stylesheet this audit cannot read (cross-origin
// without CORS) might be the one carrying the media rule, so the question
// says so when that is the case, and a page whose only motion sits in
// unreadable sheets is not asked at all.
import { keyframesMove } from './2.2.2-pause-stop-hide.js';

// Properties whose change on hover or focus is movement. Deliberately
// narrower than 2.2.2's list: `background` and `margin` shorthands expand
// to background-position and margin-* in the CSSOM, so a plain hover
// colour change would read as motion if those were counted.
const MOTION_CSS = [
  'transform', 'translate', 'rotate', 'scale', 'offset-path', 'offset-distance', 'offset-rotate',
  'left', 'right', 'top', 'bottom',
];
const INTERACTION = /:(?:hover|focus-visible|focus-within|focus|active)\b/;
const INTERACTION_ALL = /:(?:hover|focus-visible|focus-within|focus|active)\b/g;
const ANIMATES = /\b(?:all|transform|translate|rotate|scale|offset-path|offset-distance|offset-rotate|left|right|top|bottom|inset)\b/;

/** Does a hover/focus rule that sets a motion property actually ANIMATE
 *  its subject? 2.3.3 is about animation: a transform that snaps into
 *  place on hover is an instant change, not motion. The rule itself may
 *  declare the transition or animation; more often the resting rule does,
 *  so the elements the selector addresses at rest are sampled for a
 *  transition that covers a motion property (or `all`) with a duration.
 *  An interaction selector that matches nothing on this page moves
 *  nothing. Measured on the benchmark corpus: counting every hover
 *  transform asked the question of two pages in five, mostly 1px button
 *  nudges with no transition; this keeps it to pages that glide. */
/** Is the movement this rule declares more than a nudge? A transform that
 *  shifts its subject under 8px, or scales it within 15%, gives no sense of
 *  travel across the page (the criterion's own examples are parallax and
 *  elements flying in); counting those asked the question of a page in
 *  four for a hover lift on a button. Percentage translates, rotations,
 *  offset paths and inset changes always count: their size is unbounded
 *  or unknowable from the rule alone. */
function movesFar(rule) {
  const style = rule.style;
  if (['offset-path', 'offset-distance', 'offset-rotate', 'rotate', 'left', 'right', 'top', 'bottom']
    .some((property) => style.getPropertyValue(property))) return true;
  const values = ['transform', 'translate', 'scale'].map((property) => style.getPropertyValue(property)).join(' ');
  if (/rotate|skew|matrix|%|em|rem|vw|vh/.test(values)) return true;
  const px = [...values.matchAll(/(-?\d*\.?\d+)px/g)].map((m) => Math.abs(parseFloat(m[1])));
  if (px.some((n) => n >= 8)) return true;
  const scales = [...values.matchAll(/scale[XYZ3d]*\(([^)]*)\)/gi)].flatMap((m) => m[1].split(',').map((v) => parseFloat(v)));
  const bareScale = style.getPropertyValue('scale').split(/\s+/).map((v) => parseFloat(v)).filter((v) => !Number.isNaN(v));
  return [...scales, ...bareScale].some((v) => !Number.isNaN(v) && (v < 0.85 || v > 1.15));
}

function rulesAnimate(doc, rule) {
  const own = rule.style.getPropertyValue('transition-duration') || rule.style.getPropertyValue('animation-name');
  if (own && own !== 'none' && own !== '0s') return true;
  const resting = rule.selectorText.replace(INTERACTION_ALL, '').trim();
  if (!resting || /^[,\s]*$/.test(resting)) return false;
  let subjects;
  try { subjects = doc.querySelectorAll(resting); } catch { return false; }
  let seen = 0;
  for (const subject of subjects) {
    if (seen++ >= 5) break;
    const style = doc.defaultView.getComputedStyle(subject);
    const durations = style.transitionDuration.split(',').map((d) => parseFloat(d) || 0);
    if (!durations.some((d) => d > 0)) continue;
    if (ANIMATES.test(style.transitionProperty)) return true;
  }
  return false;
}

/** Walk every rule of every readable stylesheet (nested rules and imports
 *  included), collecting the two facts this rule needs. */
function readStyles(doc) {
  const facts = { honours: false, hoverMotion: 0, hoverSelectors: [], unreadable: 0 };
  const scan = (rules) => {
    for (const rule of rules) {
      const media = rule.media?.mediaText;
      if (media && /prefers-reduced-motion/i.test(media)) facts.honours = true;
      if (rule.selectorText && INTERACTION.test(rule.selectorText) && rule.style
        && MOTION_CSS.some((property) => rule.style.getPropertyValue(property))
        && movesFar(rule) && rulesAnimate(doc, rule)) {
        facts.hoverMotion += 1;
        if (facts.hoverSelectors.length < 3) facts.hoverSelectors.push(rule.selectorText.slice(0, 80));
      }
      const inner = rule.cssRules ?? rule.styleSheet?.cssRules;
      if (inner) {
        try { scan(inner); } catch { facts.unreadable += 1; }
      }
    }
  };
  const sheets = [...(doc.styleSheets ?? []), ...(doc.adoptedStyleSheets ?? [])];
  for (const sheet of sheets) {
    try { scan(sheet.cssRules); } catch { facts.unreadable += 1; }
  }
  return facts;
}

/** Animations that advance with scrolling rather than with time, and move. */
function scrollDrivenMotion(doc) {
  if (typeof doc.getAnimations !== 'function') return 0;
  let animations;
  try { animations = doc.getAnimations(); } catch { return 0; }
  let count = 0;
  for (const animation of animations) {
    if (!animation.timeline || animation.timeline === doc.timeline) continue;
    let keyframes;
    try { keyframes = animation.effect?.getKeyframes?.() ?? []; } catch { continue; }
    if (keyframesMove(keyframes)) count += 1;
  }
  return count;
}

export default {
  id: 'reduced-motion',
  name: 'Motion honours reduced-motion',
  impact: 'moderate',
  tags: ['wcag21aaa', 'wcag233'],
  help: 'Motion set off by scrolling, hovering or focusing should be switchable off',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html',
  selector: 'html',
  visibleOnly: false,
  evaluate(element) {
    const doc = element.ownerDocument;
    const win = doc.defaultView;
    const styles = readStyles(doc);
    if (styles.honours) return { status: 'pass' };

    const evidence = [];
    const scrolling = scrollDrivenMotion(doc);
    if (scrolling) evidence.push(`${scrolling} scroll-driven animation${scrolling === 1 ? '' : 's'} that move${scrolling === 1 ? 's' : ''} content`);
    const smooth = [doc.documentElement, doc.body].some((node) =>
      node && win.getComputedStyle(node).scrollBehavior === 'smooth');
    if (smooth) evidence.push('smooth scrolling on in-page navigation (scroll-behavior: smooth)');
    if (styles.hoverMotion) {
      const more = styles.hoverMotion > styles.hoverSelectors.length ? ', …' : '';
      evidence.push(`${styles.hoverMotion} style rule${styles.hoverMotion === 1 ? '' : 's'} animating movement on hover or focus (${styles.hoverSelectors.join(', ')}${more})`);
    }
    if (!evidence.length) return { status: 'pass' };

    const unread = styles.unreadable
      ? ` (${styles.unreadable} stylesheet${styles.unreadable === 1 ? '' : 's'} could not be read and might carry one)`
      : '';
    return {
      status: 'incomplete',
      message: `This page moves content when people interact with it (${evidence.join('; ')}), and none of the stylesheets this audit could read honours prefers-reduced-motion${unread}. 2.3.3 asks that such motion can be turned off unless it is essential.`,
      fix: 'Put the motion inside @media (prefers-reduced-motion: no-preference), or remove it under @media (prefers-reduced-motion: reduce), keeping only motion that is essential to the function or the information.',
    };
  },
};
