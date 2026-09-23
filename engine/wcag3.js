// The WCAG 3.0 Working Draft of 10 September 2026, as a catalog the engine
// can report against. https://www.w3.org/TR/2026/WD-wcag-3.0-20260910/
//
// WCAG 3.0 is unfinished. The W3C marks every section of it Developing or
// Exploratory and says the requirements will be added, combined, removed
// and reworded. Everything here is therefore stamped draft, and every
// surface that shows it must say so. WCAG 2 stays the default everywhere.
//
// The draft replaces success criteria and A/AA/AAA with three kinds of
// provision under each guideline: core requirements (all must be met to
// conform), supplemental requirements (beyond conformance) and assertions
// (documented statements about an organization's practice, which no tool
// can check). Its Reporting section (4.1.4, Exploratory) lays out tiers
// that build on conformance: Bronze and Silver add a to-be-decided number
// of supplemental requirements and content assertions, Gold adds the
// assertions about the organization. Until the draft fixes those numbers,
// pour reads the tiers this way, and says so:
//   Bronze: the core requirements, plus the content assertions to make
//   Silver: Bronze plus every supplemental requirement
//   Gold:   Silver plus the assertions about the organization
//
// The draft tags each assertion Content or Organization in principle but
// not yet one by one; an assertion about a style guide, policy or process
// the organization keeps is read as Organization, any other as Content.
//
// No rule here was written for WCAG 3. The rules test WCAG 2 criteria;
// RULE_REQUIREMENTS names, rule by rule, the draft requirement that a
// failure of that rule also fails, judged by reading both documents. A
// rule with no such requirement (UNMAPPED_RULES, with the reason) does
// not run in a WCAG 3 audit. Where the draft leaves a value to be
// determined (text contrast, text spacing), the rule's WCAG 2 value
// stands in, and the report says the values are WCAG 2's.

export const draftInfo = {
  id: 'wcag3-draft',
  name: 'WCAG 3.0',
  status: 'Working Draft',
  dated: '2026-09-10',
  draft: true,
  url: 'https://www.w3.org/TR/2026/WD-wcag-3.0-20260910/',
  note: 'An unfinished standard. Findings come from WCAG 2 rules matched to draft requirements, with WCAG 2 values where the draft has none yet. Not for conformance claims.',
};

export const TIERS = ['bronze', 'silver', 'gold'];
export const TIER_LABELS = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold' };

// Which provision types each tier takes in. Cumulative, as in the draft.
const TIER_TYPES = {
  bronze: new Set(['core', 'content']),
  silver: new Set(['core', 'content', 'supplemental']),
  gold: new Set(['core', 'content', 'supplemental', 'organization']),
};

const TYPE_LABELS = {
  core: 'Core',
  supplemental: 'Supplemental',
  content: 'Assertion',
  organization: 'Assertion',
};

