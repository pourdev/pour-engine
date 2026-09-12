// WCAG SC 2.2.4 Interruptions (Level AAA) and SC 3.2.5 Change on Request
// (Level AAA) — the timed meta refresh, with none of 2.2.1's escapes.
//
// Both criteria list the same two failure techniques: F40 (a meta redirect
// with a time limit) and F41 (a meta refresh that reloads the page). 2.2.1
// excuses a limit longer than 20 hours; neither AAA criterion does. An
// interruption the reader cannot postpone or suppress breaks 2.2.4, and a
// change of context the reader did not ask for breaks 3.2.5, however long
// the timer. The instant redirect (zero seconds with a destination) stays
// allowed: G110 and H76 are sufficient techniques of 3.2.5 itself.
//
// One rule, two tags, on the twin-tag precedent (2.1.1/2.1.3): the same
// fact fails both. It runs beside 2.2.1's rule at AAA scope, so a refresh
// inside 20 hours is reported by both; each names its own criterion.
// 2.2.4 exempts emergencies, which a meta tag cannot show, so the message
// names that assumption the way the 2.2.1 rule names its own.
import { refreshDelay, refreshDestination } from './2.2.1-meta-refresh.js';

export default {
  id: 'meta-refresh-no-exceptions',
  name: 'Timed refresh (AAA)',
  impact: 'serious',
  tags: ['wcag2aaa', 'wcag224', 'wcag325'],
  help: 'The page must not refresh or redirect itself on any timer (AAA)',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/interruptions.html',
  selector: 'meta[http-equiv="refresh" i]',
  visibleOnly: false,
  evaluate(element) {
    const content = element.getAttribute('content') ?? '';
    const delay = refreshDelay(content);
    // The browser discards the directive: nothing is scheduled.
    if (delay === null) return { status: 'pass' };
    const hasDestination = refreshDestination(content) !== '';
    // Zero seconds with a destination is the instant client-side redirect
    // that G110 and H76 permit.
    if (delay === 0 && hasDestination) return { status: 'pass' };
    if (!hasDestination) {
      return {
        status: 'fail',
        message: `The page reloads itself${delay > 0 ? ` every ${delay}s` : ' immediately, over and over'} (failure F41). The reader cannot postpone or suppress the reload, which 2.2.4 requires, and it changes the page without being asked, which 3.2.5 forbids. Neither AAA criterion has 2.2.1's 20-hour allowance.`,
        fix: 'Remove the timed refresh and update the content in place, or let the reader request an update with a control.',
      };
    }
    return {
      status: 'fail',
      message: `The page redirects itself after ${delay}s (failure F40). The reader cannot postpone or suppress the move, which 2.2.4 requires, and the change of context is not requested, which 3.2.5 forbids; the AAA criteria allow no 20-hour exemption. 2.2.4 excuses only an emergency, which the tag cannot show, so this finding assumes there is none.`,
      fix: 'Redirect instantly (content="0; url=…") or on the server, or give the reader a link and let them choose when to move.',
    };
  },
};
