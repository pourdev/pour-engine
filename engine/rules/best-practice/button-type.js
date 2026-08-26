/** The form's default button: the first submit button in tree order (the
 *  one implicit submission activates). Reads the form's own descendants;
 *  controls associated from outside via form="" are out of this rule's
 *  selector anyway. Written as a query, not form.elements, because a
 *  control named "elements" shadows that property on the form. */
function defaultButton(form) {
  return form.querySelector('button, input[type="submit"], input[type="image"]');
}

export default {
  id: 'button-type',
  name: 'Button types in forms',
  impact: 'minor',
  tags: ['best-practice'],
  help: 'Buttons inside forms should declare their type',
  helpUrl: 'https://html.spec.whatwg.org/multipage/form-elements.html#attr-button-type',
  selector: 'form button:not([type]), form button[type=""]',
  evaluate(element) {
    // HTML, button type: "The missing value default and invalid value
    // default are both the Submit Button state." That fixes the default; it
    // does not make relying on it an error. When this is the form's only
    // button AND its default button, submitting is its whole purpose and
    // nothing happens by accident, so there is nothing to report. Otherwise
    // the finding states the implicit-default fact and asks for the type
    // to be declared (2026-08-25 overnight audit).
    const form = element.form ?? element.closest('form');
    const buttons = form.querySelectorAll('button');
    if (buttons.length === 1 && buttons[0] === element && defaultButton(form) === element) {
      return { status: 'pass' };
    }
    return {
      status: 'fail',
      message: 'A <button> without a type inside a form is a submit button by default (the HTML missing value default is the Submit Button state), so activating it submits the form. Declare the type so the intent is explicit.',
      fix: 'Add type="button" (or type="submit" if submission is intended).',
    };
  },
};
