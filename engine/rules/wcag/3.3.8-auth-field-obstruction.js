// WCAG SC 3.3.8 Accessible Authentication (Minimum) (Level AA)
// The SC permits a cognitive function test when the step offers an
// Alternative, a Mechanism, Object Recognition, or Personal Content. Note 2
// names TWO example mechanisms, separately: password-manager support, and
// copy and paste.
//
// That separation is what this rule turns on. Blocking paste removes one of
// the two, but a password manager fills a field programmatically and never
// touches the clipboard, so the other mechanism usually survives — and a
// page may also offer an Alternative (a passkey, a federated sign-in, an
// emailed link) that this rule cannot see. Blocked paste is therefore
// reported for REVIEW, not failed. Both mechanisms obstructed at once is the
// case worth asserting.
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
    const autocompleteOff = (element.getAttribute('autocomplete') ?? '').trim().toLowerCase() === 'off';
    const action = blocking === 'onpaste' ? 'pasting' : 'dropping';
    if (blocking && autocompleteOff) {
      return {
        status: 'fail',
        message: `This authentication field blocks ${action} AND sets autocomplete="off", so both of the mechanisms 3.3.8 names are obstructed at once: copy and paste, and password-manager entry. What is left is typing the credential from memory.`,
        fix: 'Remove the paste/drop blocking, and drop autocomplete="off" so a password manager can fill the field.',
      };
    }
    if (blocking) {
      return {
        status: 'incomplete',
        message: `This authentication field blocks ${action}, which removes copy and paste, one of the two mechanisms 3.3.8 names. A password manager fills the field directly and is unaffected, so this is only a failure if nothing else here helps. Check whether a password manager can complete this login, or whether the page offers another way in such as a passkey or a federated sign-in.`,
        fix: `Remove the ${action === 'pasting' ? 'paste' : 'drop'} blocking, or make sure another way to sign in is available that does not rely on recalling the credential.`,
      };
    }
    if (autocompleteOff) {
      return {
        status: 'incomplete',
        message: 'This authentication field sets autocomplete="off", discouraging password managers. Browsers often fill anyway — verify a password manager can complete this login without retyping.',
      };
    }
    return { status: 'pass' };
  },
};
