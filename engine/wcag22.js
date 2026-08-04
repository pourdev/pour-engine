// The complete WCAG 2.2 success-criteria catalog — all 86 criteria (2.2
// removed 4.1.1 Parsing). This is the engine's source of truth for what
// exists in the spec, independent of what we can automate.
//
// `automation` is an honest assessment:
//   'auto'    — rules can meaningfully test this
//   'partial' — rules catch some failures; humans must still review
//   'manual'  — requires human judgment (most of the spec!)
// The coverage report (scripts/wcag-coverage.js → src/engine/COVERAGE.md) joins
// this catalog with the rule registry to show real coverage.

const sc = (num, name, level, automation, since = '2.0') => ({
  num,
  name,
  level,
  automation,
  since, // WCAG version that introduced this criterion
  principle: { 1: 'Perceivable', 2: 'Operable', 3: 'Understandable', 4: 'Robust' }[num[0]],
  url: `https://www.w3.org/WAI/WCAG22/Understanding/${name
    .toLowerCase()
    .replace(/[(),]/g, '')
    .replace(/\s+/g, '-')}.html`,
});

export default [
  // 1. Perceivable
  sc('1.1.1', 'Non-text Content', 'A', 'partial'),
  sc('1.2.1', 'Audio-only and Video-only (Prerecorded)', 'A', 'manual'),
  sc('1.2.2', 'Captions (Prerecorded)', 'A', 'partial'),
  sc('1.2.3', 'Audio Description or Media Alternative (Prerecorded)', 'A', 'manual'),
  sc('1.2.4', 'Captions (Live)', 'AA', 'manual'),
  sc('1.2.5', 'Audio Description (Prerecorded)', 'AA', 'manual'),
  sc('1.2.6', 'Sign Language (Prerecorded)', 'AAA', 'manual'),
  sc('1.2.7', 'Extended Audio Description (Prerecorded)', 'AAA', 'manual'),
  sc('1.2.8', 'Media Alternative (Prerecorded)', 'AAA', 'manual'),
  sc('1.2.9', 'Audio-only (Live)', 'AAA', 'manual'),
  sc('1.3.1', 'Info and Relationships', 'A', 'partial'),
  sc('1.3.2', 'Meaningful Sequence', 'A', 'manual'),
  sc('1.3.3', 'Sensory Characteristics', 'A', 'manual'),
  sc('1.3.4', 'Orientation', 'AA', 'partial', '2.1'), // orientation-lock (2026-08-01) proves CSS root hides/rotations; script locks stay a human check
  sc('1.3.5', 'Identify Input Purpose', 'AA', 'partial', '2.1'), // partial: wrong tokens are provable; MISSING autocomplete on identity fields needs judgment
  sc('1.3.6', 'Identify Purpose', 'AAA', 'manual', '2.1'),
  sc('1.4.1', 'Use of Color', 'A', 'partial'), // link-in-text-block automates the link case
  sc('1.4.2', 'Audio Control', 'A', 'partial'), // partial: declarative autoplay is provable; JS-initiated audio is not
  sc('1.4.3', 'Contrast (Minimum)', 'AA', 'partial'),
  sc('1.4.4', 'Resize Text', 'AA', 'partial'),
  sc('1.4.5', 'Images of Text', 'AA', 'manual'),
  sc('1.4.6', 'Contrast (Enhanced)', 'AAA', 'partial'),
  sc('1.4.7', 'Low or No Background Audio', 'AAA', 'manual'),
  sc('1.4.8', 'Visual Presentation', 'AAA', 'manual'),
  sc('1.4.9', 'Images of Text (No Exception)', 'AAA', 'manual'),
  sc('1.4.10', 'Reflow', 'AA', 'partial', '2.1'), // partial: reflow (current-viewport overflow heuristic); full test is at 320px
  sc('1.4.11', 'Non-text Contrast', 'AA', 'partial', '2.1'), // partial: non-text-contrast covers field boundaries; icons/focus indicators need eyes
  sc('1.4.12', 'Text Spacing', 'AA', 'partial', '2.1'), // partial: text-spacing probes the SC's own override test for clipping
  sc('1.4.13', 'Content on Hover or Focus', 'AA', 'manual', '2.1'),
  // 2. Operable
  sc('2.1.1', 'Keyboard', 'A', 'partial'),
  sc('2.1.2', 'No Keyboard Trap', 'A', 'manual'),
  sc('2.1.3', 'Keyboard (No Exception)', 'AAA', 'partial'), // 2.1.1's rules apply; no-exception scope needs humans
  sc('2.1.4', 'Character Key Shortcuts', 'A', 'manual', '2.1'),
  sc('2.2.1', 'Timing Adjustable', 'A', 'partial'), // meta-refresh automates the redirect/refresh case
  sc('2.2.2', 'Pause, Stop, Hide', 'A', 'partial'),
  sc('2.2.3', 'No Timing', 'AAA', 'manual'),
  sc('2.2.4', 'Interruptions', 'AAA', 'manual'),
  sc('2.2.5', 'Re-authenticating', 'AAA', 'manual'),
  sc('2.2.6', 'Timeouts', 'AAA', 'manual', '2.1'),
  sc('2.3.1', 'Three Flashes or Below Threshold', 'A', 'manual'),
  sc('2.3.2', 'Three Flashes', 'AAA', 'manual'),
  sc('2.3.3', 'Animation from Interactions', 'AAA', 'manual', '2.1'),
  sc('2.4.1', 'Bypass Blocks', 'A', 'partial'), // partial: "repeated across pages" can't be established from one page
  sc('2.4.2', 'Page Titled', 'A', 'partial'), // partial: document-title proves a title exists and catches known placeholders; whether a real one DESCRIBES the page needs a reader
  sc('2.4.3', 'Focus Order', 'A', 'manual'), // no rule automates this yet; order judgment needs humans
  sc('2.4.4', 'Link Purpose (In Context)', 'A', 'partial'),
  sc('2.4.5', 'Multiple Ways', 'AA', 'manual'),
  sc('2.4.6', 'Headings and Labels', 'AA', 'manual'),
  sc('2.4.7', 'Focus Visible', 'AA', 'partial'), // partial: focus-visible flags outline suppression; the indicator itself needs eyes
  sc('2.4.8', 'Location', 'AAA', 'manual'),
  sc('2.4.9', 'Link Purpose (Link Only)', 'AAA', 'manual'),
  sc('2.4.10', 'Section Headings', 'AAA', 'manual'),
  sc('2.4.11', 'Focus Not Obscured (Minimum)', 'AA', 'partial', '2.2'), // partial: focus-not-obscured catches fully-covered targets at rest
  sc('2.4.12', 'Focus Not Obscured (Enhanced)', 'AAA', 'manual', '2.2'),
  sc('2.4.13', 'Focus Appearance', 'AAA', 'manual', '2.2'),
  sc('2.5.1', 'Pointer Gestures', 'A', 'manual', '2.1'),
  sc('2.5.2', 'Pointer Cancellation', 'A', 'manual', '2.1'),
  sc('2.5.3', 'Label in Name', 'A', 'manual', '2.1'), // manual WHILE label-in-name is parked (re-parked 2026-08-01, see rules/index.js) — 'auto' with no active rule would make this SC vanish from results AND the manual checklist
  sc('2.5.4', 'Motion Actuation', 'A', 'manual', '2.1'),
  sc('2.5.5', 'Target Size (Enhanced)', 'AAA', 'partial', '2.1'),
  sc('2.5.6', 'Concurrent Input Mechanisms', 'AAA', 'manual', '2.1'),
  sc('2.5.7', 'Dragging Movements', 'AA', 'manual', '2.2'),
  sc('2.5.8', 'Target Size (Minimum)', 'AA', 'partial', '2.2'), // partial: size/spacing are computable; the equivalent-control and essential exceptions need judgment
  // 3. Understandable
  sc('3.1.1', 'Language of Page', 'A', 'partial'), // partial: html-lang proves the tag is present and well-formed; whether it names the language actually written needs a reader
  sc('3.1.2', 'Language of Parts', 'AA', 'partial'), // partial: invalid lang values are provable; UNMARKED foreign passages need language identification
  sc('3.1.3', 'Unusual Words', 'AAA', 'manual'),
  sc('3.1.4', 'Abbreviations', 'AAA', 'manual'),
  sc('3.1.5', 'Reading Level', 'AAA', 'manual'),
  sc('3.1.6', 'Pronunciation', 'AAA', 'manual'),
  sc('3.2.1', 'On Focus', 'A', 'manual'),
  sc('3.2.2', 'On Input', 'A', 'manual'),
  sc('3.2.3', 'Consistent Navigation', 'AA', 'manual'),
  sc('3.2.4', 'Consistent Identification', 'AA', 'manual'),
  sc('3.2.5', 'Change on Request', 'AAA', 'manual'),
  sc('3.2.6', 'Consistent Help', 'A', 'manual', '2.2'),
  sc('3.3.1', 'Error Identification', 'A', 'manual'),
  sc('3.3.2', 'Labels or Instructions', 'A', 'partial'),
  sc('3.3.3', 'Error Suggestion', 'AA', 'manual'),
  sc('3.3.4', 'Error Prevention (Legal, Financial, Data)', 'AA', 'manual'),
  sc('3.3.5', 'Help', 'AAA', 'manual'),
  sc('3.3.6', 'Error Prevention (All)', 'AAA', 'manual'),
  sc('3.3.7', 'Redundant Entry', 'A', 'manual', '2.2'),
  sc('3.3.8', 'Accessible Authentication (Minimum)', 'AA', 'partial', '2.2'), // partial: auth-field-obstruction catches paste blocking; alternatives need judgment
  sc('3.3.9', 'Accessible Authentication (Enhanced)', 'AAA', 'manual', '2.2'),
  // 4. Robust (4.1.1 Parsing was removed in WCAG 2.2)
  sc('4.1.2', 'Name, Role, Value', 'A', 'partial'),
  sc('4.1.3', 'Status Messages', 'AA', 'manual', '2.1'),
];