// Every requirement and assertion of the draft, in document order, under
// its guideline. The one recommended practice (2.7.2.7) is left out: the
// draft says recommended practices are not needed to conform or to reach
// any tier. Guidelines with nothing past Exploratory (2.1.2 Figure
// captions, 2.12.2 Control text) have no provisions to list.
const RAW = [
  g('2.1.1', 'Image alternatives'),
  p('2.1.1.1', 'Images detectable', 'core', 'x2-1-1-1-images-detectable'),
  p('2.1.1.2', 'Decorative images hidden', 'core', 'x2-1-1-2-decorative-images-hidden'),
  p('2.1.1.3', 'Image alternatives available', 'core', 'x2-1-1-3-image-alternatives-available'),
  p('2.1.1.4', 'Image alternatives equivalent', 'core', 'x2-1-1-4-image-alternatives-equivalent'),
  g('2.1.3', 'Non-text alternatives'),
  p('2.1.3.1', 'Non-text content not relied on', 'core', 'x2-1-3-1-non-text-content-not-relied-on'),
  g('2.1.4', 'Transcripts'),
  p('2.1.4.1', 'Transcripts findable', 'core', 'x2-1-4-1-transcripts-findable'),
  p('2.1.4.2', 'Dialogue transcripts available (prerecorded)', 'core', 'x2-1-4-2-dialogue-transcripts-available-prerecorded'),
  p('2.1.4.3', 'Dialogue transcripts available (live)', 'core', 'x2-1-4-3-dialogue-transcripts-available-live'),
  p('2.1.4.4', 'Transcripts equivalent (prerecorded)', 'core', 'x2-1-4-4-transcripts-equivalent-prerecorded'),
  p('2.1.4.5', 'Descriptive transcripts available', 'core', 'x2-1-4-5-descriptive-transcripts-available'),
  p('2.1.4.6', 'Speakers identified in transcripts', 'supplemental', 'x2-1-4-6-speakers-identified-in-transcripts'),
  p('2.1.4.7', 'Speaker language identified in transcripts', 'supplemental', 'x2-1-4-7-speaker-language-identified-in-transcripts'),
  p('2.1.4.8', 'Sounds identified in transcripts', 'core', 'x2-1-4-8-sounds-identified-in-transcripts'),
  p('2.1.4.9', 'Visual information identified in transcripts', 'core', 'x2-1-4-9-visual-information-identified-in-transcripts'),
  p('2.1.4.10', 'Transcripts style guide', 'organization', 'x2-1-4-10-transcripts-style-guide'),
  p('2.1.4.11', 'Transcripts usability testing', 'content', 'x2-1-4-11-transcripts-usability-testing'),
  p('2.1.4.12', 'Transcripts reviewed by content authors', 'content', 'x2-1-4-12-transcripts-reviewed-by-content-authors'),
  g('2.1.5', 'Captions'),
  p('2.1.5.1', 'Captions adjustable', 'supplemental', 'x2-1-5-1-captions-adjustable'),
  p('2.1.5.2', 'Captions available (prerecorded)', 'core', 'x2-1-5-2-captions-available-prerecorded'),
  p('2.1.5.3', 'Captions equivalent (prerecorded)', 'core', 'x2-1-5-3-captions-equivalent-prerecorded'),
  p('2.1.5.4', 'Captions available (live)', 'core', 'x2-1-5-4-captions-available-live'),
  p('2.1.5.5', 'Caption language adjustable', 'supplemental', 'x2-1-5-5-caption-language-adjustable'),
  p('2.1.5.6', 'Captions controllable', 'supplemental', 'x2-1-5-6-captions-controllable'),
  p('2.1.5.7', 'Captions unobstructed', 'supplemental', 'x2-1-5-7-captions-unobstructed'),
  p('2.1.5.8', 'Captions synchronized', 'core', 'x2-1-5-8-captions-synchronized'),
  p('2.1.5.9', 'Captions centered (immersive)', 'core', 'x2-1-5-9-captions-centered-immersive'),
  p('2.1.5.10', 'Direction indicated (immersive)', 'core', 'x2-1-5-10-direction-indicated-immersive'),
  p('2.1.5.11', 'Speakers identified in captions', 'supplemental', 'x2-1-5-11-speakers-identified-in-captions'),
  p('2.1.5.12', 'Speaker language identified in captions', 'supplemental', 'x2-1-5-12-speaker-language-identified-in-captions'),
  p('2.1.5.13', 'Sounds identified in captions', 'core', 'x2-1-5-13-sounds-identified-in-captions'),
  p('2.1.5.14', 'Captions style guide', 'organization', 'x2-1-5-14-captions-style-guide'),
  p('2.1.5.15', 'Captions usability testing', 'content', 'x2-1-5-15-captions-usability-testing'),
  p('2.1.5.16', 'Captions reviewed by content authors', 'content', 'x2-1-5-16-captions-reviewed-by-content-authors'),
  g('2.1.6', 'Audio descriptions'),
  p('2.1.6.1', 'Audio descriptions available (prerecorded)', 'core', 'x2-1-6-1-audio-descriptions-available-prerecorded'),
  p('2.1.6.2', 'Audio descriptions equivalent (prerecorded)', 'core', 'x2-1-6-2-audio-descriptions-equivalent-prerecorded'),
  p('2.1.6.3', 'Audio descriptions synchronized', 'core', 'x2-1-6-3-audio-descriptions-synchronized'),
  p('2.1.6.4', 'Audio descriptions available (live)', 'supplemental', 'x2-1-6-4-audio-descriptions-available-live'),
  p('2.1.6.5', 'Extended audio descriptions available', 'core', 'x2-1-6-5-extended-audio-descriptions-available'),
  p('2.1.6.6', 'Extended audio descriptions equivalent', 'core', 'x2-1-6-6-extended-audio-descriptions-equivalent'),
  p('2.1.6.7', 'Audio description language adjustable', 'supplemental', 'x2-1-6-7-audio-description-language-adjustable'),
  p('2.1.6.8', 'Audio descriptions controllable', 'supplemental', 'x2-1-6-8-audio-descriptions-controllable'),
  p('2.1.6.9', 'Speakers identified in audio descriptions', 'supplemental', 'x2-1-6-9-speakers-identified-in-audio-descriptions'),
  p('2.1.6.10', 'Speaker language identified in audio descriptions', 'supplemental', 'x2-1-6-10-speaker-language-identified-in-audio-descriptions'),
  p('2.1.6.11', 'Sounds identified in audio descriptions', 'core', 'x2-1-6-11-sounds-identified-in-audio-descriptions'),
  p('2.1.6.12', 'Visual information identified in audio descriptions', 'core', 'x2-1-6-12-visual-information-identified-in-audio-descriptions'),
  p('2.1.6.13', 'Audio descriptions style guide', 'organization', 'x2-1-6-13-audio-descriptions-style-guide'),
  p('2.1.6.14', 'Audio descriptions usability testing', 'content', 'x2-1-6-14-audio-descriptions-usability-testing'),
  p('2.1.6.15', 'Audio descriptions reviewed by content authors', 'content', 'x2-1-6-15-audio-descriptions-reviewed-by-content-authors'),
  g('2.1.7', 'Sign language'),
  p('2.1.7.1', 'Sign language available (prerecorded)', 'supplemental', 'x2-1-7-1-sign-language-available-prerecorded'),
  p('2.1.7.2', 'Sign language controllable', 'supplemental', 'x2-1-7-2-sign-language-controllable'),
  p('2.1.7.3', 'Sign language policy (live)', 'organization', 'x2-1-7-3-sign-language-policy-live'),
  g('2.1.8', 'Single sense'),
  p('2.1.8.1', 'Hue not relied on', 'core', 'x2-1-8-1-hue-not-relied-on'),
  p('2.1.8.2', 'Graphical object contrast sufficient', 'core', 'x2-1-8-2-graphical-object-contrast-sufficient'),
  p('2.1.8.3', 'Visual depth not relied on', 'core', 'x2-1-8-3-visual-depth-not-relied-on'),
  p('2.1.8.4', 'Sound not relied on', 'core', 'x2-1-8-4-sound-not-relied-on'),
  p('2.1.8.5', 'Spatial audio not relied on', 'core', 'x2-1-8-5-spatial-audio-not-relied-on'),
  g('2.1.9', 'Accessible media player'),
  p('2.1.9.1', 'Accessible video player selected', 'content', 'x2-1-9-1-accessible-video-player-selected'),
  p('2.1.9.2', 'Accessible audio player selected', 'content', 'x2-1-9-2-accessible-audio-player-selected'),
  g('2.2.1', 'Text appearance'),
  p('2.2.1.1', 'Blocks of text readable (minimum)', 'core', 'x2-2-1-1-blocks-of-text-readable-minimum'),
  p('2.2.1.2', 'Text style readable (minimum)', 'core', 'x2-2-1-2-text-style-readable-minimum'),
  p('2.2.1.3', 'Text contrast sufficient (minimum)', 'core', 'x2-2-1-3-text-contrast-sufficient-minimum'),
  p('2.2.1.4', 'Blocks of text adjustable', 'core', 'x2-2-1-4-blocks-of-text-adjustable'),
  p('2.2.1.5', 'Text style adjustable', 'core', 'x2-2-1-5-text-style-adjustable'),
  p('2.2.1.6', 'Text size adjustable', 'core', 'x2-2-1-6-text-size-adjustable'),
  p('2.2.1.7', 'Text color adjustable', 'core', 'x2-2-1-7-text-color-adjustable'),
  p('2.2.1.8', 'Blocks of text readable (enhanced)', 'supplemental', 'x2-2-1-8-blocks-of-text-readable-enhanced'),
  p('2.2.1.9', 'Text style readable (enhanced)', 'supplemental', 'x2-2-1-9-text-style-readable-enhanced'),
  p('2.2.1.10', 'Text contrast sufficient (enhanced)', 'supplemental', 'x2-2-1-10-text-contrast-sufficient-enhanced'),
  p('2.2.1.11', 'Text customizations retained', 'supplemental', 'x2-2-1-11-text-customizations-retained'),
  g('2.2.2', 'Text-to-speech'),
  p('2.2.2.1', 'Text detectable', 'core', 'x2-2-2-1-text-detectable'),
  p('2.2.2.2', 'Human language detectable', 'core', 'x2-2-2-2-human-language-detectable'),
  p('2.2.2.3', 'Numerical metadata available', 'core', 'x2-2-2-3-numerical-metadata-available'),
  g('2.2.3', 'Clear language'),
  p('2.2.3.1', 'Abbreviations explained', 'core', 'x2-2-3-1-abbreviations-explained'),
  p('2.2.3.2', 'Non-literal language explained', 'supplemental', 'x2-2-3-2-non-literal-language-explained'),
  p('2.2.3.3', 'Summaries available', 'core', 'x2-2-3-3-summaries-available'),
  p('2.2.3.4', 'Common words used', 'supplemental', 'x2-2-3-4-common-words-used'),
  p('2.2.3.5', 'Diacritics available', 'core', 'x2-2-3-5-diacritics-available'),
  p('2.2.3.6', 'No nested clauses', 'supplemental', 'x2-2-3-6-no-nested-clauses'),
  p('2.2.3.7', 'No unnecessary words', 'supplemental', 'x2-2-3-7-no-unnecessary-words'),
  p('2.2.3.8', 'Clear language review', 'organization', 'x2-2-3-8-clear-language-review'),
  p('2.2.3.9', 'Visual aids review', 'organization', 'x2-2-3-9-visual-aids-review'),
  g('2.3.1', 'Keyboard focus appearance'),
  p('2.3.1.1', 'Default focus indicator used', 'supplemental', 'x2-3-1-1-default-focus-indicator-used'),
  p('2.3.1.2', 'Focus indicator contrast sufficient', 'core', 'x2-3-1-2-focus-indicator-contrast-sufficient'),
  p('2.3.1.3', 'Focus indicator size sufficient', 'supplemental', 'x2-3-1-3-focus-indicator-size-sufficient'),
  p('2.3.1.4', 'Focus indicator style guide', 'organization', 'x2-3-1-4-focus-indicator-style-guide'),
  g('2.3.2', 'Pointer focus appearance'),
  p('2.3.2.1', 'Pointer activation indicated (minimum)', 'core', 'x2-3-2-1-pointer-activation-indicated-minimum'),
  p('2.3.2.2', 'Pointer activation indicated (enhanced)', 'supplemental', 'x2-3-2-2-pointer-activation-indicated-enhanced'),
  p('2.3.2.3', 'Pointer contrast sufficient', 'core', 'x2-3-2-3-pointer-contrast-sufficient'),
  p('2.3.2.4', 'Default pointer used', 'supplemental', 'x2-3-2-4-default-pointer-used'),
  p('2.3.2.5', 'Pointer focus indicated', 'core', 'x2-3-2-5-pointer-focus-indicated'),
  p('2.3.2.6', 'Pointer visible', 'core', 'x2-3-2-6-pointer-visible'),
  p('2.3.2.7', 'Enhanced pointer available', 'supplemental', 'x2-3-2-7-enhanced-pointer-available'),
  g('2.3.3', 'Navigating content'),
  p('2.3.3.1', 'Focus relevant', 'core', 'x2-3-3-1-focus-relevant'),
  p('2.3.3.2', 'Focus retained', 'supplemental', 'x2-3-3-2-focus-retained'),
  p('2.3.3.3', 'Focus order meaningful', 'core', 'x2-3-3-3-focus-order-meaningful'),
  g('2.3.4', 'Expected behavior'),
  p('2.3.4.1', 'Consistent interactions', 'content', 'x2-3-4-1-consistent-interactions'),
  p('2.3.4.2', 'Consistent control location', 'supplemental', 'x2-3-4-2-consistent-control-location'),
  p('2.3.4.3', 'Conventional pattern used', 'content', 'x2-3-4-3-conventional-pattern-used'),
  g('2.3.5', 'Control information'),
  p('2.3.5.1', 'Interactive element contrast sufficient', 'core', 'x2-3-5-1-interactive-element-contrast-sufficient'),
  p('2.3.5.2', 'Interactive element names available', 'core', 'x2-3-5-2-interactive-element-names-available'),
  p('2.3.5.3', 'Changes to elements notified', 'core', 'x2-3-5-3-changes-to-elements-notified'),
  p('2.3.5.4', 'Input constraints used', 'core', 'x2-3-5-4-input-constraints-used'),
  p('2.3.5.5', 'Label included in programmatic name', 'core', 'x2-3-5-5-label-included-in-programmatic-name'),
  p('2.3.5.6', 'Roles, values, states, properties available', 'core', 'x2-3-5-6-roles-values-states-properties-available'),
  g('2.4.1', 'Keyboard interface input'),
  p('2.4.1.1', 'Keyboard operable', 'core', 'x2-4-1-1-keyboard-operable'),
  p('2.4.1.2', 'Keyboard accessible', 'core', 'x2-4-1-2-keyboard-accessible'),
  p('2.4.1.3', 'Bidirectional navigation', 'core', 'x2-4-1-3-bidirectional-navigation'),
  p('2.4.1.4', 'Custom keys documented', 'supplemental', 'x2-4-1-4-custom-keys-documented'),
  p('2.4.1.5', 'No keyboard conflicts', 'core', 'x2-4-1-5-no-keyboard-conflicts'),
  p('2.4.1.6', 'Focus placed', 'supplemental', 'x2-4-1-6-focus-placed'),
  p('2.4.1.7', 'No keyboard traps', 'core', 'x2-4-1-7-no-keyboard-traps'),
  p('2.4.1.8', 'Focus user-controlled', 'core', 'x2-4-1-8-focus-user-controlled'),
  p('2.4.1.9', 'Focus movement relevant', 'supplemental', 'x2-4-1-9-focus-movement-relevant'),
  g('2.4.2', 'Physical or cognitive effort when using keyboard'),
  p('2.4.2.1', 'Navigation keys described', 'supplemental', 'x2-4-2-1-navigation-keys-described'),
  p('2.4.2.2', 'No repetitive adjacent interactive elements', 'supplemental', 'x2-4-2-2-no-repetitive-adjacent-interactive-elements'),
  p('2.4.2.3', 'Keyboard effort comparable', 'content', 'x2-4-2-3-keyboard-effort-comparable'),
  g('2.4.3', 'Pointer input'),
  p('2.4.3.1', 'Pointer activation controllable', 'core', 'x2-4-3-1-pointer-activation-controllable'),
  p('2.4.3.2', 'Simple pointer input available', 'core', 'x2-4-3-2-simple-pointer-input-available'),
  p('2.4.3.3', 'Consistent pointer cancellation', 'supplemental', 'x2-4-3-3-consistent-pointer-cancellation'),
  p('2.4.3.4', 'Pointer pressure not relied on', 'core', 'x2-4-3-4-pointer-pressure-not-relied-on'),
  p('2.4.3.5', 'Pointer speed not relied on', 'core', 'x2-4-3-5-pointer-speed-not-relied-on'),
  g('2.4.4', 'Speech and voice input'),
  p('2.4.4.1', 'Speech not relied on', 'core', 'x2-4-4-1-speech-not-relied-on'),
  p('2.4.4.2', 'Real-time text available', 'core', 'x2-4-4-2-real-time-text-available'),
  p('2.4.4.3', 'Generated speech testing', 'content', 'x2-4-4-3-generated-speech-testing'),
  g('2.4.5', 'Input operation'),
  p('2.4.5.1', 'Hover or focus content dismissible', 'core', 'x2-4-5-1-hover-or-focus-content-dismissible'),
  p('2.4.5.2', 'Hover content persistent', 'core', 'x2-4-5-2-hover-content-persistent'),
  p('2.4.5.3', 'Hover or focus content persistent', 'supplemental', 'x2-4-5-3-hover-or-focus-content-persistent'),
  p('2.4.5.4', 'Path-based gesture not relied on', 'core', 'x2-4-5-4-path-based-gesture-not-relied-on'),
  p('2.4.5.5', 'Input method flexible', 'supplemental', 'x2-4-5-5-input-method-flexible'),
  p('2.4.5.6', 'Body movements not relied on', 'core', 'x2-4-5-6-body-movements-not-relied-on'),
  p('2.4.5.7', 'Eye tracking not relied on', 'core', 'x2-4-5-7-eye-tracking-not-relied-on'),
  p('2.4.5.8', 'Pointer accessible', 'core', 'x2-4-5-8-pointer-accessible'),
  g('2.4.6', 'Authentication'),
  p('2.4.6.1', 'Biometrics not relied on', 'core', 'x2-4-6-1-biometrics-not-relied-on'),
  p('2.4.6.2', 'Voice identification not relied on', 'core', 'x2-4-6-2-voice-identification-not-relied-on'),
  g('2.5.1', 'Correct errors'),
  p('2.5.1.1', 'Error notifications available', 'core', 'x2-5-1-1-error-notifications-available'),
  p('2.5.1.2', 'Error suggestions provided', 'supplemental', 'x2-5-1-2-error-suggestions-provided'),
  p('2.5.1.3', 'Errors indicated in multiple ways', 'supplemental', 'x2-5-1-3-errors-indicated-in-multiple-ways'),
  p('2.5.1.4', 'Error messages persistent', 'supplemental', 'x2-5-1-4-error-messages-persistent'),
  p('2.5.1.5', 'Errors associated', 'core', 'x2-5-1-5-errors-associated'),
  p('2.5.1.6', 'Error messages collocated', 'supplemental', 'x2-5-1-6-error-messages-collocated'),
  g('2.5.2', 'Prevent errors'),
  p('2.5.2.1', 'Errors preventable', 'core', 'x2-5-2-1-errors-preventable'),
  p('2.5.2.2', 'Submission status notified', 'supplemental', 'x2-5-2-2-submission-status-notified'),
  p('2.5.2.3', 'Data entry validated', 'supplemental', 'x2-5-2-3-data-entry-validated'),
  p('2.5.2.4', 'Error prevention review', 'content', 'x2-5-2-4-error-prevention-review'),
  g('2.6.1', 'Avoid physical harm'),
  p('2.6.1.1', 'No flashing over threshold', 'core', 'x2-6-1-1-no-flashing-over-threshold'),
  p('2.6.1.2', 'No flashing over threshold (no exceptions)', 'supplemental', 'x2-6-1-2-no-flashing-over-threshold-no-exceptions'),
  p('2.6.1.3', 'No visual motion', 'core', 'x2-6-1-3-no-visual-motion'),
  p('2.6.1.4', 'No visual motion (no exceptions)', 'supplemental', 'x2-6-1-4-no-visual-motion-no-exceptions'),
  p('2.6.1.5', 'Trigger warning available', 'core', 'x2-6-1-5-trigger-warning-available'),
  p('2.6.1.6', 'Haptic stimulation adjustable', 'core', 'x2-6-1-6-haptic-stimulation-adjustable'),
  p('2.6.1.7', 'Audio shifting adjustable', 'core', 'x2-6-1-7-audio-shifting-adjustable'),
  p('2.6.1.8', 'Safe content review', 'content', 'x2-6-1-8-safe-content-review'),
  g('2.7.1', 'Recognizable layouts'),
  p('2.7.1.1', 'Conventional layout review', 'content', 'x2-7-1-1-conventional-layout-review'),
  g('2.7.2', 'User orientation'),
  p('2.7.2.1', 'Page/view title available', 'core', 'x2-7-2-1-page-view-title-available'),
  p('2.7.2.2', 'Location within product review', 'content', 'x2-7-2-2-location-within-product-review'),
  p('2.7.2.3', 'All steps listed', 'core', 'x2-7-2-3-all-steps-listed'),
  p('2.7.2.4', 'Current step indicated', 'core', 'x2-7-2-4-current-step-indicated'),
  p('2.7.2.5', 'Page/view change notified', 'core', 'x2-7-2-5-page-view-change-notified'),
  p('2.7.2.6', 'Return to start supported', 'supplemental', 'x2-7-2-6-return-to-start-supported'),
  g('2.7.3', 'Structure'),
  p('2.7.3.1', 'Relationships detectable', 'supplemental', 'x2-7-3-1-relationships-detectable'),
  p('2.7.3.2', 'Blocks of content available (minimum)', 'core', 'x2-7-3-2-blocks-of-content-available-minimum'),
  p('2.7.3.3', 'Sections labeled', 'core', 'x2-7-3-3-sections-labeled'),
  p('2.7.3.4', 'Heading structure available', 'supplemental', 'x2-7-3-4-heading-structure-available'),
  p('2.7.3.5', 'Order detectable', 'core', 'x2-7-3-5-order-detectable'),
  p('2.7.3.6', 'Blocks of content available (enhanced)', 'supplemental', 'x2-7-3-6-blocks-of-content-available-enhanced'),
  p('2.7.3.7', 'Clear structure review', 'organization', 'x2-7-3-7-clear-structure-review'),
  p('2.7.3.8', 'Key information usability testing', 'content', 'x2-7-3-8-key-information-usability-testing'),
  g('2.7.4', 'No obstruction'),
  p('2.7.4.1', 'Overlay content dismissible', 'core', 'x2-7-4-1-overlay-content-dismissible'),
  g('2.8.1', 'Consistency'),
  p('2.8.1.1', 'Consistent structural order', 'supplemental', 'x2-8-1-1-consistent-structural-order'),
  p('2.8.1.2', 'Consistent navigation order', 'supplemental', 'x2-8-1-2-consistent-navigation-order'),
  p('2.8.1.3', 'Consistent navigation labels', 'supplemental', 'x2-8-1-3-consistent-navigation-labels'),
  g('2.9.1', 'Avoid exclusionary cognitive tasks'),
  p('2.9.1.1', 'Automated entry allowed', 'core', 'x2-9-1-1-automated-entry-allowed'),
  p('2.9.1.2', 'Cognitive test alternatives available', 'core', 'x2-9-1-2-cognitive-test-alternatives-available'),
  g('2.9.2', 'Adequate time'),
  p('2.9.2.1', 'Timeout adjustable', 'supplemental', 'x2-9-2-1-timeout-adjustable'),
  p('2.9.2.2', 'No time limits', 'supplemental', 'x2-9-2-2-no-time-limits'),
  p('2.9.2.3', 'No unnecessary time limits', 'content', 'x2-9-2-3-no-unnecessary-time-limits'),
  p('2.9.2.4', 'Time limits conveyed', 'supplemental', 'x2-9-2-4-time-limits-conveyed'),
  g('2.9.3', 'Avoid deception'),
  p('2.9.3.1', 'Preselections visible', 'core', 'x2-9-3-1-preselections-visible'),
  p('2.9.3.2', 'Deceptive practices usability testing', 'content', 'x2-9-3-2-deceptive-practices-usability-testing'),
  p('2.9.3.3', 'Deceptive messaging expert review', 'content', 'x2-9-3-3-deceptive-messaging-expert-review'),
  g('2.9.4', 'Retain information'),
  p('2.9.4.1', 'Going back supported', 'supplemental', 'x2-9-4-1-going-back-supported'),
  p('2.9.4.2', 'No redundant entry', 'supplemental', 'x2-9-4-2-no-redundant-entry'),
  p('2.9.4.3', 'Progress saved', 'supplemental', 'x2-9-4-3-progress-saved'),
  g('2.9.5', 'Complete tasks'),
  p('2.9.5.1', 'Required action available', 'supplemental', 'x2-9-5-1-required-action-available'),
  p('2.9.5.2', 'Information requirements available at start', 'supplemental', 'x2-9-5-2-information-requirements-available-at-start'),
  p('2.9.5.3', 'Process instructions available', 'supplemental', 'x2-9-5-3-process-instructions-available'),
  g('2.9.6', 'Unnecessary steps'),
  p('2.9.6.1', 'Usability testing for unnecessary steps', 'content', 'x2-9-6-1-usability-testing-for-unnecessary-steps'),
  g('2.10.1', 'Risk'),
  p('2.10.1.1', 'Consequences of choices explained', 'core', 'x2-10-1-1-consequences-of-choices-explained'),
  p('2.10.1.2', 'Consequences explained before agreement', 'supplemental', 'x2-10-1-2-consequences-explained-before-agreement'),
  p('2.10.1.3', 'Diverse disabilities considered', 'content', 'x2-10-1-3-diverse-disabilities-considered'),
  p('2.10.1.4', 'Algorithm inclusivity review', 'organization', 'x2-10-1-4-algorithm-inclusivity-review'),
  g('2.10.2', 'Algorithms'),
  p('2.10.2.1', 'Inclusive data set', 'content', 'x2-10-2-1-inclusive-data-set'),
  p('2.10.2.2', 'No harm from algorithms', 'content', 'x2-10-2-2-no-harm-from-algorithms'),
  g('2.11.1', 'Help available'),
  p('2.11.1.1', 'Consistent help available', 'supplemental', 'x2-11-1-1-consistent-help-available'),
  p('2.11.1.2', 'Contextual help available', 'supplemental', 'x2-11-1-2-contextual-help-available'),
  p('2.11.1.3', 'Disabled controls explained', 'supplemental', 'x2-11-1-3-disabled-controls-explained'),
  p('2.11.1.4', 'Sensory characteristics not relied on', 'core', 'x2-11-1-4-sensory-characteristics-not-relied-on'),
  p('2.11.1.5', 'Supported decision-making review', 'content', 'x2-11-1-5-supported-decision-making-review'),
  p('2.11.1.6', 'Help usability testing', 'content', 'x2-11-1-6-help-usability-testing'),
  g('2.11.2', 'Feedback'),
  p('2.11.2.1', 'Feedback mechanism available', 'supplemental', 'x2-11-2-1-feedback-mechanism-available'),
  g('2.12.1', 'Assistive technology control'),
  p('2.12.1.1', 'Assistive technology supported', 'core', 'x2-12-1-1-assistive-technology-supported'),
  p('2.12.1.2', 'User settings supported', 'core', 'x2-12-1-2-user-settings-supported'),
  p('2.12.1.3', 'Virtual cursor supported', 'core', 'x2-12-1-3-virtual-cursor-supported'),
  p('2.12.1.4', 'Notifications adjustable', 'supplemental', 'x2-12-1-4-notifications-adjustable'),
  g('2.12.3', 'Adjustable viewport'),
  p('2.12.3.1', 'Orientation supported (minimum)', 'core', 'x2-12-3-1-orientation-supported-minimum'),
  p('2.12.3.2', 'Orientation supported (enhanced)', 'supplemental', 'x2-12-3-2-orientation-supported-enhanced'),
  p('2.12.3.3', 'Text reflow supported', 'supplemental', 'x2-12-3-3-text-reflow-supported'),
  p('2.12.3.4', 'Layout reflow supported', 'supplemental', 'x2-12-3-4-layout-reflow-supported'),
  g('2.12.4', 'Media control'),
  p('2.12.4.1', 'Page/view audio adjustable', 'core', 'x2-12-4-1-page-view-audio-adjustable'),
  p('2.12.4.2', 'Media alternatives searchable', 'supplemental', 'x2-12-4-2-media-alternatives-searchable'),
  p('2.12.4.3', 'Media alternatives controllable', 'supplemental', 'x2-12-4-3-media-alternatives-controllable'),
  p('2.12.4.4', 'Media chapters available', 'supplemental', 'x2-12-4-4-media-chapters-available'),
  g('2.12.5', 'Content changes'),
  p('2.12.5.1', 'Change of content notified', 'core', 'x2-12-5-1-change-of-content-notified'),
  p('2.12.5.2', 'Change of focus notified', 'core', 'x2-12-5-2-change-of-focus-notified'),
  p('2.12.5.3', 'Change of user agent notified', 'core', 'x2-12-5-3-change-of-user-agent-notified'),
];

