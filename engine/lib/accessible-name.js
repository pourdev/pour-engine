// Simplified accessible-name computation, following the priority order of
// the ARIA accname spec: aria-labelledby → aria-label → native labelling
// (alt, <label>, text content, value) → title/placeholder fallbacks.
//
// This DOM implementation follows the recursive naming paths used by the
// rules. Browser accessibility trees remain the behavioral check for edge
// cases; text presence alone is not a full assessment of name quality.
import { flatTreeParent } from './dom.js';

/** Input types whose `.value` is user-entered text rather than a state. */
const TEXT_INPUT = new Set(['text', 'search', 'url', 'tel', 'email', 'password', 'number', 'date',
  'datetime-local', 'month', 'time', 'week', '']);

/** HTML "labelable elements": the ones whose `.labels` the browser fills
 *  (form-associated custom elements are labelable too but expose their
 *  labels through ElementInternals, so they are not reachable here). */
const LABELABLE = new Set(['input', 'select', 'textarea', 'button', 'meter', 'output', 'progress']);

/** A name made only of characters nothing can speak is no name. Private
 *  Use Area code points (U+E000 to U+F8FF and the two supplementary planes)
 *  carry no interoperable meaning by definition (Unicode, chapter 23:
 *  "their interpretation is not specified"); icon fonts put their glyphs
 *  there, so a button whose only content is an icon's ::before glyph
 *  (postgresql.org's search and theme buttons, Font Awesome U+F002 and
 *  U+F0EB, 2026-09-14) has a name string the browser exposes and a screen
 *  reader announces as nothing. WCAG's name is "text by which software can
 *  identify a component within Web content to the user"; a private-use
 *  glyph identifies nothing to anyone. Zero-width and joiner characters
 *  are stripped for the same reason. Every other character, symbols and
 *  emoji included, still names: "×" is spoken. */
function speakable(name) {
  return name.replace(/[\uE000-\uF8FF\u{F0000}-\u{FFFFD}\u{100000}-\u{10FFFD}\u200B-\u200D\u2060\uFEFF]/gu, '').trim() ? name : '';
}

export function accessibleName(element) {
  return speakable(computeName(element, false, false, new Set()));
}

/** The name aria-labelledby contributes, resolved the way accname requires:
 *  each referenced element's NAME, not its raw text. A reference whose target
 *  is named by an img alt, an aria-label or a control value names the referrer
 *  too, and reading textContent instead reports those elements as nameless.
 *  Rules that only need "is it labelled?" call this directly. */
export function labelledByName(element) {
  return speakable(referencedName(element, new Set()) ?? '');
}

/** Native label text, excluding the control being named from recursion. */
export function nativeLabelName(element, label) {
  return speakable(computeName(label, false, hiddenForName(label), new Set([element])));
}

// Accname 2A: only a reference whose root is itself hidden includes its
// hidden descendants. A visible reference does not resurrect hidden text.
function hiddenForName(element) {
  for (let node = element; node; node = flatTreeParent(node)) {
    if (node.getAttribute?.('aria-hidden') === 'true') return true;
    const style = getComputedStyle(node);
    if (style.display === 'none') return true;
  }
  const visibility = getComputedStyle(element).visibility;
  return visibility === 'hidden' || visibility === 'collapse';
}

function referencedName(element, visited) {
  const refs = element.getAttribute?.('aria-labelledby');
  if (!refs) return null;
  const root = element.getRootNode();
  const targets = refs.split(/\s+/).filter(Boolean).map((id) => root.getElementById?.(id)).filter(Boolean);
  if (!targets.length) return null;
  return targets.map((target) => {
    // Self-reference can contribute the element's aria-label or content,
    // but does not follow aria-labelledby again (accname 2B).
    const path = new Set(visited);
    if (target === element) path.delete(element);
    return computeName(target, true, hiddenForName(target), path);
  }).join(' ').replace(/\s+/g, ' ').trim();
}

