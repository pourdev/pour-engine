// WCAG SC 2.5.7 Dragging Movements (Level AA, new in 2.2)
//
// Functionality operated by dragging must also work through single-pointer
// clicks or taps, unless dragging is essential or the behaviour is the
// user agent's. Custom drag logic is script and mostly invisible to a
// scan, but one author signal is explicit in the DOM: draggable="true"
// written on an element. Whether an equivalent no-drag path exists (an
// up/down button beside a sortable row, a picker beside a slider) is not
// decidable from markup, so this asks, it never asserts.
//
// Scoped to keep the question honest:
//   - only the EXPLICIT attribute counts. Images, links and selections
//     are draggable by browser default (drag-to-desktop, drag-to-text) —
//     that is user-agent behaviour, which the SC itself exempts — so <img>
//     and <a href> are skipped even with the attribute written out: authors
//     write draggable="true" there to re-state or fine-tune a UA default,
//     not to build an interaction.
//   - native range inputs are UA controls: a single click on the track
//     moves the thumb without dragging, which is the alternative already
//     existing. They never carried the attribute anyway.
// Drag interactions wired purely through pointer events with no draggable
// attribute are a DISCLOSED gap: listeners are not enumerable from a page.
export default {
  id: 'drag-alternative',
  name: 'Dragging alternative',
  impact: 'moderate',
  tags: ['wcag22aa', 'wcag257'],
  help: 'Dragging must have a single-pointer alternative',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html',
  selector: '[draggable="true" i]:not(img):not(a[href])',
  evaluate() {
    return {
      status: 'incomplete',
      message: 'This element declares itself draggable, and 2.5.7 requires everything achievable by dragging to also work with single clicks or taps — tremors, switch access and head pointers can press but not drag. Check an equivalent no-drag path exists (buttons to reorder, a menu to move, a field to set the value), unless dragging itself is essential here.',
      fix: 'Add a single-pointer way to do the same thing, e.g. up/down buttons beside a sortable item or a "move to" action in a menu.',
    };
  },
};
