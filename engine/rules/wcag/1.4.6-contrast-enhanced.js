// WCAG SC 1.4.6 Contrast (Enhanced) (Level AAA)
// Same machinery as 1.4.3, at the AAA thresholds: 7:1, or 4.5:1 for large text.
import { createContrastRule } from './1.4.3-color-contrast.js';

export default createContrastRule({
  id: 'color-contrast-enhanced',
  tags: ['wcag2aaa', 'wcag146'],
  help: 'Text must have enhanced contrast against its background (AAA)',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/contrast-enhanced.html',
  thresholds: { normal: 7, large: 4.5 },
});
