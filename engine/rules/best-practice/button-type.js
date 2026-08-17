export default {
  id: 'button-type',
  name: 'Button types in forms',
  impact: 'minor',
  tags: ['best-practice'],
  help: 'Buttons inside forms should declare their type',
  helpUrl: 'https://html.spec.whatwg.org/multipage/form-elements.html#attr-button-type',
  selector: 'form button:not([type]), form button[type=""]',
  evaluate() {
    return {
      status: 'fail',
      message: 'A <button> without type inside a form defaults to type="submit" — pressing Enter (or activating it with AT) can submit the form by accident.',
      fix: 'Add type="button" (or type="submit" if submission is intended).',
    };
  },
};
