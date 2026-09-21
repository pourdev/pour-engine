// WCAG SC 3.1.2 Language of Parts (Level AA)
// Same shape as 3.1.1-html-lang.js, and must stay in step with it: subtags
// may be a single character, because BCP 47 extension and private-use
// singletons ("-u-", "-t-", "-x-") are exactly one.
import { paintableRect } from '../../lib/contrast.js';

const LANG_PATTERN = /^([a-zA-Z]{2,3}(-[a-zA-Z0-9]{1,8})*|[xXiI](-[a-zA-Z0-9]{1,8})+)$/;

/** Attributes whose value is spoken and never shown. */
const SPOKEN_ATTRIBUTES = ['aria-label', 'aria-description', 'aria-placeholder', 'aria-valuetext', 'aria-roledescription'];

/** Attributes whose value is shown, and spoken too. */
const SHOWN_ATTRIBUTES = ['title', 'placeholder'];

/** Input types whose value attribute is words the page wrote. Submit and
 *  reset are here without one too: the browser writes their label. */
const WORDED_INPUT_TYPES = new Set(['', 'text', 'search', 'email', 'url', 'tel', 'button', 'submit', 'reset']);

const spoken = (node, name) => Boolean(node.getAttribute(name)?.trim());

/**
 * Does this element carry words of its own, outside its text nodes? The
 * accessible name and description count as much as visible text: a
 * placeholder or a title is a phrase, and it is spoken in whatever
 * language the nearest lang says. Inside aria-hidden content (`unspoken`)
 * nothing is spoken, so only the words that are shown count there: an alt
 * or an aria-label under aria-hidden reaches no one.
 */
function ownWords(node, unspoken) {
  if (!unspoken) {
    if (SPOKEN_ATTRIBUTES.some((name) => spoken(node, name))) return true;
    if (node.matches('img, area, input[type="image"]') && spoken(node, 'alt')) return true;
    if (node.matches('optgroup, track') && spoken(node, 'label')) return true;
  }
  if (SHOWN_ATTRIBUTES.some((name) => spoken(node, name))) return true;
  if (node.tagName === 'OPTION' && spoken(node, 'label')) return true;
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
 * Can this box be seen? Asked only inside aria-hidden content, where being
 * seen is the one way left for words to reach anyone: a carousel slide that
 * is aria-hidden and clipped out of its strip is neither spoken nor seen,
 * and the tag on it misleads no one. Outside aria-hidden the question is
 * never put, since off-screen text is still spoken. The clip walk keeps the
 * whole box wherever it is unsure, so a doubtful case counts as seen and
 * keeps its failure; so does everything where there is no layout to ask
 * (the editor's static lane), which the root's empty box gives away.
 */
function seen(box, element) {
  const view = element.ownerDocument.defaultView;
  if (!element.ownerDocument.documentElement.getBoundingClientRect().width) return true;
  if (!box.width || !box.height) return false;
  if (box.right + view.scrollX <= 0 || box.bottom + view.scrollY <= 0) return false;
  return Boolean(paintableRect(element, box));
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
 * itself back on. aria-hidden text still counts where it is seen, and
 * off-screen text where it is spoken; text that is both aria-hidden and out
 * of sight reaches no one and does not. Anything the walk cannot rule on counts as
 * words, so a doubtful case keeps its failure.
 */
function governsText(element) {
  // The rule is handed every [lang] element, rendered or not, so nothing
  // beneath an ancestor that is display:none counts: the walk below only
  // looks down.
  for (let node = element.parentElement ?? element.getRootNode()?.host; node; node = node.parentElement ?? node.getRootNode()?.host) {
    if (getComputedStyle(node).display === 'none') return false;
  }
  const stack = [[element, Boolean(element.closest('[aria-hidden="true"]'))]];
  while (stack.length) {
    const [node, above] = stack.pop();
    const unspoken = above || node.getAttribute('aria-hidden') === 'true';
    if (node !== element && spoken(node, 'lang')) continue;
    if (node.matches('script, style, noscript, template')) continue;
    const style = getComputedStyle(node);
    if (style.display === 'none') continue;
    const shown = style.visibility !== 'hidden' && style.visibility !== 'collapse';
    if (shown && ownWords(node, unspoken) && (!unspoken || seen(node.getBoundingClientRect(), node))) return true;
    let children = node.childNodes;
    if (node.tagName === 'SLOT') {
      const assigned = node.assignedNodes?.() ?? [];
      if (assigned.length) children = assigned;
    }
    else if (node.shadowRoot) children = node.shadowRoot.childNodes;
    for (const child of children) {
      if (child.nodeType === 3 /* TEXT_NODE */) {
        if (!shown || !/\S/.test(child.textContent)) continue;
        if (!unspoken) return true;
        // A range's box is the text's own, where the parent's may be a
        // block far wider than its words. Where ranges have no geometry
        // (the static lane) the parent's box is asked, and says "seen".
        const range = node.ownerDocument.createRange();
        range.selectNodeContents(child);
        const box = typeof range.getBoundingClientRect === 'function' ? range.getBoundingClientRect() : node.getBoundingClientRect();
        if (seen(box, node)) return true;
      }
      else if (child.nodeType === 1 /* ELEMENT_NODE */) stack.push([child, unspoken]);
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
  // Not the default filter, which drops an element that is aria-hidden or
  // has no box of its own. Neither settles whether words inherit the tag:
  // aria-hidden text is still seen, and the language of seen text is used
  // by more than screen readers (hyphenation, font choice, translation,
  // spelling); visibility:hidden on the element leaves a descendant free to
  // show itself. governsText rules on all of it (ACT de46e4 Failed
  // Example 4 generalised to the element itself).
  visibleOnly: false,
  evaluate(element) {
    const lang = element.getAttribute('lang').trim();
    if (lang === '' || LANG_PATTERN.test(lang)) return { status: 'pass' }; // empty resets to page language
    // An invalid tag no passage inherits leaves every passage with a
    // language. Asked after the syntax test, so only invalid tags pay for
    // the walk.
    if (!governsText(element)) return { status: 'pass' };
    // Where no screen reader will read it, say who else the tag is for.
    const unspoken = element.closest('[aria-hidden="true"]');
    return {
      status: 'fail',
      message: unspoken
        ? `lang="${lang}" is not a valid language tag. aria-hidden keeps this text from screen readers, but it is still seen, and browsers and translation tools use the tag to hyphenate, pick fonts and translate it.`
        : `lang="${lang}" is not a valid language tag, so screen readers may switch to the wrong pronunciation.`,
      fix: 'Use a BCP 47 tag such as lang="fr" or lang="de-AT".',
    };
  },
};
