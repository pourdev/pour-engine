// WCAG SC 1.2.2 Captions (Prerecorded) (Level A)
export default {
  id: 'media-captions',
  name: 'Video captions',
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
    if (element.querySelector('track[kind="captions" i]')) {
      return { status: 'pass' };
    }
    // A subtitles track (explicit, or the kind-less default) is not proof
    // of captions: HTML defines subtitles as dialogue for hearers who do
    // not understand the language, captions as dialogue PLUS sound effects
    // and other audio information for people who cannot hear it. H95 says
    // a subtitles track "will not be sufficient" where other audio
    // information matters, while a mislabelled one may be. The DOM cannot
    // tell which, so this is a review, not a pass (David, 2026-08-26; it
    // had passed since the rule was written).
    if (element.querySelector('track[kind="subtitles" i], track:not([kind])')) {
      return {
        status: 'incomplete',
        message: 'This video has a subtitles track but no captions track. Subtitles carry dialogue for people who can hear the audio; captions also carry sound effects and other audio information deaf and hard-of-hearing users need. Check the track covers those, or mark it kind="captions" if it does.',
        fix: 'Use <track kind="captions" src="…" srclang="…" label="…"> for a track that includes non-speech audio information.',
      };
    }
    // A video with no media resource at all presents nothing — there is no
    // audio content to caption (lazy players before their source is set).
    if (!element.currentSrc && !element.getAttribute('src') && !element.querySelector('source')) {
      return { status: 'pass' };
    }
    // The decorative no-audio-path signature: muted with no controls. With
    // no controls there is no user path to unmute, so whatever audio the
    // file may carry is never presented to anyone; audio that cannot be
    // presented is not audio content under 1.2.2, and asking a human to
    // verify captions for it is noise (measured on the benchmark corpus:
    // our own site's aria-hidden hero loops, ffprobe-confirmed to carry no
    // audio stream, plus the same family on four news/university homes).
    // HOW playback starts is deliberately not part of the signature: an
    // earlier autoplay condition missed the two other members of the same
    // family, measured on our own site — a crossfade B-roll take that only
    // ever plays via script (no autoplay attribute, so the review fired
    // exactly when the script had wired its src), and heroes whose
    // autoplay attribute a reduced-motion handler removes. Muteness and
    // controls decide whether audio can reach anyone; autoplay never did.
    // Properties, not attributes: script-muted heroes count too. A muted
    // video WITH controls keeps its review — one click unmutes it.
    if (element.muted && !element.controls) {
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
