// DOM helpers shared by all rules.

/** Elements that never reach the accessibility tree, so they cannot break
 *  the structure of a list or a description list. STYLE belongs with them:
 *  CSS-in-JS libraries inject <style> right beside the markup, and it was
 *  being counted as a stray child that broke the list. */
export const NEVER_RENDERED = new Set(['SCRIPT', 'TEMPLATE', 'STYLE', 'LINK', 'META']);

/**
 * The audit context plus every OPEN shadow root beneath it, hosts before
 * their shadow trees. Collected once per audit so each rule can query every
 * root without re-walking the page. Closed shadow roots are unreachable by
 * design — like every DOM tool, we can only see what the page exposes.
 */
export function collectRoots(context) {
  // querySelectorAll excludes the context itself, including its own open
  // shadow root when a host element is the requested audit scope.
  const roots = context.shadowRoot ? [context, context.shadowRoot] : [context];
  for (let i = 0; i < roots.length; i++) {
    if (!roots[i].querySelectorAll) continue;
    for (const el of roots[i].querySelectorAll('*')) {
      if (el.shadowRoot) roots.push(el.shadowRoot);
    }
  }
  return roots;
}

/** Nearest ancestor in the FLAT tree: parent element, or the shadow host
 *  when the walk reaches the top of a shadow tree. */
export function flatTreeParent(node) {
  return node.assignedSlot ?? node.parentElement ?? node.getRootNode()?.host ?? null;
}

/**
 * Rendered on screen — ignores aria-hidden. For purely visual rules
 * (contrast, target size): sighted users see aria-hidden content too.
 */
export function isRendered(element) {
  if (typeof element.checkVisibility === 'function') {
    return element.checkVisibility({ visibilityProperty: true });
  }
  const style = getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden';
}

/** Rendered AND exposed to assistive technology (default rule filter).
 *  aria-hidden is checked up the flat tree, so aria-hidden on a shadow host
 *  hides its shadow content too. */
export function isVisible(element) {
  for (let node = element; node; node = flatTreeParent(node)) {
    if (node.getAttribute?.('aria-hidden') === 'true' || node.hasAttribute?.('inert')) return false;
  }
  if (isRendered(element)) return true;
  // Boxless semantic containers can still be exposed to AT. Keep the
  // visual helper box-based, but do not skip their names/relationships.
  const style = getComputedStyle(element);
  if (style.display !== 'contents' || style.visibility === 'hidden' || style.visibility === 'collapse') return false;
  for (let node = flatTreeParent(element); node; node = flatTreeParent(node)) {
    if (getComputedStyle(node).display === 'none') return false;
  }
  return true;
}

let pathRoots = new WeakMap();
const pathObservers = new Set();

/** Release observers after an audit, including an aborted audit. */
export function releaseDOMCaches() {
  for (const observer of pathObservers) observer.disconnect();
  pathObservers.clear();
  pathRoots = new WeakMap();
}

export const resetDOMCaches = releaseDOMCaches;

function pathIndex(root) {
  let index = pathRoots.get(root);
  if (!index) {
    const observer = typeof MutationObserver === 'function' ? new MutationObserver(() => {
      index.ids = null;
      index.parents = new WeakMap();
    }) : null;
    index = { ids: null, parents: new WeakMap(), observer };
    if (observer) {
      observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['id'] });
      pathObservers.add(observer);
    }
    pathRoots.set(root, index);
  }
  // Synchronous mutations may precede the observer callback. A selector
  // must describe the current tree even in the same JavaScript task.
  if (index.observer?.takeRecords().length) {
    index.ids = null;
    index.parents = new WeakMap();
  }
  if (!index.ids) {
    index.ids = new Map();
    for (const el of root.querySelectorAll('[id]')) {
      index.ids.set(el.id, (index.ids.get(el.id) ?? 0) + 1);
    }
  }
  return index;
}

function siblingPosition(element, index) {
  const parent = element.parentElement;
  let positions = index.parents.get(parent);
  if (!positions) {
    const counts = new Map();
    positions = new WeakMap();
    for (const child of parent.children) {
      const position = (counts.get(child.tagName) ?? 0) + 1;
      counts.set(child.tagName, position);
      positions.set(child, { position, repeated: false });
    }
    for (const child of parent.children) positions.get(child).repeated = counts.get(child.tagName) > 1;
    index.parents.set(parent, positions);
  }
  return positions.get(element);
}

