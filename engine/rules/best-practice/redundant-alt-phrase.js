// "photo of"/"photograph of" is deliberately NOT flagged: for portraits it
// conveys the medium (a photo of a person vs. a logo or illustration),
// which is widely accepted alt style — flagging it is noise.
//
// The tip this rule cites (WAI images tutorial) is about announcing the
// MEDIUM, so only the prefix shape counts: the word followed by "of", a
// colon, a hyphen, "showing"/"depicting", or the word alone as the whole
// alt. "Graphic design services" and "Picture frame, oak" are content, and
// stripping their first word destroys the meaning; "graphic" and "picture"
// are common nouns, so they count only with "of" (2026-08-25 overnight audit).
const REDUNDANT_PHRASE =
  /^(?:(?:image|icon)s?(?:\s*[:-]\s*|\s+(?:of|showing|depicting)\b\s*|\s*$)|(?:picture|graphic)s?\s+of\b\s*)/i;

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
