// "photo of"/"photograph of" is deliberately NOT flagged: for portraits it
// conveys the medium (a photo of a person vs. a logo or illustration),
// which is widely accepted alt style — flagging it is noise.
const REDUNDANT_PHRASE = /^(image|picture|graphic|icon)\b( of\b)?/i;

export default {
  id: 'redundant-alt-phrase',
  name: 'Redundant alt phrasing',
  impact: 'minor',
  tags: ['best-practice'],
  help: 'alt text should not start with "image of" or similar',
  helpUrl: 'https://www.w3.org/WAI/tutorials/images/tips/',
  selector: 'img[alt]',
  evaluate(element) {
    const alt = element.getAttribute('alt').trim();
    if (!alt || !REDUNDANT_PHRASE.test(alt)) return { status: 'pass' };
    return {
      status: 'fail',
      message: `alt="${alt}" — screen readers already announce this element as an image, so users hear "image, ${alt}".`,
      fix: `Describe the content directly, e.g. alt="${alt.replace(REDUNDANT_PHRASE, '').trim() || '…'}".`,
    };
  },
};
