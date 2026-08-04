// WCAG SC 2.2.1 Timing Adjustable (Level A)
export default {
  id: 'meta-refresh',
  impact: 'critical',
  tags: ['wcag2a', 'wcag221'],
  help: 'The page must not use a timed refresh',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html',
  selector: 'meta[http-equiv="refresh" i]',
  visibleOnly: false,
  evaluate(element) {
    const content = element.getAttribute('content') ?? '';
    const delay = parseInt(content, 10);
    // A refresh with no destination reloads THIS page. At zero seconds that
    // is not the allowed instant redirect — it is a loop that throws the
    // user back to the top of the page over and over (failure F41).
    const hasDestination = /;\s*url\s*=/i.test(content);
    if (delay === 0 && !hasDestination) {
      return {
        status: 'fail',
        message: 'The page reloads itself immediately and has no destination to move on to, so the reload repeats for as long as the page is open. Nobody can read or complete anything on it.',
        fix: 'Remove the timed refresh. If this is meant to be a redirect, give it a url (content="0; url=…"); if the content needs updating, update it in place instead of reloading.',
      };
    }
    if (!(delay > 0)) return { status: 'pass' }; // 0 with a url = immediate redirect, allowed
    // 2.2.1 exempts a time limit "longer than 20 hours" — 20 hours exactly
    // is still inside the criterion.
    if (delay > 72000) return { status: 'pass' };
    return {
      status: 'fail',
      message: `The page refreshes/redirects after ${delay}s — slow readers lose their place (or the whole page) with no control.`,
      fix: 'Remove the timed refresh; let users act in their own time.',
    };
  },
};
