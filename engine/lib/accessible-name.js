// Simplified accessible-name computation, following the priority order of
// the ARIA accname spec: aria-labelledby → aria-label → native labelling
// (alt, <label>, text content, value) → title/placeholder fallbacks.
//
// Deliberately simpler than the full spec (no recursion into referenced
// hidden subtrees, no CSS content). Good enough for name-presence rules;
// grow it as rules need more.

export function accessibleName(element) {
  const labelledby = element.getAttribute('aria-labelledby');
  if (labelledby) {
    const text = labelledby
      .split(/\s+/)
      .map((id) => element.getRootNode().getElementById?.(id)?.textContent ?? '')
      .join(' ')
      .trim();
    if (text) return text;
  }

  const ariaLabel = element.getAttribute('aria-label')?.trim();
  if (ariaLabel) return ariaLabel;

  const tag = element.tagName.toLowerCase();

  if (tag === 'img' || tag === 'area') {
    const alt = element.getAttribute('alt')?.trim();
    if (alt) return alt;
  }

  if (tag === 'input' || tag === 'select' || tag === 'textarea') {
    if (element.labels?.length) {
      const text = [...element.labels].map((label) => label.textContent).join(' ').trim();
      if (text) return text;
    }
    if (element.type === 'submit' || element.type === 'reset' || element.type === 'button') {
      // The value PROPERTY, not the attribute: scripts set `el.value`
      // without reflecting it, and the property is what names the button.
      const value = (element.value ?? element.getAttribute('value') ?? '').trim();
      if (value) return value;
    }
    if (element.type === 'image') {
      const alt = element.getAttribute('alt')?.trim();
      if (alt) return alt;
    }
    // HTML-AAM: value-less submit/reset buttons get a UA-default name —
    // browsers announce "Submit"/"Reset button" without any author text.
    if (element.type === 'submit') return 'Submit';
    if (element.type === 'reset') return 'Reset';
  }

  // Buttons, links, headings etc. — name from contents, including image
  // alts, but EXCLUDING hidden content: text inside aria-hidden or
  // display:none/visibility:hidden subtrees does not name an element
  // (per the accname spec).
  const fromContents = visibleContentText(element).replace(/\s+/g, ' ').trim();
  if (fromContents) return fromContents;

  return (element.getAttribute('title') ?? element.getAttribute('placeholder') ?? '').trim();
}

function visibleContentText(element) {
  // A custom element with a shadow root renders its shadow content — name
  // from contents follows the FLAT tree (slots inside pull light DOM back).
  const nodes = element.shadowRoot ? element.shadowRoot.childNodes : element.childNodes;
  return generatedContent(element, '::before') + textFromNodes(nodes) + generatedContent(element, '::after');
}

/** CSS generated content contributes to name-from-contents per the accname
 *  spec — icon-font prefixes and content:"…" labels are real names. Only
 *  plain strings count: counters, url(), attr() are not resolvable here. */
function generatedContent(element, pseudo) {
  const content = getComputedStyle(element, pseudo).content;
  if (!content || content === 'none' || content === 'normal') return '';
  const match = content.match(/^"((?:[^"\\]|\\.)*)"$/);
  return match ? match[1].replace(/\\(.)/g, '$1') : '';
}

function textFromNodes(nodes) {
  let text = '';
  for (const node of nodes) {
    if (node.nodeType === 3 /* TEXT_NODE */) {
      text += node.textContent;
      continue;
    }
    if (node.nodeType !== 1 /* ELEMENT_NODE */) continue;
    const tag = node.tagName.toLowerCase();
    // Never-rendered content can't name anything. Checked by tag, not
    // computed style: noscript contents are parsed as raw TEXT when JS is
    // on, and sites can override the UA's display:none (seen in the wild
    // with lazy-load <noscript> fallbacks leaking "<img …>" into names).
    if (tag === 'script' || tag === 'style' || tag === 'noscript' || tag === 'template') continue;
    if (node.getAttribute('aria-hidden') === 'true' || node.hasAttribute('hidden')) continue;
    const style = getComputedStyle(node);
    if (style.display === 'none' || style.visibility === 'hidden') continue;
    // A slot renders its assigned light-DOM nodes (fallback children when
    // nothing is slotted) — a shadow <button><slot></slot></button> is named
    // by the text the page slots in.
    if (tag === 'slot') {
      const assigned = node.assignedNodes?.() ?? [];
      text += textFromNodes(assigned.length ? assigned : node.childNodes);
      continue;
    }
    if (tag === 'img' || tag === 'area') {
      text += ` ${node.getAttribute('alt') ?? ''} `;
      continue;
    }
    const ariaLabel = node.getAttribute('aria-label')?.trim();
    if (ariaLabel) {
      text += ` ${ariaLabel} `;
      continue;
    }
    // Flat-tree descent: shadow content renders in place of a host's
    // light children (archive.org-style nested web components).
    const fromSubtree = textFromNodes(node.shadowRoot ? node.shadowRoot.childNodes : node.childNodes);
    if (fromSubtree.trim()) {
      text += fromSubtree;
      continue;
    }
    // Accname's tooltip fallback applies per traversed element: a
    // text-less <div title="upvote"> inside a link names it "upvote"
    // (browsers and screen readers both honour this).
    const title = node.getAttribute('title')?.trim();
    if (title) text += ` ${title} `;
  }
  return text;
}
