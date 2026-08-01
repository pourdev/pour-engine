// WCAG SC 2.2.2 Pause, Stop, Hide (Level A)
export default {
  id: 'pause-stop-hide',
  impact: 'serious',
  tags: ['wcag2a', 'wcag222'],
  help: 'Moving content must be pausable',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html',
  selector: 'marquee, blink',
  // The criterion is about VISIBLE movement — a display:none marquee moves
  // nothing. aria-hidden content still moves on screen, so the rendered
  // check (not the AT-exposure check) is the right filter.
  visibility: 'visual',
  evaluate(element) {
    // scrollamount="0" is the documented way to ship a <marquee> that
    // doesn't actually move.
    if (element.tagName === 'MARQUEE' && element.getAttribute('scrollamount') === '0') {
      return { status: 'pass' };
    }
    return {
      status: 'fail',
      message: `<${element.tagName.toLowerCase()}> scrolls or blinks with no way to pause it, which is unusable for people with attention or vestibular conditions.`,
      fix: 'Replace it with static content, or a CSS animation with a pause control that honours prefers-reduced-motion.',
    };
  },
};