function g(num, name) { return { guideline: true, num, name }; }
function p(num, name, type, anchor) { return { num, name, type, anchor }; }

export const provisions = (() => {
  const list = [];
  let guideline = null;
  for (const entry of RAW) {
    if (entry.guideline) { guideline = entry; continue; }
    list.push({
      num: entry.num,
      name: entry.name,
      type: entry.type,
      guideline: `${guideline.num} ${guideline.name}`,
      url: `${draftInfo.url}#${entry.anchor}`,
    });
  }
  return list;
})();

const provisionByNum = new Map(provisions.map((entry) => [entry.num, entry]));

// Rule id → the draft requirements its failure also fails.
export const RULE_REQUIREMENTS = {
  'area-alt': ['2.1.1.3', '2.3.5.2'],
  'canvas-alt': ['2.1.3.1'],
  'embed-alt': ['2.1.3.1'],
  'image-alt': ['2.1.1.3'],
  'input-image-alt': ['2.1.1.3', '2.3.5.2'],
  'object-alt': ['2.1.3.1'],
  'svg-img-alt': ['2.1.1.3'],
  'audio-transcript': ['2.1.4.2'],
  'media-captions': ['2.1.5.2'],
  'video-audio-description': ['2.1.6.1'],
  'aria-required-children': ['2.3.5.6'],
  'aria-required-parent': ['2.3.5.6'],
  'definition-list': ['2.7.3.1'],
  'dlitem-parent': ['2.7.3.1'],
  'form-label': ['2.3.5.2'],
  'list-structure': ['2.7.3.1'],
  'listitem-parent': ['2.7.3.1'],
  'p-as-heading': ['2.7.3.4'],
  'table-headers': ['2.7.3.1'],
  // A lock to the platform's own default orientation meets 2.12.3.1; only
  // the supplemental both-orientations requirement fails for every lock.
  'orientation-lock': ['2.12.3.2'],
  'region-purpose': ['2.7.3.3'],
  'link-in-text-block': ['2.1.8.1'],
  'audio-control': ['2.12.4.1'],
  'color-contrast': ['2.2.1.3'],
  'control-contrast': ['2.2.1.3'],
  'meta-viewport': ['2.2.1.6'],
  'color-contrast-enhanced': ['2.2.1.10'],
  'reflow': ['2.12.3.4'],
  'non-text-contrast': ['2.3.5.1'],
  'scrollable-region-focusable': ['2.4.1.2'],
  'meta-refresh': ['2.9.2.1'],
  'pause-stop-hide': ['2.6.1.3'],
  'video-loop-motion': ['2.6.1.3'],
  'meta-refresh-no-exceptions': ['2.9.2.2'],
  'reduced-motion': ['2.12.1.2'],
  'bypass-blocks': ['2.7.3.2'],
  'document-title': ['2.7.2.1'],
  'visual-order-divergence': ['2.3.3.3'],
  'link-name': ['2.3.5.2'],
  'link-text-generic': ['2.3.5.2'],
  'heading-label-placeholder': ['2.7.3.3', '2.3.5.2'],
  'focus-visible': ['2.3.1.2'],
  'section-heading': ['2.7.3.4'],
  // Path-based gestures (2.4.5.4) and multipoint ones (2.4.3.2 lists them
  // among complex pointer inputs).
  'pointer-gesture-alternative': ['2.4.5.4', '2.4.3.2'],
  'drag-alternative': ['2.4.3.2'],
  'html-lang': ['2.2.2.2'],
  'valid-lang-parts': ['2.2.2.2'],
  'error-message-linkage': ['2.5.1.5'],
  'financial-form-confirmation': ['2.5.2.1'],
  'redundant-entry': ['2.9.4.2'],
  'auth-field-obstruction': ['2.9.1.1'],
  'captcha-alternative': ['2.9.1.2'],
  'aria-allowed-attr': ['2.3.5.6'],
  'aria-attr-valid': ['2.3.5.6'],
  'aria-field-name': ['2.3.5.2'],
  'aria-hidden-focus': ['2.3.5.6'],
  'aria-state-unreachable': ['2.3.5.6'],
  'aria-valid-refs': ['2.3.5.6'],
  'button-name': ['2.3.5.2'],
  'composite-widget-name': ['2.3.5.2'],
  'frame-title': ['2.7.3.3'],
  'invoker-target': ['2.3.5.6'],
  'label-for-valid': ['2.3.5.2'],
  'nested-interactive': ['2.3.5.6'],
  'role-required-aria': ['2.3.5.6'],
  'summary-name': ['2.3.5.2'],
  'valid-role': ['2.3.5.6'],
};

