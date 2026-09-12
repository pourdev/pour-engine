// WCAG SC 2.5.1 Pointer Gestures (Level A)
// Functionality operated by a path-based gesture (a swipe, a drag along a
// track, a drawn shape) or a multipoint gesture (a pinch) must also work
// with a single pointer and no path, unless the gesture is essential. The
// gesture logic itself lives in script, which a scan cannot read. But a
// page that implements its own swipe, pan or pinch has to tell the
// browser to stand aside first, and it does that in one visible place: the
// CSS touch-action property. `touch-action: none` hands every touch to
// the script; `pan-y` keeps vertical scrolling native and hands horizontal
// swipes (the carousel) to the script; `pan-x` the reverse; a value
// without `pinch-zoom` hands the pinch (the map) to the script. Those
// elements are the honest candidates. Whether the swipe or pinch has a
// single-pointer twin (next and previous buttons, zoom buttons) is not
// decidable from markup, so this asks and never asserts.
//
// Kept out, and why:
//   - `auto` and `manipulation`: nothing is handed to script beyond the
//     double-tap zoom delay.
//   - `pan-x pan-y` (both axes native, only the pinch withheld): measured
//     on the corpus as a scroll-snap carousel and "no pinch zoom" wrappers,
//     never a pinch handler; the browser still does all the panning.
//   - range inputs and role="slider": the Understanding says a slider that
//     drifts off its track is not path-based, and G216 covers it.
//   - draggable="true" elements: 2.5.7's question (drag-alternative).
//   - elements under 100 by 60 px: a gesture surface that small is not one.
// Only the outermost candidate in a subtree is reported, once; descendants
// that inherit or repeat the declaration ride with it. Stylesheets a
// cross-origin policy hides are not a problem here: the computed value on
// the element is read, whatever sheet set it.
const HANDLED = new Set(['auto', 'manipulation']);

function handsGestureToScript(value) {
  if (!value || HANDLED.has(value)) return false;
  const tokens = value.split(/\s+/);
  if (tokens.includes('none')) return true;
  const panX = tokens.some((t) => /^pan-(x|left|right)$/.test(t));
  const panY = tokens.some((t) => /^pan-(y|up|down)$/.test(t));
  // One axis withheld is a swipe handler (pan-y is the carousel; pan-x the
  // vertical one); both axes native is the browser scrolling as usual.
  return !panX || !panY;
}

export default {
  id: 'pointer-gesture-alternative',
  name: 'Pointer gesture alternative',
  impact: 'serious',
  tags: ['wcag21a', 'wcag251'],
  help: 'Swipe, pan and pinch gestures need a single-pointer alternative',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/pointer-gestures.html',
  selector: '*',
  visibleOnly: false,
  evaluateAll(elements, { isRendered }) {
    const candidates = new Set();
    for (const element of elements) {
      const tag = element.tagName;
      if (tag === 'HTML' || tag === 'BODY' || tag === 'SCRIPT' || tag === 'STYLE' || tag === 'LINK' || tag === 'META' || tag === 'TEMPLATE') continue;
      // Cheap gates first: the style read is paid only by rendered boxes
      // that could be a gesture surface at all.
      if (element.getAttribute('draggable') === 'true' || element.getAttribute('role') === 'slider' || (tag === 'INPUT' && element.type === 'range')) continue;
      const rect = element.getBoundingClientRect();
      if (rect.width < 100 || rect.height < 60) continue;
      if (!isRendered(element)) continue;
      const value = getComputedStyle(element).touchAction;
      if (!handsGestureToScript(value)) continue;
      candidates.add(element);
    }
    // Outermost only, and one per row of siblings: a carousel's track,
    // slides and images all inherit the same declaration (and a cloned
    // slide strip repeats it eleven times, measured on a corpus home), and
    // one question per gesture surface is enough.
    const outermost = new Set();
    const reportedParents = new Set();
    for (const element of candidates) {
      let nested = false;
      for (let parent = element.parentElement; parent; parent = parent.parentElement) {
        if (candidates.has(parent)) { nested = true; break; }
      }
      if (nested || reportedParents.has(element.parentElement)) continue;
      reportedParents.add(element.parentElement);
      outermost.add(element);
    }
    return elements.map((element) => {
      if (!outermost.has(element)) return { status: 'pass' };
      const value = getComputedStyle(element).touchAction;
      const tokens = value.split(/\s+/);
      const handled = tokens.includes('none') ? 'every touch gesture'
        : [
          !tokens.some((t) => /^pan-(x|left|right)$/.test(t)) && 'horizontal swipes',
          !tokens.some((t) => /^pan-(y|up|down)$/.test(t)) && 'vertical swipes',
        ].filter(Boolean).join(' and ');
      return {
        status: 'incomplete',
        message: `touch-action: ${value} tells the browser to hand ${handled} on this element to the page's own script, which is how custom swipe, pan and pinch interactions are built. 2.5.1 requires whatever those gestures do to also work with a single tap or click (previous and next buttons, zoom in and out, a choose-a-value control), unless the gesture is essential. Check a single-pointer way exists for everything the gesture does.`,
        fix: 'Add plain buttons for the same actions (previous/next, zoom in/out), or make the element operable by simple clicks as well as gestures.',
      };
    });
  },
};