function computeName(element, inLabelledBy, includeHidden, visited) {
  if (visited.has(element)) return '';
  visited.add(element);
  if (!inLabelledBy) {
    const fromLabelledBy = referencedName(element, visited);
    // Browsers retain aria-label/content fallbacks when all referenced
    // text is empty. Do not assert a missing name that is actually exposed.
    if (fromLabelledBy) return fromLabelledBy;
  }

  const ariaLabel = element.getAttribute('aria-label')?.trim();
  if (ariaLabel) return ariaLabel;

  const tag = element.tagName.toLowerCase();

  if (tag === 'img' || tag === 'area') {
    const alt = element.getAttribute('alt')?.trim();
    if (alt) return alt;
  }

  // HTML-AAM puts the associated <label> before the element's own subtree
  // for EVERY labelable element (button, meter, output, progress as well as
  // input, select, textarea), and the browser names <label for="b"><button
  // id="b"> from the label. Widened from the three field tags 2026-08-25
  // overnight audit: button-name was asserting a label-named button nameless.
  if (LABELABLE.has(tag) && element.labels?.length) {
    const text = [...element.labels].map((label) =>
      computeName(label, inLabelledBy, hiddenForName(label), visited)).join(' ').trim();
    if (text) return text;
  }

  if (tag === 'input' || tag === 'select' || tag === 'textarea') {
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
  const fromContents = visibleContentText(element, includeHidden, inLabelledBy, visited).replace(/\s+/g, ' ').trim();
  if (fromContents) return fromContents;

  return (element.getAttribute('title') ?? element.getAttribute('placeholder') ?? '').trim();
}

function visibleContentText(element, includeHidden, inLabelledBy, visited) {
  // A custom element with a shadow root renders its shadow content — name
  // from contents follows the FLAT tree (slots inside pull light DOM back).
  const nodes = element.shadowRoot ? element.shadowRoot.childNodes : element.childNodes;
  return generatedContent(element, '::before', includeHidden)
    + textFromNodes(nodes, includeHidden, inLabelledBy, visited)
    + generatedContent(element, '::after', includeHidden);
}

/** CSS generated content contributes to name-from-contents per the accname
 *  spec — icon-font prefixes and content:"…" labels are real names. Only
 *  plain strings count: counters, url(), attr() are not resolvable here.
 *
 *  The exception is the CSS alternative text syntax, content: <image or
 *  string> / "alt", which exists precisely to give assistive technology the
 *  text for generated content and which browsers expose: an icon-only button
 *  drawn with content: url(menu.svg) / "Menu" IS named "Menu" (Chromium's
 *  accessibility tree agrees), and calling it nameless asserted a critical
 *  4.1.2 failure against the recommended pattern. An EMPTY alternative marks
 *  the generated content decorative and contributes nothing, which is how
 *  the same syntax silences icon glyphs. */
function generatedContent(element, pseudo, includeHidden) {
  // SVG elements generate no ::before/::after box: the computed style still
  // reports the content, but nothing is painted and Chromium's accessible
  // name leaves it out (measured 2026-09-13: an icon font's ::before "h" on
  // the <svg> inside an icon-only button paints 0 pixels and Chromium names
  // the button ""; the same rule on a <span> paints and names it "h"). Naming
  // the button "h" from it hid a nameless close button on channel4.com.
  if (element.namespaceURI === 'http://www.w3.org/2000/svg') return '';
  const style = getComputedStyle(element, pseudo);
  // Generated nodes follow the same hidden-content exclusion as ordinary
  // descendants. A hover label can exist in computed content while its
  // pseudo-element is visibility:hidden and absent from the AX name.
  if (!includeHidden && (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse')) return '';
  const content = style.content;
  if (!content || content === 'none' || content === 'normal') return '';
  const alt = content.match(/\/\s*"((?:[^"\\]|\\.)*)"\s*$/);
  if (alt) return alt[1].replace(/\\(.)/g, '$1');
  const match = content.match(/^"((?:[^"\\]|\\.)*)"$/);
  return match ? match[1].replace(/\\(.)/g, '$1') : '';
}

/** `includeHidden` is set while resolving an aria-labelledby target: accname
 *  ignores the hidden state of referenced content, which is what makes the
 *  visually-hidden label span (and the display:none one) work in browsers. */
function textFromNodes(nodes, includeHidden, inLabelledBy, visited) {
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
      if (node.getAttribute('aria-hidden') === 'true') continue;
      const style = getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') continue;
    }
    // A slot renders its assigned light-DOM nodes (fallback children when
    // nothing is slotted) — a shadow <button><slot></slot></button> is named
    // by the text the page slots in.
    if (tag === 'slot') {
      const assigned = node.assignedNodes?.() ?? [];
      text += textFromNodes(assigned.length ? assigned : node.childNodes, includeHidden, inLabelledBy, visited);
      continue;
    }
    // Every descendant re-enters the naming algorithm, including its
    // references, native labels and generated content (accname 2F).
    // Empty alt remains decorative rather than falling through to title.
    if ((tag === 'img' || tag === 'area') && node.getAttribute('alt') === ''
      && !node.getAttribute('aria-label')?.trim() && !node.getAttribute('aria-labelledby')) continue;
    const childName = computeName(node, inLabelledBy, includeHidden, visited);
    text += tag === 'img' || tag === 'area' || node.hasAttribute('aria-label') || node.hasAttribute('aria-labelledby')
      ? ` ${childName} ` : childName;

  }
  return text;
}
