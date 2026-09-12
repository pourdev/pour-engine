// WCAG SC 3.3.9 Accessible Authentication (Enhanced) (Level AAA)
// 3.3.8 lets an authentication step use object recognition ("select every
// bus") and personal content; 3.3.9 removes both exceptions, so a picture
// puzzle in a login step needs an alternative method or a mechanism that
// helps the user through it. The one CAPTCHA fact the DOM shows is the
// widget itself: the reCAPTCHA, hCaptcha and Turnstile embeds and their
// site-key hosts. Whether that widget will ever show a picture puzzle
// (risk-based and invisible modes often do not) and whether another way in
// exists are not visible, so this asks and never asserts.
//
// Scope: the criterion covers steps of an AUTHENTICATION process. A
// CAPTCHA on a contact form or a comment box is outside it, so only a
// widget inside a form that also takes a credential (a password or a
// one-time code) is asked about.
const CREDENTIAL = 'input[type="password"], input[autocomplete~="current-password"], input[autocomplete~="one-time-code"]';

export default {
  id: 'captcha-alternative',
  name: 'CAPTCHA in a login step',
  impact: 'serious',
  tags: ['wcag22aaa', 'wcag339'],
  help: 'A picture-puzzle CAPTCHA in an authentication step needs an alternative (AAA)',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-enhanced.html',
  selector: 'iframe[src*="recaptcha" i], iframe[src*="hcaptcha" i], iframe[src*="turnstile" i], .g-recaptcha, .h-captcha, .cf-turnstile, [data-sitekey]',
  visibleOnly: false,
  evaluate(element) {
    const form = element.closest('form');
    if (!form || !form.querySelector(CREDENTIAL)) return { status: 'pass' };
    return {
      status: 'incomplete',
      message: 'This login form carries a CAPTCHA widget. If the challenge can escalate to a picture puzzle, that is object recognition, which 3.3.8 allows but 3.3.9 (AAA) does not: a cognitive function test in an authentication step then needs another way in (a passkey, an emailed link, a federated sign-in) or a mechanism that helps the user through it. Check what the widget can show and what the alternatives are.',
      fix: 'Use a risk-based or invisible challenge that never shows a puzzle, or offer another authentication method beside it.',
    };
  },
};
