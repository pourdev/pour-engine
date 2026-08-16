// Simplified accessible-name computation, following the priority order of
// the ARIA accname spec: aria-labelledby → aria-label → native labelling
// (alt, <label>, text content, value) → title/placeholder fallbacks.
//
// Deliberately simpler than the full spec. Good enough for name-presence
// rules; grow it as rules need more.

/** Input types whose `.value` is user-entered text rather than a state. */
const TEXT_INPUT = new Set(['text', 'search', 'url', 'tel', 'email', 'password', 'number', 'date',
  'datetime-local', 'month', 'time', 'week', '']);

export function accessibleName(element) {
  return computeName(element, false);
}

/** The name aria-labelledby contributes, resolved the way accname requires:
 *  each referenced element's NAME, not its raw text. A reference whose target
 *  is named by an img alt, an aria-label or a control value names the referrer
 *  too, and reading textContent instead reports those elements as nameless.
 *  Rules that only need "is it labelled?" call this directly. */
export function labelledByName(element) {
  const refs = element.getAttribute?.('aria-labelledby');
  if (!refs) return '';
  const root = element.getRootNode();
  return refs
    .split(/\s+/)
    .filter(Boolean)
    .map((id) => {
      const target = root.getElementById?.(id);
      return target ? computeName(target, true) : '';
    })
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function computeName(element, inLabelledBy) {
  // accname step 2B: a referenced element's own aria-labelledby is not
  // followed a second time. That is also what stops <p id="a"
  // aria-labelledby="a"> recursing forever.
  if (!inLabelledBy) {
    const fromLabelledBy = labelledByName(element);
    if (fromLabelledBy) return fromLabelledBy;
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
    // accname step 2E: an embedded control contributes its value, so
    // aria-labelledby pointing at a filled text box names the referrer with
    // what the user typed. Text-like fields only: a checkbox's `.value` is
    // the string "on", which is a state, not a name.
    if (inLabelledBy && (tag === 'textarea' || TEXT_INPUT.has(element.type))) {
      const value = (element.value ?? '').trim();
      if (value) return value;
    }
    // HTML-AAM: value-less submit/reset buttons get a UA-default name —
    // browsers announce "Submit"/"Reset button" without any author text.
    if (element.type === 'submit') return 'Submit';
    if (element.type === 'reset') return 'Reset';
  }

  // Buttons, links, headings etc. — name from contents, including image
  // alts, but EXCLUDING hidden content: text inside aria-hidden or
  // display:none/visibility:hidden subtrees does not name an element
  // (per the accname spec). The one exception is a subtree reached THROUGH
  // aria-labelledby, where accname ignores the hidden state.
  const fromContents = visibleContentText(element, inLabelledBy).replace(/\s+/g, ' ').trim();
  if (fromContents) return fromContents;

  return (element.getAttribute('title') ?? element.getAttribute('placeholder') ?? '').trim();
}

function visibleContentText(element, includeHidden) {
  // A custom element with a shadow root renders its shadow content — name
  // from contents follows the FLAT tree (slots inside pull light DOM back).
  const nodes = element.shadowRoot ? element.shadowRoot.childNodes : element.childNodes;
  return generatedContent(element, '::before')
    + textFromNodes(nodes, includeHidden)
    + generatedContent(element, '::after');
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

/** `includeHidden` is set while resolving an aria-labelledby target: accname
 *  ignores the hidden state of referenced content, which is what makes the
 *  visually-hidden label span (and the display:none one) work in browsers. */
function textFromNodes(nodes, includeHidden) {
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
    if (!includeHidden) {
      if (node.getAttribute('aria-hidden') === 'true' || node.hasAttribute('hidden')) continue;
      const style = getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
    }
    // A slot renders its assigned light-DOM nodes (fallback children when
    // nothing is slotted) — a shadow <button><slot></slot></button> is named
    // by the text the page slots in.
    if (tag === 'slot') {
      const assigned = node.assignedNodes?.() ?? [];
      text += textFromNodes(assigned.length ? assigned : node.childNodes, includeHidden);
      continue;
    }
    if (tag === 'img' || tag === 'area') {
      // HTML-AAM order for an image's own name: aria-label → alt → title.
      // A PRESENT-but-empty alt marks the image decorative and contributes
      // nothing — title must not resurrect it. Only when alt is ABSENT do
      // the fallbacks apply (a title-only <img> inside a link names the
      // link; Chromium exposes exactly this, measured on a live site where
      // the walk's old alt-or-nothing shortcut called a named link nameless).
      const imgAria = node.getAttribute('aria-label')?.trim();
      if (imgAria) { text += ` ${imgAria} `; continue; }
      const alt = node.getAttribute('alt');
      if (alt !== null) { text += ` ${alt} `; continue; }
      const imgTitle = node.getAttribute('title')?.trim();
      if (imgTitle) text += ` ${imgTitle} `;
      continue;
    }
    const ariaLabel = node.getAttribute('aria-label')?.trim();
    if (ariaLabel) {
      text += ` ${ariaLabel} `;
      continue;
    }
    // Flat-tree descent: shadow content renders in place of a host's
    // light children (archive.org-style nested web components).
    const fromSubtree = textFromNodes(node.shadowRoot ? node.shadowRoot.childNodes : node.childNodes, includeHidden);
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
