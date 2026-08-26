// ARIA 1.2 role model: implicit roles for HTML elements, and which aria-*
// attributes each role supports (flattened with inheritance). Attribute
// names are stored without the "aria-" prefix.

/** Every attribute name in the ARIA 1.2 vocabulary (without the prefix).
 *  aria-attr-valid judges membership; aria-allowed-attr judges role fit —
 *  each unknown attribute is reported once, by aria-attr-valid alone. */
export const KNOWN_ARIA = new Set([
  'activedescendant', 'atomic', 'autocomplete', 'braillelabel', 'brailleroledescription',
  'busy', 'checked', 'colcount', 'colindex', 'colindextext', 'colspan', 'controls',
  'current', 'describedby', 'description', 'details', 'disabled', 'dropeffect',
  'errormessage', 'expanded', 'flowto', 'grabbed', 'haspopup', 'hidden', 'invalid',
  'keyshortcuts', 'label', 'labelledby', 'level', 'live', 'modal', 'multiline',
  'multiselectable', 'orientation', 'owns', 'placeholder', 'posinset', 'pressed',
  'readonly', 'relevant', 'required', 'roledescription', 'rowcount', 'rowindex',
  'rowindextext', 'rowspan', 'selected', 'setsize', 'sort', 'valuemax', 'valuemin',
  'valuenow', 'valuetext',
]);

/** Global attributes, usable with any role (ARIA 1.2 §6.4). */
export const GLOBAL_ARIA = new Set([
  'atomic', 'busy', 'controls', 'current', 'describedby', 'description', 'details',
  'dropeffect', 'flowto', 'grabbed', 'hidden', 'keyshortcuts', 'label', 'labelledby',
  'live', 'owns', 'relevant', 'roledescription', 'braillelabel', 'brailleroledescription',
]);

/** Attributes each role supports IN ADDITION to the globals.
 *
 *  Includes the four attributes ARIA 1.2 removed from the GLOBAL set
 *  (aria-disabled, aria-errormessage, aria-haspopup, aria-invalid). The spec
 *  still lists them on every role that used to inherit them, marked deprecated
 *  on that role. Deprecated is not forbidden: the markup conforms and browsers
 *  map it, so rejecting it reports a fault on a correct page. Leaving them out
 *  cost 74 of the 81 roles here at least one false rejection. If deprecated
 *  usage is ever worth surfacing, it belongs in best-practice, not in a
 *  critical 4.1.2 failure. */