// WCAG rules that stay out of a WCAG 3 audit, and why. Best-practice rules
// are not listed: they run in either standard when best practices are on.
export const UNMAPPED_RULES = {
  'reading-order-divergence': 'The draft has no requirement on reading sequence; focus order (2.3.3.3) is a different outcome.',
  'autocomplete-valid': 'An invalid token hinders autofill but does not prevent automated entry (2.9.1.1), and the draft has no identify-purpose requirement.',
  'text-justified': 'The draft asks that justification can be adjusted (2.2.1.4), not that text is unjustified by default.',
  'text-spacing': 'The rule applies letter and word spacing, which neither adjustable-text requirement (2.2.1.4, 2.2.1.5) lists, so a clipping it finds may not fail the draft.',
  'aria-label-misuse': 'It concerns labels on plain containers; the draft asks for names on interactive elements (2.3.5.2, 2.3.5.6) and on meaningful blocks only (2.7.3.3).',
  'link-text-generic-only': 'The draft does not say whether a name may take its purpose from context; the context-aware link-text-generic rule stands for 2.3.5.2.',
  'focus-not-obscured': 'The draft has no focus-obscured requirement.',
  'focus-not-obscured-enhanced': 'The draft has no focus-obscured requirement.',
  'target-size': 'The draft has no target size requirement.',
  'target-size-enhanced': 'The draft has no target size requirement.',
  'on-input-navigation': 'The draft\'s change notifications (2.7.2.5, 2.12.5) cover different triggers from a change of context on input.',
};

