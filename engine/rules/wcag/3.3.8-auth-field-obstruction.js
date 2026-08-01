// WCAG SC 3.3.8 Accessible Authentication (Minimum) (Level AA)
// The SC requires a cognitive-function-test-free way to authenticate, and
// names copy-paste and password managers as the mechanisms that provide
// it. Blocking paste on a password/OTP field removes exactly that
// mechanism — a provable failure. autocomplete="off" merely ASKS the
// browser not to help; password managers often fill anyway, so that's a
// review flag, not an assertion.
export default {
  id: 'auth-field-obstruction',
  impact: 'serious',
  tags: ['wcag22aa', 'wcag338'],
  help: 'Login fields must not block paste or password managers',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html',
  selector: 'input[type="password"], input[autocomplete~="current-password"], input[autocomplete~="one-time-code"], input[autocomplete~="new-password"]',
  evaluate(element) {
    // Inline handlers are the only statically-visible blockers; framework
    // listeners are invisible to a DOM audit.
    const blocking = ['onpaste', 'ondrop'].find((attr) => {
      const handler = element.getAttribute(attr) ?? '';
      return /return\s+false|preventDefault/.test(handler);
    });
    if (blocking) {
      return {
        status: 'fail',
        message: `This authentication field blocks ${blocking === 'onpaste' ? 'pasting' : 'dropping'} — users of password managers must retype credentials from memory, a cognitive function test 3.3.8 forbids.`,
        fix: 'Remove the paste/drop blocking; let password managers and copy-paste work.',
      };
    }
    if ((element.getAttribute('autocomplete') ?? '').trim().toLowerCase() === 'off') {
      return {
        status: 'incomplete',
        message: 'This authentication field sets autocomplete="off", discouraging password managers. Browsers often fill anyway — verify a password manager can complete this login without retyping.',
      };
    }
    return { status: 'pass' };
  },
};
