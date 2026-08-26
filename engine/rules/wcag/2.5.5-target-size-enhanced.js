// WCAG SC 2.5.5 Target Size (Enhanced) (Level AAA)
// Same geometry as 2.5.8, at 44×44px — and WITHOUT the spacing exception,
// which 2.5.5 does not offer (its exceptions: equivalent, inline,
// user-agent, essential).
import { createTargetSizeRule } from './2.5.8-target-size.js';

export default createTargetSizeRule({
  id: 'target-size-enhanced',
  name: 'Enhanced target size',
  // 2.5.5 was introduced in WCAG 2.1, so the versioned AAA tag is the true
  // one (retagged 2026-08-25 overnight audit).
  tags: ['wcag21aaa', 'wcag255'],
  help: 'Interactive targets must be at least 44×44 pixels (AAA)',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html',
  min: 44,
  spacingException: false,
});
