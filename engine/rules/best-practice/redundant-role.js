// "Overdoing it" family: explicit role attributes that duplicate the
// element's built-in (implicit) ARIA role are noise — they add maintenance
// risk without helping assistive technology.
//
// The implicit role comes from lib/roles.js, not a private table: the
// contextual cases (an unnamed aside inside sectioning content is generic,
// so role="complementary" on it is the ONLY thing making it a landmark) are
// modelled there and verified against Chromium. The set of elements judged
// stays as it was, so nothing new is asserted (2026-08-25 overnight audit).
import { implicitRole as modelledRole } from '../../lib/roles.js';

const JUDGED_TAGS = new Set([
  'ul', 'ol', 'li', 'button', 'nav', 'main', 'aside', 'form', 'table', 'article', 'img', 'hr',
  'progress', 'textarea', 'dialog', 'option', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  // Table structure (th is skipped: its implicit role is contextual —
  // columnheader or rowheader). header/footer/section are contextual too.
  'tr', 'thead', 'tbody', 'tfoot', 'td', 'fieldset', 'a', 'input',
]);

const JUDGED_INPUT_TYPES = new Set([
  'checkbox', 'radio', 'button', 'submit', 'reset', 'text', 'email', 'tel', 'url',
  'range', 'number', 'search',
]);

function implicitRole(element) {
  const tag = element.tagName.toLowerCase();
  if (!JUDGED_TAGS.has(tag)) return null;
  if (tag === 'input' && !JUDGED_INPUT_TYPES.has(element.type)) return null;
  const role = modelledRole(element);
  // generic / presentation are "no role to duplicate" here, never a match.
  return role && role !== 'generic' && role !== 'presentation' ? role : null;
}

// Native display value of each table-structure element. When CSS has
// replaced it (display:flex / grid / block responsive tables), browsers
// stop exposing a data table and the explicit role is what restores the
// semantics (MDN, table role: "when CSS's display property overrides the
// native semantics of a table ... you can use the ARIA table roles to
// re-add the semantics"). Same shape as the list-style exception
// (2026-08-25 overnight audit).
const TABLE_DISPLAY = {
  table: ['table', 'inline-table'],
  thead: ['table-header-group'], tbody: ['table-row-group'], tfoot: ['table-footer-group'],
  tr: ['table-row'], td: ['table-cell'],
};
const TABLE_ROLES = new Set(['table', 'rowgroup', 'row', 'cell']);

function tableSemanticsStripped(element, tag) {
  const table = tag === 'table' ? element : element.closest('table');
  if (table && !TABLE_DISPLAY.table.includes(getComputedStyle(table).display)) return true;
  const native = TABLE_DISPLAY[tag];
  return !!native && !native.includes(getComputedStyle(element).display);
}

/** An item with no marker: list-style-type none on the item itself, or a
 *  ::marker emptied by CSS. Safari/VoiceOver drops list semantics whenever
 *  the bullets go, however the CSS spells it (the write-up the exception
 *  is based on: "any CSS that would remove the bullet or number indicators
 *  of a list's items will also remove the semantics"). The ul's own
 *  list-style-type stays "disc" when the property sits on the li, which is
 *  the more common spelling (2026-08-25 overnight audit). */
function markerRemoved(item) {
  if (getComputedStyle(item).listStyleType === 'none') return true;
  const marker = getComputedStyle(item, '::marker').content;
  return marker === 'none' || marker === '""' || marker === "''";
}

function listMarkersRemoved(list) {
  if (getComputedStyle(list).listStyleType === 'none') return true;
  for (const child of list.children) {
    if (child.tagName === 'LI' && markerRemoved(child)) return true;
  }
  return false;
}

export default {
  id: 'redundant-role',
  name: 'Redundant roles',
  impact: 'minor',
  tags: ['best-practice'],
  help: 'role attributes should not repeat the element’s built-in role',
  helpUrl: 'https://www.w3.org/TR/using-aria/#firstrule',
  selector: '[role]',
  evaluate(element) {
    const explicit = element.getAttribute('role').trim().split(/\s+/)[0]?.toLowerCase();
    const implicit = implicitRole(element);
    if (!implicit || explicit !== implicit) return { status: 'pass' };
    const tag = element.tagName.toLowerCase();
    // The exceptions this rule's own advice describes are honoured, not
    // just documented:
    //  - role="list"/"listitem" on marker-less lists is the standard
    //    fix for Safari/VoiceOver dropping list semantics — keep it.
    //  - role="img" on an SVG-source <img> is the standard fix for
    //    VoiceOver skipping the alt text of SVG images — keep it.
    //  - table roles on a table whose CSS display is no longer table-* are
    //    what keeps it a data table: keep them.
    if (explicit === 'list' && listMarkersRemoved(element)) return { status: 'pass' };
    if (explicit === 'listitem') {
      if (markerRemoved(element)) return { status: 'pass' };
      const list = element.closest('ul, ol');
      if (list && getComputedStyle(list).listStyleType === 'none') return { status: 'pass' };
    }
    if (TABLE_ROLES.has(explicit) && tableSemanticsStripped(element, tag)) return { status: 'pass' };
    if (explicit === 'img' && /\.svg([?#]|$)/i.test(element.currentSrc || element.src || '')) return { status: 'pass' };
    const caveat = implicit === 'list'
      ? ' (Exception: keep it if you set list-style: none — Safari/VoiceOver drops list semantics without it.)'
      : '';
    return {
      status: 'fail',
      message: `role="${explicit}" is redundant: <${tag}> already has that role built in. Redundant ARIA adds noise and drift risk, not accessibility.${caveat}`,
      fix: `Remove role="${explicit}" from the <${tag}>.`,
    };
  },
};
