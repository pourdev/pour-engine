// The WCAG 3.0 guideline catalog — derived from the W3C Working DRAFT of
// 3 March 2026 (https://www.w3.org/TR/wcag-3.0/). WCAG 3.0 is a work in
// progress: the W3C says it "may be updated, replaced, or obsoleted" and it
// is not appropriate for conformance claims. Everything this module exports
// is therefore marked draft, and every UI that shows it must say so.
//
// The draft has no A/AA/AAA levels and no success criteria; it organizes
// outcome-style guidelines (with core/supplemental requirements below them)
// under twelve functional groups. Our automated rules are written against
// WCAG 2.x; `scToGuideline` maps each 2.x criterion we automate to the
// draft guideline that covers the same user need, judged by reading both
// specs side by side. Revisit the mapping with every new draft.

export const draftInfo = {
  id: 'wcag30-draft',
  name: 'WCAG 3.0',
  status: 'W3C Working Draft',
  dated: '2026-03-03',
  draft: true,
  url: 'https://www.w3.org/TR/wcag-3.0/',
  note: 'A draft under active development: findings are WCAG 2.x rule results mapped to draft guidelines. Not suitable for conformance claims.',
};

const g = (num, name, group, anchor) => ({
  num,
  name,
  group,
  url: `https://www.w3.org/TR/wcag-3.0/#${anchor}`,
});

// All 44 guidelines of the 2026-03-03 draft, in document order.
export const guidelines = [
  // 2.1 Images and media
  g('2.1.1', 'Image alternatives', 'Images and media', 'image-alternatives'),
  g('2.1.2', 'Media alternatives', 'Images and media', 'media-alternatives'),
  g('2.1.3', 'Non-text alternatives', 'Images and media', 'non-text-alternatives'),
  g('2.1.4', 'Captions', 'Images and media', 'captions'),
  g('2.1.5', 'Audio descriptions', 'Images and media', 'audio-descriptions'),
  g('2.1.6', 'Figure captions', 'Images and media', 'figure-captions'),
  g('2.1.7', 'Single sense', 'Images and media', 'single-sense'),
  // 2.2 Text and wording
  g('2.2.1', 'Text appearance', 'Text and wording', 'text-appearance'),
  g('2.2.2', 'Text-to-speech', 'Text and wording', 'text-to-speech'),
  g('2.2.3', 'Clear language', 'Text and wording', 'clear-language'),
  // 2.3 Interactive components
  g('2.3.1', 'Keyboard focus appearance', 'Interactive components', 'keyboard-focus-appearance'),
  g('2.3.2', 'Pointer focus appearance', 'Interactive components', 'pointer-focus-appearance'),
  g('2.3.3', 'Navigating content', 'Interactive components', 'navigating-content'),
  g('2.3.4', 'Expected behavior', 'Interactive components', 'expected-behavior'),
  g('2.3.5', 'Control information', 'Interactive components', 'control-information'),
  // 2.4 Input / operation
  g('2.4.1', 'Keyboard interface input', 'Input and operation', 'keyboard-interface-input'),
  g('2.4.2', 'Physical or cognitive effort when using keyboard', 'Input and operation', 'physical-or-cognitive-effort-when-using-keyboard'),
  g('2.4.3', 'Pointer input', 'Input and operation', 'pointer-input'),
  g('2.4.4', 'Speech and voice input', 'Input and operation', 'speech-and-voice-input'),
  g('2.4.5', 'Input operation', 'Input and operation', 'input-operation-0'),
  g('2.4.6', 'Authentication', 'Input and operation', 'authentication'),
  // 2.5 Error handling
  g('2.5.1', 'Correct errors', 'Error handling', 'correct-errors'),
  g('2.5.2', 'Prevent errors', 'Error handling', 'prevent-errors'),
  // 2.6 Animation and movement
  g('2.6.1', 'Avoid physical harm', 'Animation and movement', 'avoid-physical-harm'),
  // 2.7 Layout
  g('2.7.1', 'Recognizable layouts', 'Layout', 'recognizable-layouts'),
  g('2.7.2', 'User orientation', 'Layout', 'user-orientation'),
  g('2.7.3', 'Structure', 'Layout', 'structure'),
  g('2.7.4', 'No obstruction', 'Layout', 'no-obstruction'),
  // 2.8 Consistency across views
  g('2.8.1', 'Consistency', 'Consistency across views', 'consistency'),
  // 2.9 Process and task completion
  g('2.9.1', 'Avoid exclusionary cognitive tasks', 'Process and task completion', 'avoid-exclusionary-cognitive-tasks'),
  g('2.9.2', 'Adequate time', 'Process and task completion', 'adequate-time'),
  g('2.9.3', 'Avoid deception', 'Process and task completion', 'avoid-deception'),
  g('2.9.4', 'Retain information', 'Process and task completion', 'retain-information'),
  g('2.9.5', 'Complete tasks', 'Process and task completion', 'complete-tasks'),
  g('2.9.6', 'Unnecessary steps', 'Process and task completion', 'unnecessary-steps'),
  // 2.10 Policy and protection
  g('2.10.1', 'Risk', 'Policy and protection', 'risk'),
  g('2.10.2', 'Algorithms', 'Policy and protection', 'algorithms'),
  // 2.11 Help and feedback
  g('2.11.1', 'Help available', 'Help and feedback', 'help-available'),
  g('2.11.2', 'Feedback', 'Help and feedback', 'feedback'),
  // 2.12 User control
  g('2.12.1', 'Assistive technology control', 'User control', 'assistive-technology-control'),
  g('2.12.2', 'Control text', 'User control', 'control-text'),
  g('2.12.3', 'Adjustable viewport', 'User control', 'adjustable-viewport'),
  g('2.12.4', 'Media control', 'User control', 'media-control'),
  g('2.12.5', 'Content changes', 'User control', 'content-changes'),
];

