// WCAG SC 1.2.2 Captions (Prerecorded) (Level A)
export default {
  id: 'media-captions',
  impact: 'critical',
  tags: ['wcag2a', 'wcag122'],
  help: 'Video content must have captions',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/captions-prerecorded.html',
  selector: 'video',
  visibleOnly: false,
  evaluate(element) {
    // `kind` is an enumerated attribute: its values are ASCII
    // case-insensitive, and the MISSING value default is the subtitles
    // state — so a bare <track> is a subtitle track and counts. (An invalid
    // value defaults to metadata, which does not, so `kind=""` and
    // `kind="banana"` are deliberately left out.)
    if (element.querySelector('track[kind="captions" i], track[kind="subtitles" i], track:not([kind])')) {
      return { status: 'pass' };
    }
    // A video with no media resource at all presents nothing — there is no
    // audio content to caption (lazy players before their source is set).
    if (!element.currentSrc && !element.getAttribute('src') && !element.querySelector('source')) {
      return { status: 'pass' };
    }
    // The decorative no-audio-path signature — the same boundary
    // video-loop-motion draws for 2.2.2: muted, autoplaying, no controls.
    // With no controls there is no user path to unmute, so whatever audio
    // the file may carry is never presented to anyone; audio that cannot be
    // presented is not audio content under 1.2.2, and asking a human to
    // verify captions for it is noise (measured on the benchmark corpus:
    // our own site's aria-hidden hero loops, ffprobe-confirmed to carry no
    // audio stream, plus the same family on four news/university homes).
    // Properties, not attributes: script-muted heroes count too. A muted
    // video WITH controls keeps its review — one click unmutes it.
    if (element.muted && element.autoplay && !element.controls) {
      return { status: 'pass' };
    }
    // Captions may be burned in or provided by the player — a human must check.
    return {
      status: 'incomplete',
      message: 'No caption track found on this video. If captions aren’t burned in or provided by the player, deaf and hard-of-hearing users are excluded — please verify.',
      fix: 'Add <track kind="captions" src="…" srclang="…" label="…"> with a WebVTT file.',
    };
  },
};
