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
    // Captions may be burned in or provided by the player — a human must check.
    return {
      status: 'incomplete',
      message: 'No caption track found on this video. If captions aren’t burned in or provided by the player, deaf and hard-of-hearing users are excluded — please verify.',
      fix: 'Add <track kind="captions" src="…" srclang="…" label="…"> with a WebVTT file.',
    };
  },
};
