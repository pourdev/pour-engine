// WCAG SC 1.2.1 Audio-only and Video-only (Prerecorded) (Level A) — the
// audio-only slice
//
// Prerecorded audio-only content needs a text alternative that presents
// equivalent information: a transcript. Whether a transcript exists — a
// link beside the player, a paragraph below it, a page it points to — is
// not decidable from the DOM, so this rule never asserts. It asks, once
// per audio element that can actually present sound to someone.
//
// The video-only half of the criterion (silent video needing a transcript
// or audio track) is a DISCLOSED gap: whether a video file carries an
// audio stream is not visible from the DOM, so flagging every <video>
// would drown real findings in noise.
//
// The "cannot present sound" logic mirrors media-captions: muteness and
// controls decide whether audio can reach anyone (properties first —
// frameworks set them without reflecting attributes), and an element with
// no media resource presents nothing. The live exemption (1.2.1 covers
// prerecorded only) is undecidable from the DOM and stays with the human:
// the message names it rather than the rule guessing.
export default {
  id: 'audio-transcript',
  name: 'Audio transcript',
  impact: 'serious',
  tags: ['wcag2a', 'wcag121'],
  help: 'Prerecorded audio-only content needs a transcript',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/audio-only-and-video-only-prerecorded.html',
  selector: 'audio',
  visibleOnly: false,
  evaluate(element) {
    // No media resource: nothing is presented, nothing to transcribe
    // (lazy players before a script sets their src).
    if (!element.currentSrc && !element.getAttribute('src') && !element.querySelector('source')) {
      return { status: 'pass' };
    }
    // Muted with no controls: no user path to any sound, so whatever the
    // file carries is never presented to anyone.
    if ((element.muted || element.volume === 0) && !element.hasAttribute('controls')) {
      return { status: 'pass' };
    }
    return {
      status: 'incomplete',
      message: 'This audio content needs a transcript nearby — deaf and hard-of-hearing users get nothing from the recording itself. Check that an equivalent text version exists and is easy to find from the player (1.2.1 covers prerecorded audio; a live stream is 1.2.9 instead).',
      fix: 'Provide a transcript of the recording as text on the page or behind a clearly labelled link next to the player.',
    };
  },
};