// WCAG 2.x criterion (as tagged on rules: wcag111 = SC 1.1.1) → the draft
// guideline covering the same user need. Only criteria with automated rules
// appear; the judgment is ours, made by reading both documents.
export const scToGuideline = {
  111: '2.1.1',  // Non-text Content → Image alternatives
  122: '2.1.4',  // Captions (Prerecorded) → Captions
  131: '2.7.3',  // Info and Relationships → Structure
  135: '2.4.5',  // Identify Input Purpose → Input operation
  141: '2.2.1',  // Use of Color (links in text) → Text appearance
  142: '2.12.4', // Audio Control → Media control
  143: '2.2.1',  // Contrast (Minimum) → Text appearance
  144: '2.12.3', // Resize Text (viewport zoom) → Adjustable viewport
  146: '2.2.1',  // Contrast (Enhanced) → Text appearance
  211: '2.4.1',  // Keyboard → Keyboard interface input
  221: '2.9.2',  // Timing Adjustable → Adequate time
  222: '2.12.4', // Pause, Stop, Hide → Media control
  241: '2.3.3',  // Bypass Blocks → Navigating content
  242: '2.7.2',  // Page Titled → User orientation
  244: '2.3.5',  // Link Purpose (In Context) → Control information
  255: '2.4.3',  // Target Size (Enhanced) → Pointer input
  258: '2.4.3',  // Target Size (Minimum) → Pointer input
  311: '2.2.2',  // Language of Page → Text-to-speech
  312: '2.2.2',  // Language of Parts → Text-to-speech
  332: '2.3.5',  // Labels or Instructions → Control information
  412: '2.12.1', // Name, Role, Value → Assistive technology control
};

const guidelineByNum = new Map(guidelines.map((entry) => [entry.num, entry]));
const partlyAutomated = new Set(Object.values(scToGuideline));

/** The draft guideline (num/name/group/url) a rule's wcagNNN tag maps to. */
export function guidelineForTags(tags) {
  for (const tag of tags ?? []) {
    const sc = tag.match(/^wcag(\d{3,4})$/)?.[1];
    if (sc && scToGuideline[sc]) return guidelineByNum.get(scToGuideline[sc]);
  }
  return null;
}

/**
 * The whole draft as a review checklist. Every guideline is listed — the
 * draft is too young for any of it to be silently skipped — shaped like the
 * 2.2 manual-review entries so existing UIs render it unchanged: `level` has
 * no meaning in the draft (no conformance levels yet) and `principle`
 * carries the draft's functional group.
 */
export function manualReviewChecklist() {
  return guidelines.map(({ num, name, group, url }) => ({
    num,
    name,
    level: 'draft',
    principle: group,
    url,
    automation: partlyAutomated.has(num) ? 'partial' : 'manual',
    draft: true,
  }));
}

export default { draftInfo, guidelines, scToGuideline, guidelineForTags, manualReviewChecklist };