/** Selector for an element within its own root (document or shadow root). */
function cssPathInRoot(element) {
  // An id anchors the selector only when it is UNIQUE in this root: real
  // pages duplicate ids (three carousel pagers all id="default"), and a
  // bare #id selector would round-trip every one of them to the first,
  // collapsing distinct findings onto a single element.
  const root = element.getRootNode();
  const index = pathIndex(root);
  const uniqueId = (el) => el.id && index.ids.get(el.id) === 1;
  if (uniqueId(element)) return `#${CSS.escape(element.id)}`;
  const parts = [];
  let current = element;
  while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.documentElement) {
    let part = current.tagName.toLowerCase();
    if (current.parentElement) {
      const { position, repeated } = siblingPosition(current, index);
      if (repeated) part += `:nth-of-type(${position})`;
    }
    parts.unshift(part);
    if (current.parentElement && uniqueId(current.parentElement)) {
      parts.unshift(`#${CSS.escape(current.parentElement.id)}`);
      break;
    }
    current = current.parentElement;
  }
  return parts.join(' > ') || element.tagName.toLowerCase();
}

/**
 * A short, stable-ish CSS selector for an element. Elements inside shadow
 * roots get a `host-path >>> inner-path` chain (one `>>>` per boundary);
 * resolve by querying each segment and descending into `.shadowRoot`.
 */
export function cssPath(element) {
  let path = cssPathInRoot(element);
  let root = element.getRootNode();
  while (root && root.host) {
    path = `${cssPathInRoot(root.host)} >>> ${path}`;
    root = root.host.getRootNode();
  }
  return path;
}

/** An element's attributes read through the prototype, not the instance:
 *  a form whose control is named "attributes" shadows the property with
 *  that control (byggmax.se, 2026-08-30), and the same goes for any named
 *  form control. Anything that is not a NamedNodeMap is looked up on the
 *  prototype the element was born with. */
const attributesGetter = typeof Element !== 'undefined' ? Object.getOwnPropertyDescriptor(Element.prototype, 'attributes')?.get : null;
export function attributesOf(element) {
  const own = element.attributes;
  if (own && typeof own.length === 'number' && typeof own.item === 'function') return own;
  return attributesGetter ? attributesGetter.call(element) : [];
}

/** Element's opening markup (attributes) plus a snippet of its own text —
 *  enough to recognise it in a table. Built WITHOUT element.outerHTML, which
 *  serializes the whole subtree and turns audits quadratic on huge pages
 *  (container divs would each stringify most of the document). */
export function htmlSnippet(element, maxLength = 300) {
  let html = `<${element.tagName.toLowerCase()}`;
  for (const { name, value } of attributesOf(element)) {
    if (html.length >= maxLength) break;
    html += ` ${name}="${value}"`;
  }
  html += '>';
  const text = ownText(element);
  if (text && html.length < maxLength) html += text.slice(0, maxLength - html.length);
  return html.length > maxLength ? `${html.slice(0, maxLength)}…` : html;
}

/** True when the document renders embedded inside another page (iframe or
 *  frame). WCAG defines a "Web page" as a NON-embedded resource, so the
 *  page-level criteria (2.4.2 Page Titled, 2.4.1 Bypass Blocks) judge only
 *  the document the user actually opened: an embedded frame owes an
 *  accessible name under 4.1.2, not its own <title> or skip link. The
 *  reference comparison is safe cross-origin; frameElement is not. */
export function isEmbeddedDocument(doc) {
  const win = doc?.defaultView;
  return !!(win && win.top && win !== win.top);
}

/** The element's own (not descendant-element) text, trimmed. */
/**
 * Is this element inside an `inert` subtree? The attribute makes a whole
 * subtree unreachable: nothing in it takes focus, nothing in it accepts a
 * click, and assistive technology skips it (HTML §6.6.7). A rule that
 * reasons about focus order, reachability or pointer targets must treat
 * such elements as absent. Walks up through shadow hosts, because inert on
 * a host inerts its shadow tree too. `inert` is a boolean attribute:
 * presence is what counts, whatever the value.
 */
export function isInert(element) {
  for (let node = element; node; node = flatTreeParent(node)) {
    if (node.nodeType === 1 && node.hasAttribute('inert')) return true;
  }
  return false;
}

export function ownText(element) {
  return [...element.childNodes]
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent)
    .join('')
    .trim();
}
