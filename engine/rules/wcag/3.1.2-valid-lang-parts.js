// WCAG SC 3.1.2 Language of Parts (Level AA)
// Same shape as 3.1.1-html-lang.js, and must stay in step with it: subtags
// may be a single character, because BCP 47 extension and private-use
// singletons ("-u-", "-t-", "-x-") are exactly one.
const LANG_PATTERN = /^([a-zA-Z]{2,3}(-[a-zA-Z0-9]{1,8})*|[xXiI](-[a-zA-Z0-9]{1,8})+)$/;

/** Attributes whose value is read out or shown as words on any element. */
const SPOKEN_ATTRIBUTES = ['aria-label', 'aria-description', 'aria-placeholder', 'aria-valuetext',
  'aria-roledescription', 'title', 'placeholder'];

/** Input types whose value attribute is words the page wrote. Submit and
 *  reset are here without one too: the browser writes their label. */
const WORDED_INPUT_TYPES = new Set(['', 'text', 'search', 'email', 'url', 'tel', 'button', 'submit', 'reset']);

const spoken = (node, name) => Boolean(node.getAttribute(name)?.trim());

/** Does this element carry words of its own, outside its text nodes? The
 *  accessible name and description count as much as visible text: a
 *  placeholder or a title is a phrase, and it is spoken in whatever
 *  language the nearest lang says. */
function ownWords(node) {
  if (SPOKEN_ATTRIBUTES.some((name) => spoken(node, name))) return true;
  if (node.matches('img, area, input[type="image"]') && spoken(node, 'alt')) return true;
  if (node.matches('option, optgroup, track') && spoken(node, 'label')) return true;
  if (node.tagName === 'INPUT') {
    const type = (node.getAttribute('type') ?? '').trim().toLowerCase();
    if (type === 'submit' || type === 'reset') return true;
    if (WORDED_INPUT_TYPES.has(type) && spoken(node, 'value')) return true;
  }
  // A nested document with no lang of its own takes this one, and what it
  // holds cannot always be read from here, so it counts as words.
  if (node.matches('iframe, frame, object, embed')) return true;
  for (const pseudo of ['::before', '::after']) {
    const content = getComputedStyle(node, pseudo).content;
    if (/"[^"]*\S[^"]*"/.test(content)) return true;
  }
  return false;
}

/**
 * Does any text take its language from this element? 3.1.2 asks that "the
 * human language of each passage or phrase in the content can be
 * programmatically determined", so a lang value can only fail it through a
 * passage it governs. A lang governs its subtree down to the next element
 * with a non-empty lang of its own. When every word beneath an invalid tag
 * is re-tagged (<article lang="invalid"><div lang="en">...</div></article>),
 * or there are no words at all (an empty element, a decorative image, text
 * that is display:none), each passage on the page still has a language and
 * the criterion is met. ACT de46e4 draws the same line in its
 * applicability: "some text inheriting its programmatic language from the
 * element which is neither empty nor only whitespace" (issue #6 on the
 * engine repository, reported with the fixtures by Jeff Witt).
 *
 * Words are rendered text nodes and everything ownWords() counts. The walk
 * is over the flat tree: shadow content in place of a host's light
 * children, assigned nodes in place of a slot. display:none ends a branch.
 * visibility:hidden silences that level only, since a descendant can turn
 * itself back on. aria-hidden and off-screen text still count: one is seen
 * and the other is spoken. Anything the walk cannot rule on counts as
 * words, so a doubtful case keeps its failure.
 */
function governsText(element) {
  const stack = [element];
  while (stack.length) {
    const node = stack.pop();
    if (node !== element && spoken(node, 'lang')) continue;
    if (node.matches('script, style, noscript, template')) continue;
    const style = getComputedStyle(node);
    if (style.display === 'none') continue;
    const shown = style.visibility !== 'hidden' && style.visibility !== 'collapse';
    if (shown && ownWords(node)) return true;
    let children = node.childNodes;
    if (node.tagName === 'SLOT') {
      const assigned = node.assignedNodes?.() ?? [];
      if (assigned.length) children = assigned;
    }
    else if (node.shadowRoot) children = node.shadowRoot.childNodes;
    for (const child of children) {
      if (child.nodeType === 3 /* TEXT_NODE */) {
        if (shown && /\S/.test(child.textContent)) return true;
      }
      else if (child.nodeType === 1 /* ELEMENT_NODE */) stack.push(child);
    }
  }
  return false;
}

export default {
  id: 'valid-lang-parts',
  name: 'Part language tags',
  impact: 'serious',
  tags: ['wcag2aa', 'wcag312'],
  help: 'lang attributes on page parts must be valid',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/language-of-parts.html',
  selector: '[lang]:not(html)',
  evaluate(element) {
    const lang = element.getAttribute('lang').trim();
    if (lang === '' || LANG_PATTERN.test(lang)) return { status: 'pass' }; // empty resets to page language
    // An invalid tag no passage inherits leaves every passage with a
    // language. Asked after the syntax test, so only invalid tags pay for
    // the walk.
    if (!governsText(element)) return { status: 'pass' };
    return {
      status: 'fail',
      message: `lang="${lang}" is not a valid language tag, so screen readers may switch to the wrong pronunciation.`,
      fix: 'Use a BCP 47 tag such as lang="fr" or lang="de-AT".',
    };
  },
};
