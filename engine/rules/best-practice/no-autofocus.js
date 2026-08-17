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
    return {
      status: 'fail',
      message: 'autofocus jumps focus past the page start — screen-reader and magnifier users lose all the context before this element.',
      fix: `Remove autofocus from the <${element.tagName.toLowerCase()}>; let users reach it in document order.`,
    };
  },
};
