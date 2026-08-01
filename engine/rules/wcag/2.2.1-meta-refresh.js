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
    const delay = parseInt(element.getAttribute('content') ?? '', 10);
    if (!(delay > 0)) return { status: 'pass' }; // 0 = immediate redirect, allowed
    if (delay >= 72000) return { status: 'pass' }; // 2.2.1 exempts limits over 20 hours
    return {
      status: 'fail',
      message: `The page refreshes/redirects after ${delay}s — slow readers lose their place (or the whole page) with no control.`,
      fix: 'Remove the timed refresh; let users act in their own time.',
    };
  },
};