/** The WCAG 3 tier a tag list asks for: wcag3-bronze, -silver or -gold,
 *  the highest when several are present; null for a WCAG 2 audit. */
export function tierFromTags(tags) {
  let found = null;
  for (const tag of tags ?? []) {
    const tier = /^wcag3-(bronze|silver|gold)$/.exec(tag)?.[1];
    if (tier && (!found || TIERS.indexOf(tier) > TIERS.indexOf(found))) found = tier;
  }
  return found;
}

/** The draft requirements a rule speaks to, as { num, name, type, url }. */
export function requirementsForRule(ruleId) {
  return (RULE_REQUIREMENTS[ruleId] ?? []).map((num) => {
    const { name, type, url } = provisionByNum.get(num);
    return { num, name, type: TYPE_LABELS[type], url };
  });
}

/** Does the tier take in any requirement this rule tests? */
export function ruleInTier(ruleId, tier) {
  const types = TIER_TYPES[tier];
  return Boolean(types) && (RULE_REQUIREMENTS[ruleId] ?? [])
    .some((num) => types.has(provisionByNum.get(num).type));
}

/**
 * Rule selection shared by every runner. A tag list selects the rules that
 * carry any of its tags; a WCAG 3 tier tag also selects the rules its
 * requirements map to. An empty or absent list selects every rule.
 */
