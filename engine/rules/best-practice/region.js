// header/footer are banner/contentinfo ONLY outside sectioning content
// (HTML-AAM; mirrored from lib/roles.js implicitRole): a footer buried in an
// <article> is generic, so treating it as a landmark hid its stray content.
// Divs do NOT demote — a header wrapped in plain divs is still a banner.
// role="alertdialog" joins dialog: both are modal containers whose content
// region navigation reaches through the dialog itself, and consent banners
// (measured on a live news home) are exactly this shape. The native
// <dialog> element has the same implicit role and the same policy; only a
// showing one (the open attribute is set by show() and showModal()) counts,
// so a closed dialog cannot make a landmark-less page look landmarked
// (2026-08-25 overnight audit).
const LANDMARK =
  'main, nav, aside, form[aria-label], form[aria-labelledby], ' +
  'header:not(:is(article, aside, main, nav, section) header), ' +
  'footer:not(:is(article, aside, main, nav, section) footer), ' +
  'section[aria-label], section[aria-labelledby], [role="main"], [role="navigation"], ' +
  '[role="banner"], [role="contentinfo"], [role="complementary"], [role="region"], ' +
  '[role="search"], [role="form"], [role="dialog"], [role="alertdialog"], dialog[open]';

export default {
  id: 'region',
  name: 'Content outside landmarks',
  impact: 'moderate',
  tags: ['best-practice'],
  help: 'All readable content belongs inside a landmark region',
  helpUrl: 'https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/',
  // Any element with its own text — wrapper elements without direct text are
  // skipped, so each offending text block is reported exactly once.
  selector: 'body *:not(script):not(style):not(template):not(noscript)',
  // evaluateAll so document-level facts are computed ONCE per audit: a
  // page with NO landmarks at all has one structural problem, not one per
  // text block — landmark-one-main reports it once; flagging every
  // paragraph (30k times on a single-page spec) is noise at ruinous
  // serialization cost. region's per-block value is for pages that HAVE
  // landmarks but leave content outside them.
  evaluateAll(elements, helpers) {
    const doc = elements[0]?.ownerDocument ?? document;
    if (!doc.querySelector(LANDMARK)) return elements.map(() => ({ status: 'pass' }));
    return elements.map((element) => this.judge(element, helpers));
  },
  judge(element, { ownText }) {
    // Any perceivable content counts, not just text — but only content in
    // the accessibility tree: decorative images (alt="", presentation) and
    // unnamed inline svg are invisible to AT, so they can't be "unreachable".
    // Bare form controls belong here too: an input has no text of its own,
    // yet it is exactly the content a region-navigating user needs to reach
    // (a booking form outside every landmark was invisible to this rule).
    const isMedia = element.matches(
      'img:not([alt=""]):not([role="presentation"]):not([role="none"]), svg[role="img"], video, audio, canvas, iframe, ' +
        'input:not([type="hidden"]), select, textarea, button',
    );
    if (!ownText(element) && !isMedia) return { status: 'pass' };
    if (element.closest(LANDMARK)) return { status: 'pass' };
    const doc = element.ownerDocument;
    // Skip links are the exception the spec itself creates: technique G1/G124
    // (SC 2.4.1) requires them to be the first focusable controls on the
    // page, which puts them before any landmark by construction. A same-page
    // fragment link with a real target, sitting before the first landmark,
    // is that pattern — not stray content. Anything after the first landmark
    // (a floating table of contents, say) still counts.
    const link = element.closest('a[href*="#"]');
    if (link) {
      // Anchors in the wild contain raw '%' that isn't valid
      // percent-encoding (spec section links, e.g. "#sec-%-operator") —
      // decodeURIComponent THROWS on those; fall back to the raw fragment.
      let id = link.getAttribute('href').split('#')[1] ?? '';
      try { id = decodeURIComponent(id); } catch { /* raw % in fragment: use as-is */ }
      const target = id && (doc.getElementById(id) || doc.getElementsByName(id)[0]);
      // "Skip to …" wording is the G1 pattern even when the target lives
      // in a shadow root or the href routes through the page URL — the
      // wording plus position-before-landmarks is evidence enough.
      const looksLikeSkip = /^skip\b/i.test(link.textContent.trim());
      const firstLandmark = doc.querySelector(LANDMARK);
      const beforeLandmarks =
        !firstLandmark ||
        link.compareDocumentPosition(firstLandmark) & Node.DOCUMENT_POSITION_FOLLOWING;
      if ((target || looksLikeSkip) && beforeLandmarks) return { status: 'pass' };
    }
    // One finding per branch: if an ancestor also has stray content it will
    // be flagged itself — reporting the child too is duplicate noise
    // (e.g. a link AND the span inside it).
    for (let parent = element.parentElement; parent && parent !== doc.body; parent = parent.parentElement) {
      if (ownText(parent)) return { status: 'pass' };
    }
    return {
      status: 'fail',
      message: 'This content sits outside any landmark, so screen-reader users navigating by regions never reach it.',
      fix: 'Move it into <main>, <nav>, <header>, <footer>, <aside>, or a labelled <section>.',
    };
  },
};
