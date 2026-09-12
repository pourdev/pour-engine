// WCAG SC 2.4.12 Focus Not Obscured (Enhanced) (Level AAA)
// 2.4.11's geometry with the containment requirement relaxed to any
// overlap: the enhanced criterion allows NO part of a focused component to
// be hidden by author-created content, and its Understanding names the
// sticky footer that clips the bottom of a focused link as the failure.
// Same review-not-fail discipline as the minimum rule: the snapshot proves
// where an element sits now, not where focus will find it.
import { createFocusObscuredRule } from './2.4.11-focus-not-obscured.js';

export default createFocusObscuredRule({
  id: 'focus-not-obscured-enhanced',
  name: 'Fully unobscured focus',
  tags: ['wcag22aaa', 'wcag2412'],
  help: 'No part of a focused element may be hidden behind overlays (AAA)',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-enhanced.html',
  partial: true,
});