export function ruleMatchesTags(rule, tags) {
  if (!tags?.length) return true;
  if (rule.tags.some((tag) => tags.includes(tag))) return true;
  const tier = tierFromTags(tags);
  return Boolean(tier) && ruleInTier(rule.id, tier);
}

/**
 * The tier as a human checklist, shaped like the WCAG 2 manual-review
 * entries: `level` carries the provision type and `principle` the
 * guideline. Every provision in the tier is listed, since no rule was
 * written for any of them; the ones a rule speaks to are 'partial'.
 */
export function manualReviewChecklist(tier) {
  const types = TIER_TYPES[tier];
  if (!types) return [];
  const partly = new Set(Object.values(RULE_REQUIREMENTS).flat());
  return provisions
    .filter((entry) => types.has(entry.type))
    .map(({ num, name, type, guideline, url }) => ({
      num,
      name,
      level: TYPE_LABELS[type],
      principle: guideline,
      url,
      automation: partly.has(num) ? 'partial' : 'manual',
      draft: true,
    }));
}

/** The results header for a WCAG 3 audit. */
export function standardFor(tier) {
  return { ...draftInfo, tier, tierLabel: TIER_LABELS[tier] };
}

export default {
  draftInfo, TIERS, TIER_LABELS, provisions, RULE_REQUIREMENTS, UNMAPPED_RULES,
  tierFromTags, requirementsForRule, ruleInTier, ruleMatchesTags, manualReviewChecklist, standardFor,
};
