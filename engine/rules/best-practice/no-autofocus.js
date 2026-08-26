// Inside a dialog or popover the attribute never acts on page load: the HTML
// dialog focusing steps pick the autofocus descendant as the control to
// focus when the dialog is SHOWN, and the spec's own note tells authors to
// put autofocus on exactly that element (or on the dialog itself when there
// is none). Outside those containers the spec's caution ("use careful
// consideration") is real, but its own example of a page whose main purpose
// IS the control is legitimate use, so the DOM cannot prove a failure: the
// verdict is a review question (2026-08-25 overnight audit).
const FOCUS_CONTAINER = 'dialog, [role="dialog"], [role="alertdialog"], [popover]';

export default {
  id: 'no-autofocus',
  name: 'Autofocus on load',
  impact: 'minor',
  tags: ['best-practice'],
  help: 'autofocus disorients assistive-technology users',
  helpUrl: 'https://html.spec.whatwg.org/multipage/interaction.html#the-autofocus-attribute',
  selector: '[autofocus]',
  visibleOnly: false,
  evaluate(element) {
    if (element.closest(FOCUS_CONTAINER)) return { status: 'pass' };
    const tag = element.tagName.toLowerCase();
    return {
      status: 'incomplete',
      message: `autofocus moves focus to this <${tag}> as soon as the page loads, so screen-reader and magnifier users skip everything before it. Review: the HTML spec allows this only when the control is the page's main purpose (a search box on a search page, say); otherwise it disorients.`,
      fix: `Remove autofocus from the <${tag}> unless this control is the page's whole purpose; let users reach it in document order.`,
    };
  },
};
