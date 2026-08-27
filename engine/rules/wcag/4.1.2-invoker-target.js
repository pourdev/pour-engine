// WCAG SC 4.1.2 Name, Role, Value (Level A) — the HTML invoker slice
//
// HTML's invoker attributes wire a button to the element it acts on:
// `popovertarget` opens, closes or toggles a popover, and `commandfor` with
// a `command` drives a popover or a <dialog> (or a custom `--` command the
// page handles itself). The browser builds the accessibility relationship
// from that wiring on its own: the button exposes its expanded state and a
// relation to what it controls, with no ARIA written by the author.
//
// That relationship exists only when the reference resolves. An id that
// names nothing, a popovertarget aimed at an element with no popover
// attribute, or show-modal aimed at a <div>, leaves a button that does
// nothing when activated and exposes no state: the same defect as a
// dangling aria-controls, which aria-valid-refs asserts, except that here
// it is the browser's own semantics that go missing. Decidable from the
// DOM, so asserted.
//
// Unknown command keywords are NOT judged: the command vocabulary is still
// growing (new built-ins ship every few releases), and a keyword this
// engine has not heard of is not evidence of a fault.
const POPOVER_COMMANDS = new Set(['toggle-popover', 'show-popover', 'hide-popover']);
const DIALOG_COMMANDS = new Set(['show-modal', 'close', 'request-close']);

export default {
  id: 'invoker-target',
  name: 'Popover and command targets',
  impact: 'serious',
  tags: ['wcag2a', 'wcag412'],
  help: 'popovertarget and commandfor must point at an element they can act on',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html',
  selector: '[popovertarget], [commandfor]',
  evaluate(element) {
    // Ids resolve within the button's own tree scope (a shadow root's ids
    // are its own), exactly as the browser resolves them.
    const root = element.getRootNode();
    const lookup = (id) => (id && root.getElementById?.(id)) || null;
    const problems = [];

    if (element.hasAttribute('popovertarget')) {
      const id = element.getAttribute('popovertarget').trim();
      const target = lookup(id);
      if (!target) {
        problems.push(`popovertarget="${id}" names no element in this document`);
      } else if (!target.hasAttribute('popover')) {
        problems.push(`popovertarget="${id}" points at a <${target.tagName.toLowerCase()}> with no popover attribute, which the button cannot open`);
      }
    }

    if (element.hasAttribute('commandfor')) {
      const id = element.getAttribute('commandfor').trim();
      const command = (element.getAttribute('command') ?? '').trim().toLowerCase();
      const target = lookup(id);
      if (!target) {
        problems.push(`commandfor="${id}" names no element in this document`);
      } else if (!command) {
        problems.push('commandfor has no command attribute, so activating the button does nothing');
      } else if (POPOVER_COMMANDS.has(command) && !target.hasAttribute('popover')) {
        problems.push(`command="${command}" needs a popover, and "${id}" has no popover attribute`);
      } else if (DIALOG_COMMANDS.has(command) && target.tagName !== 'DIALOG') {
        problems.push(`command="${command}" needs a <dialog>, and "${id}" is a <${target.tagName.toLowerCase()}>`);
      }
    }

    if (!problems.length) return { status: 'pass' };
    return {
      status: 'fail',
      message: `${problems.join('; ')}. Activating this button does nothing, and the expanded state and control relationship the browser would expose for it are missing.`,
      fix: 'Point the attribute at the id of the popover or dialog it drives (give that element the popover attribute, or make it a <dialog>), and keep the id unique in this tree.',
    };
  },
};