export const ROLE_ARIA = {
  // aria-colindextext / aria-rowindextext are ARIA 1.3 (Chromium maps them)
  // and belong to cell, gridcell, columnheader, rowheader and row. They were
  // in KNOWN_ARIA without a role that owned them, so the engine recognised
  // the attribute and then said no role supports it. 2026-08-25 overnight audit.
  link: ['disabled', 'errormessage', 'expanded', 'haspopup', 'invalid'],
  button: ['disabled', 'errormessage', 'expanded', 'haspopup', 'invalid', 'pressed'],
  checkbox: ['checked', 'disabled', 'errormessage', 'expanded', 'haspopup', 'invalid', 'readonly', 'required'],
  switch: ['checked', 'disabled', 'errormessage', 'expanded', 'haspopup', 'invalid', 'readonly', 'required'],
  radio: ['checked', 'disabled', 'errormessage', 'haspopup', 'invalid', 'posinset', 'setsize'],
  option: ['checked', 'disabled', 'errormessage', 'haspopup', 'invalid', 'posinset', 'selected', 'setsize'],
  tab: ['disabled', 'errormessage', 'expanded', 'haspopup', 'invalid', 'posinset', 'selected', 'setsize'],
  menuitem: ['disabled', 'errormessage', 'expanded', 'haspopup', 'invalid', 'posinset', 'setsize'],
  menuitemcheckbox: ['checked', 'disabled', 'errormessage', 'expanded', 'haspopup', 'invalid', 'posinset', 'setsize'],
  menuitemradio: ['checked', 'disabled', 'errormessage', 'expanded', 'haspopup', 'invalid', 'posinset', 'setsize'],
  textbox: ['activedescendant', 'autocomplete', 'disabled', 'errormessage', 'haspopup', 'invalid', 'multiline', 'placeholder', 'readonly', 'required'],
  searchbox: ['activedescendant', 'autocomplete', 'disabled', 'errormessage', 'haspopup', 'invalid', 'multiline', 'placeholder', 'readonly', 'required'],
  combobox: ['activedescendant', 'autocomplete', 'disabled', 'errormessage', 'expanded', 'haspopup', 'invalid', 'readonly', 'required'],
  listbox: ['activedescendant', 'disabled', 'errormessage', 'expanded', 'haspopup', 'invalid', 'multiselectable', 'orientation', 'readonly', 'required'],
  slider: ['disabled', 'errormessage', 'haspopup', 'invalid', 'orientation', 'readonly', 'valuemax', 'valuemin', 'valuenow', 'valuetext'],
  spinbutton: ['activedescendant', 'disabled', 'errormessage', 'haspopup', 'invalid', 'readonly', 'required', 'valuemax', 'valuemin', 'valuenow', 'valuetext'],
  progressbar: ['disabled', 'errormessage', 'haspopup', 'invalid', 'valuemax', 'valuemin', 'valuenow', 'valuetext'],
  meter: ['disabled', 'errormessage', 'haspopup', 'invalid', 'valuemax', 'valuemin', 'valuenow', 'valuetext'],
  scrollbar: ['disabled', 'errormessage', 'haspopup', 'invalid', 'orientation', 'valuemax', 'valuemin', 'valuenow', 'valuetext'],
  heading: ['disabled', 'errormessage', 'haspopup', 'invalid', 'level'],
  list: ['disabled', 'errormessage', 'haspopup', 'invalid'],
  listitem: ['disabled', 'errormessage', 'haspopup', 'invalid', 'level', 'posinset', 'setsize'],
  row: ['activedescendant', 'colindex', 'colindextext', 'disabled', 'errormessage', 'expanded', 'haspopup', 'invalid', 'level', 'posinset', 'rowindex', 'rowindextext', 'selected', 'setsize'],
  rowgroup: ['disabled', 'errormessage', 'haspopup', 'invalid'],
  cell: ['colindex', 'colindextext', 'colspan', 'disabled', 'errormessage', 'haspopup', 'invalid', 'rowindex', 'rowindextext', 'rowspan'],
  gridcell: ['colindex', 'colindextext', 'colspan', 'disabled', 'errormessage', 'expanded', 'haspopup', 'invalid', 'readonly', 'required', 'rowindex', 'rowindextext', 'rowspan', 'selected'],
  columnheader: ['colindex', 'colindextext', 'colspan', 'disabled', 'errormessage', 'expanded', 'haspopup', 'invalid', 'readonly', 'required', 'rowindex', 'rowindextext', 'rowspan', 'selected', 'sort'],
  rowheader: ['colindex', 'colindextext', 'colspan', 'disabled', 'errormessage', 'expanded', 'haspopup', 'invalid', 'readonly', 'required', 'rowindex', 'rowindextext', 'rowspan', 'selected', 'sort'],
  table: ['colcount', 'disabled', 'errormessage', 'haspopup', 'invalid', 'rowcount'],
  grid: ['activedescendant', 'colcount', 'disabled', 'errormessage', 'haspopup', 'invalid', 'multiselectable', 'readonly', 'rowcount'],
  treegrid: ['activedescendant', 'colcount', 'disabled', 'errormessage', 'haspopup', 'invalid', 'multiselectable', 'orientation', 'readonly', 'required', 'rowcount'],
  tablist: ['activedescendant', 'disabled', 'errormessage', 'haspopup', 'invalid', 'multiselectable', 'orientation'],
  menu: ['activedescendant', 'disabled', 'errormessage', 'haspopup', 'invalid', 'orientation'],
  menubar: ['activedescendant', 'disabled', 'errormessage', 'haspopup', 'invalid', 'orientation'],
  tree: ['activedescendant', 'disabled', 'errormessage', 'haspopup', 'invalid', 'multiselectable', 'orientation', 'required'],
  treeitem: ['checked', 'disabled', 'errormessage', 'expanded', 'haspopup', 'invalid', 'level', 'posinset', 'selected', 'setsize'],
  radiogroup: ['activedescendant', 'disabled', 'errormessage', 'haspopup', 'invalid', 'orientation', 'readonly', 'required'],
  group: ['activedescendant', 'disabled', 'errormessage', 'haspopup', 'invalid'],
  separator: ['disabled', 'errormessage', 'haspopup', 'invalid', 'orientation', 'valuemax', 'valuemin', 'valuenow', 'valuetext'],
  toolbar: ['activedescendant', 'disabled', 'errormessage', 'haspopup', 'invalid', 'orientation'],
  dialog: ['disabled', 'errormessage', 'haspopup', 'invalid', 'modal'],
  alertdialog: ['disabled', 'errormessage', 'haspopup', 'invalid', 'modal'],
  application: ['activedescendant', 'disabled', 'errormessage', 'expanded', 'haspopup', 'invalid'],
  article: ['disabled', 'errormessage', 'haspopup', 'invalid', 'posinset', 'setsize'],
  img: ['disabled', 'errormessage', 'haspopup', 'invalid'],
  figure: ['disabled', 'errormessage', 'haspopup', 'invalid'],
  document: ['disabled', 'errormessage', 'haspopup', 'invalid'],
  feed: ['disabled', 'errormessage', 'haspopup', 'invalid'],
  math: ['disabled', 'errormessage', 'haspopup', 'invalid'],
  note: ['disabled', 'errormessage', 'haspopup', 'invalid'],
  presentation: ['disabled', 'errormessage', 'haspopup', 'invalid'],
  none: ['disabled', 'errormessage', 'haspopup', 'invalid'],
  banner: ['disabled', 'errormessage', 'haspopup', 'invalid'],
  complementary: ['disabled', 'errormessage', 'haspopup', 'invalid'],
  contentinfo: ['disabled', 'errormessage', 'haspopup', 'invalid'],
  form: ['disabled', 'errormessage', 'haspopup', 'invalid'],
  main: ['disabled', 'errormessage', 'haspopup', 'invalid'],
  navigation: ['disabled', 'errormessage', 'haspopup', 'invalid'],
  region: ['disabled', 'errormessage', 'haspopup', 'invalid'],
  search: ['disabled', 'errormessage', 'haspopup', 'invalid'],
  alert: ['disabled', 'errormessage', 'haspopup', 'invalid'],
  log: ['disabled', 'errormessage', 'haspopup', 'invalid'],
  marquee: ['disabled', 'errormessage', 'haspopup', 'invalid'],
  status: ['disabled', 'errormessage', 'haspopup', 'invalid'],
  timer: ['disabled', 'errormessage', 'haspopup', 'invalid'],
  tabpanel: ['disabled', 'errormessage', 'haspopup', 'invalid'],
  tooltip: ['disabled', 'errormessage', 'haspopup', 'invalid'],
  definition: ['disabled', 'errormessage', 'haspopup', 'invalid'],
  term: ['disabled', 'errormessage', 'haspopup', 'invalid'],
  paragraph: ['disabled', 'errormessage', 'haspopup', 'invalid'],
  generic: ['disabled', 'errormessage', 'haspopup', 'invalid'],
  blockquote: ['disabled', 'errormessage', 'haspopup', 'invalid'],
  caption: ['disabled', 'errormessage', 'haspopup', 'invalid'],
  code: ['disabled', 'errormessage', 'haspopup', 'invalid'],
  emphasis: ['disabled', 'errormessage', 'haspopup', 'invalid'],
  strong: ['disabled', 'errormessage', 'haspopup', 'invalid'],
  time: ['disabled', 'errormessage', 'haspopup', 'invalid'],
  deletion: ['disabled', 'errormessage', 'haspopup', 'invalid'],
  insertion: ['disabled', 'errormessage', 'haspopup', 'invalid'],
  subscript: ['disabled', 'errormessage', 'haspopup', 'invalid'],
  superscript: ['disabled', 'errormessage', 'haspopup', 'invalid'],
};

