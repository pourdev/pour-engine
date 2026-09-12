// WCAG SC 1.2.3 Audio Description or Media Alternative (Prerecorded)
// (Level A) and SC 1.2.5 Audio Description (Prerecorded) (Level AA)
//
// Prerecorded video in synchronized media needs audio description of the
// visual track (1.2.5), or at Level A alternatively a full text alternative
// for the media (1.2.3). Whether either exists is not decidable from the
// DOM: description can be a second audio track chosen in the player, a
// separately produced version, narration mixed into the soundtrack, or a
// transcript beside the player. And the Understanding of 1.2.5 says no
// description is needed when the soundtrack already carries every
// important thing the picture shows (a talking head). So this rule never
// asserts. It asks, once per video that can actually present sound to
// someone, and stays silent where the page shows the one thing the DOM can
// show: a <track kind="descriptions"> (technique H96).
//
// Same media gating as media-captions, for the same reasons: no resource
// means nothing is presented, and muted-with-no-controls is the decorative
// loop nobody can hear, which is not synchronized media for a viewer.
// Video-only files (no audio stream at all) are 1.2.1 territory and not
// visible from the DOM either; the message says so.
export default {
  id: 'video-audio-description',
  name: 'Video audio description',
  impact: 'serious',
  tags: ['wcag2a', 'wcag123', 'wcag125'],
  help: 'Video content needs audio description or a text alternative',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/audio-description-prerecorded.html',
  selector: 'video',
  visibleOnly: false,
  evaluate(element) {
    if (element.querySelector('track[kind="descriptions" i]')) return { status: 'pass' };
    if (!element.currentSrc && !element.getAttribute('src') && !element.querySelector('source')) {
      return { status: 'pass' };
    }
    if (element.muted && !element.controls) return { status: 'pass' };
    return {
      status: 'incomplete',
      message: 'This video has no audio-description track. If it shows something its soundtrack does not say (text on screen, actions, charts, who is speaking), blind and low-vision users miss it. 1.2.5 asks for audio description; at Level A, 1.2.3 is also met by a full text alternative describing the visuals, linked near the player. A talking-head video whose soundtrack already carries everything needs neither, and a video with no soundtrack at all is 1.2.1\'s question instead: check which this is, and where the description or alternative lives.',
      fix: 'Provide a described audio track or a described version of the video (a <track kind="descriptions"> file works for text-based description), or publish a full transcript that describes the visuals next to the player.',
    };
  },
};
