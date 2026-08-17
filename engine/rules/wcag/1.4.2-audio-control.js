// WCAG SC 1.4.2 Audio Control (Level A)
export default {
  id: 'audio-control',
  name: 'Auto-playing audio control',
  impact: 'critical',
  tags: ['wcag2a', 'wcag142'],
  help: 'Auto-playing audio must be stoppable or muted',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/audio-control.html',
  selector: 'audio[autoplay], video[autoplay]',
  visibleOnly: false,
  evaluate(element) {
    // Muted is checked as a PROPERTY first: frameworks (React) set it on
    // the DOM object without reflecting the attribute, and browsers only
    // allow autoplay when muted — attribute-only checking failed every
    // silent background video on the modern web.
    if (element.muted || element.volume === 0) return { status: 'pass' };
    if (element.hasAttribute('muted') || element.hasAttribute('controls')) return { status: 'pass' };
    // The criterion applies to audio playing for MORE than 3 seconds; a
    // short non-looping chime is exempt — but a LOOPING clip exceeds any
    // duration by definition, so it fails without needing metadata.
    if (element.loop) {
      return {
        status: 'fail',
        message: 'This media auto-plays on a loop with no controls and no muting — its audio talks over screen readers indefinitely.',
        fix: 'Add controls (or muted), or don’t autoplay.',
      };
    }
    if (Number.isFinite(element.duration) && element.duration <= 3) return { status: 'pass' };
    if (!Number.isFinite(element.duration)) {
      return {
        status: 'incomplete',
        message: 'This media auto-plays without controls or muting; its duration isn’t loaded yet, and only audio playing longer than 3 seconds fails 1.4.2 — check whether it has sound and how long it plays.',
      };
    }
    return {
      status: 'fail',
      message: 'This media auto-plays with no controls and no muting — its audio talks over screen readers.',
      fix: 'Add controls (or muted), or don’t autoplay.',
    };
  },
};
