// WCAG SC 3.1.2 Language of Parts (Level AA)
// Same shape as 3.1.1-html-lang.js, and must stay in step with it: subtags
// may be a single character, because BCP 47 extension and private-use
// singletons ("-u-", "-t-", "-x-") are exactly one.
const LANG_PATTERN = /^([a-zA-Z]{2,3}(-[a-zA-Z0-9]{1,8})*|[xXiI](-[a-zA-Z0-9]{1,8})+)$/;

/**
 * Does any text take its language from this element? A lang attribute
 * governs the text of its subtree up to the next element that carries a
 * non-empty lang of its own, and it can only send a screen reader to the
 * wrong pronunciation when there is such text: rendered text nodes, or the
 * alt / aria-label a rendered descendant is read by. ACT de46e4 applies
 * only where "there is some text inheriting its programmatic language
 * from the element which is neither empty nor only whitespace", so
 * <article lang="invalid"><div lang="en">…</div></article> (every word
 * re-tagged below it), <div lang="invalid"><img alt=""></div>, an empty
 * element and one holding a lone &nbsp; are outside the rule.
 *
 * Walks the flat tree (shadow content in place of a host's light children,
 * a slot's assigned nodes in place of the slot). display:none ends a
 * branch; visibility:hidden hides the text at that level but a descendant
 * can turn it back on, so the walk continues beneath it. NBSP is
 * whitespace here, as it is to \s.
 */
function governsText(element) {
  const stack = [element];
  while (stack.length) {
    const node = stack.pop();
    if (node !== element && node.getAttribute('lang')?.trim()) continue;
    const style = getComputedStyle(node);
    if (style.display === 'none') continue;
    const shown = style.visibility !== 'hidden';
    if (shown) {
      if (node.getAttribute('aria-label')?.trim()) return true;
      if (node.matches('img, area, input[type="image"]') && node.getAttribute('alt')?.trim()) return true;
    }
    let children;
    if (node.tagName === 'SLOT') {
      const assigned = node.assignedNodes?.() ?? [];
      children = assigned.length ? assigned : node.childNodes;
    }
    else {
      children = node.shadowRoot ? node.shadowRoot.childNodes : node.childNodes;
    }
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
    // An invalid tag that no text inherits misleads no one. Checked after
    // the syntax test so only the invalid tags pay for the subtree walk.
    if (!governsText(element)) return { status: 'pass' };
    return {
      status: 'fail',
      message: `lang="${lang}" is not a valid language tag, so screen readers may switch to the wrong pronunciation.`,
      fix: 'Use a BCP 47 tag such as lang="fr" or lang="de-AT".',
    };
  },
};
