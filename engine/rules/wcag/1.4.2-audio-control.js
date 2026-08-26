// WCAG SC 1.4.2 Audio Control (Level A)
// "If any audio on a Web page plays automatically for more than 3 seconds,
// either a mechanism is available to pause or stop the audio, or a
// mechanism is available to control audio volume independently from the
// overall system volume level."
//
// The DOM proves autoplay, the absence of native controls and the length.
// It cannot prove the two things a failure also needs: that the media has
// an audio track at all (a video file may carry none, F93 step 1 asks for
// "an active audio track"), and that no pause, stop or volume control
// exists anywhere on the page (G170, a plain button near the top of the
// page, is a sufficient technique). So an autoplaying, unmuted, control-less
// element is a question for a human, never an assertion. (2026-08-25
// overnight audit: the old fail was asserted without either proof.)
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
    // short non-looping chime is exempt, but a LOOPING clip exceeds any
    // duration by definition, so it needs no metadata.
    if (!element.loop) {
      if (Number.isFinite(element.duration) && element.duration <= 3) return { status: 'pass' };
      if (!Number.isFinite(element.duration)) {
        return {
          status: 'incomplete',
          message: 'This media auto-plays without controls or muting; its duration isn’t loaded yet, and only audio playing longer than 3 seconds fails 1.4.2 — check whether it has sound and how long it plays.',
        };
      }
    }
    const span = element.loop ? 'on a loop' : 'for more than three seconds';
    const fix = 'Add controls (or muted), or do not autoplay. Otherwise put a pause, stop or volume control near the start of the page, before the media.';
    if (element.tagName === 'VIDEO') {
      // A video without a soundtrack cannot fail an audio criterion, and the
      // markup does not say whether one exists. Chromium counts decoded
      // audio bytes: a count still at zero after a second of playback is
      // evidence there is nothing to hear; a positive count proves sound.
      const decoded = element.webkitAudioDecodedByteCount;
      const started = !element.paused && !element.ended && element.currentTime >= 1;
      if (started && decoded === 0) return { status: 'pass' };
      if (decoded > 0) {
        return {
          status: 'incomplete',
          message: `This video auto-plays with sound ${span}, with no controls and no muting, so its audio talks over a screen reader unless the page offers a way to stop it. Check for a pause, stop or volume control near the top of the page; if there is none, 1.4.2 is not met.`,
          fix,
        };
      }
      return {
        status: 'incomplete',
        message: `This video auto-plays ${span} with no controls and no muting. If this video has a soundtrack, its audio talks over a screen reader unless the page offers a way to stop it. Check whether it has sound and, if so, that a pause, stop or volume control sits near the top of the page.`,
        fix,
      };
    }
    return {
      status: 'incomplete',
      message: `This audio auto-plays ${span} with no controls and no muting, so it talks over a screen reader unless the page offers a way to stop it. Check for a pause, stop or volume control near the top of the page; if there is none, 1.4.2 is not met.`,
      fix,
    };
  },
};
