// WCAG SC 2.2.2 Pause, Stop, Hide (Level A)
// The muted background hero video. audio-control (1.4.2) rightly passes it:
// that criterion is about SOUND, and a muted element makes none. But
// autoplay + loop is moving content that starts automatically and never
// ends, which settles clauses 1 and 2 of 2.2.2 from the markup alone —
// exactly as an infinite CSS animation does. Clause 3's pause mechanism may
// be any control anywhere on the page (a hero often has one), so the
// finding goes to a human with the evidence attached, never asserted: the
// same verdict discipline as pause-stop-hide's ticker branch.
//
// A <video controls> ships its own pause button and is out of the selector.
// Icon-scale playback (tiny inline previews) is left alone for the same
// reason pause-stop-hide skips spinners: flagging every small moving
// thumbnail would bury the full-bleed hero that matters. Silence there is
// abstaining, not clearing.
export default {
  id: 'video-loop-motion',
  name: 'Looping video control',
  impact: 'serious',
  tags: ['wcag2a', 'wcag222'],
  help: 'Looping autoplay video must be pausable',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html',
  selector: 'video[autoplay][loop]:not([controls])',
  // Movement is a visual matter: an aria-hidden hero still moves on screen.
  visibility: 'visual',
  evaluate(element) {
    // Icon scale means SMALL, not thin: a 1200×60 animated banner strip is
    // a ticker, and only a video small on both axes is spinner-class.
    const rect = element.getBoundingClientRect();
    if (rect.width < 64 && rect.height < 64) return { status: 'pass' };
    // Loaded but not playing: either the browser refused the autoplay or
    // something on the page already paused it — in both cases nothing is
    // moving, and a paused-by-a-control video is the mechanism working.
    if (element.paused && element.readyState >= 2) return { status: 'pass' };
    return {
      status: 'incomplete',
      message: 'This video auto-plays on a loop with no built-in controls: it starts by itself and never ends, so it runs well past the five seconds at which WCAG 2.2.2 requires a way to pause, stop or hide it. Check the page offers a pause control that reaches this video, or that the video is the only content presented.',
      fix: 'Add controls, wire a visible pause button to it, or drop autoplay — and honour prefers-reduced-motion.',
    };
  },
};