const INPUT_ROLES = {
  checkbox: 'checkbox', radio: 'radio', range: 'slider', number: 'spinbutton',
  search: 'searchbox', email: 'textbox', tel: 'textbox', text: 'textbox', url: 'textbox',
  button: 'button', submit: 'button', reset: 'button', image: 'button',
};

/** Input types that become a combobox when a list attribute is present. */
const DATALIST_TYPES = new Set(['text', 'search', 'tel', 'url', 'email']);

const TAG_ROLES = {
  button: 'button', textarea: 'textbox', img: 'img', article: 'article',
  aside: 'complementary', nav: 'navigation', main: 'main',
  h1: 'heading', h2: 'heading', h3: 'heading', h4: 'heading', h5: 'heading', h6: 'heading',
  ul: 'list', ol: 'list', menu: 'list', li: 'listitem',
  table: 'table', thead: 'rowgroup', tbody: 'rowgroup', tfoot: 'rowgroup',
  tr: 'row', td: 'cell', th: 'columnheader',
  form: 'form', fieldset: 'group', details: 'group', dialog: 'dialog', hr: 'separator',
  progress: 'progressbar', meter: 'meter', output: 'status', option: 'option',
  datalist: 'listbox', dt: 'term', dd: 'definition', p: 'paragraph',
  div: 'generic', span: 'generic', blockquote: 'blockquote', figure: 'figure',
  time: 'time', code: 'code', em: 'emphasis', strong: 'strong',
};

