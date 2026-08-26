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
//
// Paste only (2026-08-25 overnight audit): an ondrop handler used to count
// as a paste blocker. It is not. Drag and drop is a different event and a
// different user action, appears nowhere in the SC, its notes or F109, and
// leaves copy and paste fully working, so ondrop is no evidence at all.
//
// Scope (2026-08-25 overnight audit): the Understanding says the criterion
// "is focused on authentication of existing users. It does not cover
// creation of a username or initiation of an account." Choosing a new
// password recalls nothing. So autocomplete="new-password" fields are out
// of the selector, and a bare type="password" is only PROVABLY a login
// credential when the author says so (autocomplete="current-password") or
// the form has the classic sign-in shape: exactly one password field beside
// a username or email field. Two password fields in one form is the shape
// of sign-up or a password change, and that field is asked about, never
// failed. The fail branch fires only on a provable login credential.
export default {
  id: 'auth-field-obstruction',
  name: 'Accessible login fields',
  impact: 'serious',
  tags: ['wcag22aa', 'wcag338'],
  help: 'Login fields must not block paste or password managers',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html',
  selector: 'input[type="password"]:not([autocomplete~="new-password"]), input[autocomplete~="current-password"], input[autocomplete~="one-time-code"]',
  evaluate(element) {
    // Inline handlers are the only statically-visible blockers; framework
    // listeners are invisible to a DOM audit.
    const blocksPaste = /return\s+false|preventDefault/.test(element.getAttribute('onpaste') ?? '');
    const tokens = (element.getAttribute('autocomplete') ?? '').trim().toLowerCase().split(/\s+/).filter(Boolean);
    const autocompleteOff = tokens.length === 1 && tokens[0] === 'off';
    if (!blocksPaste && !autocompleteOff) return { status: 'pass' };

    // Is this field provably an existing credential, i.e. inside 3.3.8?
    const form = element.form ?? element.closest('form');
    const passwordFields = form ? form.querySelectorAll('input[type="password"]').length : (element.type === 'password' ? 1 : 0);
    const identityField = form?.querySelector('input[autocomplete~="username"], input[autocomplete~="email"], input[type="email"]');
    const provenLogin = tokens.includes('current-password') || tokens.includes('one-time-code')
      || (passwordFields === 1 && Boolean(identityField));
    const scopeQuestion = passwordFields >= 2
      ? 'This form holds more than one password field, the shape of account sign-up or a password change, which 3.3.8 does not cover unless the field takes an existing credential. Confirm whether this field is part of an authentication step at all.'
      : 'Nothing here shows the field takes an existing credential (no current-password purpose, and no username or email field beside it), so confirm it is part of signing in before treating this as a failure.';
    const step = provenLogin ? 'this login' : 'this step';

    if (blocksPaste && autocompleteOff) {
      if (provenLogin) {
        return {
          status: 'fail',
          message: `This authentication field blocks pasting AND sets autocomplete="off", so both of the mechanisms 3.3.8 names are obstructed at once: copy and paste, and password-manager entry. What is left is typing the credential from memory.`,
          fix: 'Remove the paste blocking, and drop autocomplete="off" so a password manager can fill the field.',
        };
      }
      return {
        status: 'incomplete',
        message: `This password field blocks pasting AND sets autocomplete="off". If it is part of signing in, both of the mechanisms 3.3.8 names are obstructed at once (copy and paste, and password-manager entry) and it fails. ${scopeQuestion}`,
        fix: 'Remove the paste blocking, and drop autocomplete="off" so a password manager can fill the field.',
      };
    }
    if (blocksPaste) {
      return {
        status: 'incomplete',
        message: `This field blocks pasting, which removes copy and paste, one of the two mechanisms 3.3.8 names. A password manager fills the field directly and is unaffected, so this is only a failure if nothing else here helps. Check whether a password manager can complete ${step}, or whether the page offers another way in such as a passkey or a federated sign-in.${provenLogin ? '' : ` ${scopeQuestion}`}`,
        fix: 'Remove the paste blocking, or make sure another way to sign in is available that does not rely on recalling the credential.',
      };
    }
    return {
      status: 'incomplete',
      message: `This field sets autocomplete="off", discouraging password managers. Browsers often fill anyway: verify a password manager can complete ${step} without retyping.${provenLogin ? '' : ` ${scopeQuestion}`}`,
    };
  },
};