/**
 * The element's implicit ARIA role, or null when it has none / we don't
 * model it (callers should treat null as "don't judge").
 */
export function implicitRole(element) {
  const tag = element.tagName.toLowerCase();
  if (tag === 'a' || tag === 'area') return element.hasAttribute('href') ? 'link' : 'generic';
  if (tag === 'input') {
    // HTML-AAM: a text, search, tel, url or email input WITH a list attribute
    // maps to combobox (Chromium exposes it so), which is the role that
    // supports aria-expanded. 2026-08-25 overnight audit.
    if (DATALIST_TYPES.has(element.type) && element.hasAttribute('list')) return 'combobox';
    return INPUT_ROLES[element.type] ?? null;
  }
  // HTML-AAM: td is cell in a table, gridcell when the ancestor table has
  // role grid or treegrid; th is columnheader or rowheader by its scope in
  // either. The unconditional td=cell mapping reviewed every valid
  // aria-selected on an APG data grid. 2026-08-25 overnight audit.
  if (tag === 'td' || tag === 'th') {
    if (tag === 'th' && element.getAttribute('scope')?.toLowerCase() === 'row') return 'rowheader';
    if (tag === 'th') return 'columnheader';
    const table = element.closest('table');
    const tableRole = table && effectiveRole(table);
    return tableRole === 'grid' || tableRole === 'treegrid' ? 'gridcell' : 'cell';
  }
  if (tag === 'select') return element.multiple || element.size > 1 ? 'listbox' : 'combobox';
  if (tag === 'img') return element.getAttribute('alt') === '' ? 'presentation' : 'img';
  if (tag === 'header') return element.closest('article, aside, main, nav, section') ? 'generic' : 'banner';
  if (tag === 'footer') return element.closest('article, aside, main, nav, section') ? 'generic' : 'contentinfo';
  // HTML-AAM: an aside inside sectioning content is complementary only when
  // it carries an accessible name; unnamed it is generic. Verified against
  // Chromium's accessibility tree, which demotes exactly that case and keeps
  // a top-level aside complementary whether named or not.
  if (tag === 'aside') {
    const sectioned = element.parentElement?.closest('article, aside, nav, section');
    const named = element.hasAttribute('aria-label') || element.hasAttribute('aria-labelledby');
    return sectioned && !named ? 'generic' : 'complementary';
  }
  if (tag === 'section') {
    return element.hasAttribute('aria-label') || element.hasAttribute('aria-labelledby') ? 'region' : 'generic';
  }
  return TAG_ROLES[tag] ?? null;
}

/** The element's effective role: explicit (first modelled token) or implicit. */
/**
 * Presentational Roles Conflict Resolution: a `presentation`/`none` role is
 * DISCARDED when the element is focusable or carries a global ARIA property,
 * and the implicit role is exposed instead. Reporting against the written role
 * in those cases names a role the browser already threw away, and sends the
 * author to fix the wrong thing.
 *
 * The two triggers below are what browsers actually implement, verified in
 * Chromium's accessibility tree: `<h2 role="presentation">` exposes StaticText,
 * but adding tabindex or aria-describedby exposes `heading`. Note a non-global
 * property applicable to the implicit role (aria-level on a heading) does NOT
 * trigger it, even though a strict reading of the spec suggests it should.
 */
function presentationDiscarded(element) {
  if (element.tabIndex >= 0) return true;
  if (element.matches('a[href], button, input, select, textarea, summary, [contenteditable="true"]')) return true;
  return [...GLOBAL_ARIA].some((name) => element.hasAttribute(`aria-${name}`));
}

export function effectiveRole(element) {
  const explicit = element.getAttribute('role')?.trim().split(/\s+/) ?? [];
  for (const token of explicit) {
    const role = token.toLowerCase();
    if (!ROLE_ARIA[role]) continue;
    if ((role === 'presentation' || role === 'none') && presentationDiscarded(element)) {
      return implicitRole(element);
    }
    return role;
  }
  return explicit.length ? null : implicitRole(element); // unknown explicit role: don't judge
}
