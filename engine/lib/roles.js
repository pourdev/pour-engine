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

/** Attributes each role supports IN ADDITION to the globals. */
export const ROLE_ARIA = {
  link: ['disabled', 'expanded', 'haspopup'],
  button: ['disabled', 'expanded', 'haspopup', 'pressed'],
  checkbox: ['checked', 'disabled', 'errormessage', 'expanded', 'invalid', 'readonly', 'required'],
  switch: ['checked', 'disabled', 'errormessage', 'expanded', 'invalid', 'readonly', 'required'],
  radio: ['checked', 'disabled', 'posinset', 'setsize'],
  option: ['selected', 'checked', 'disabled', 'posinset', 'setsize'],
  tab: ['selected', 'disabled', 'expanded', 'haspopup', 'posinset', 'setsize'],
  menuitem: ['disabled', 'expanded', 'haspopup', 'posinset', 'setsize'],
  menuitemcheckbox: ['checked', 'disabled', 'expanded', 'haspopup', 'posinset', 'setsize'],
  menuitemradio: ['checked', 'disabled', 'expanded', 'haspopup', 'posinset', 'setsize'],
  textbox: ['activedescendant', 'autocomplete', 'disabled', 'errormessage', 'haspopup', 'invalid', 'multiline', 'placeholder', 'readonly', 'required'],
  searchbox: ['activedescendant', 'autocomplete', 'disabled', 'errormessage', 'haspopup', 'invalid', 'multiline', 'placeholder', 'readonly', 'required'],
  combobox: ['activedescendant', 'autocomplete', 'disabled', 'errormessage', 'expanded', 'haspopup', 'invalid', 'readonly', 'required'],
  listbox: ['activedescendant', 'disabled', 'errormessage', 'expanded', 'invalid', 'multiselectable', 'orientation', 'readonly', 'required'],
  slider: ['disabled', 'errormessage', 'haspopup', 'invalid', 'orientation', 'readonly', 'valuemax', 'valuemin', 'valuenow', 'valuetext'],
  spinbutton: ['activedescendant', 'disabled', 'errormessage', 'invalid', 'readonly', 'required', 'valuemax', 'valuemin', 'valuenow', 'valuetext'],
  progressbar: ['valuemax', 'valuemin', 'valuenow', 'valuetext'],
  meter: ['valuemax', 'valuemin', 'valuenow', 'valuetext'],
  scrollbar: ['disabled', 'orientation', 'valuemax', 'valuemin', 'valuenow', 'valuetext'],
  heading: ['level'],
  list: [],
  listitem: ['level', 'posinset', 'setsize'],
  row: ['colindex', 'disabled', 'expanded', 'level', 'posinset', 'rowindex', 'selected', 'setsize'],
  rowgroup: [],
  cell: ['colindex', 'colspan', 'rowindex', 'rowspan'],
  gridcell: ['colindex', 'colspan', 'rowindex', 'rowspan', 'disabled', 'errormessage', 'expanded', 'haspopup', 'invalid', 'readonly', 'required', 'selected'],
  columnheader: ['colindex', 'colspan', 'rowindex', 'rowspan', 'disabled', 'errormessage', 'expanded', 'haspopup', 'invalid', 'readonly', 'required', 'selected', 'sort'],
  rowheader: ['colindex', 'colspan', 'rowindex', 'rowspan', 'disabled', 'errormessage', 'expanded', 'haspopup', 'invalid', 'readonly', 'required', 'selected', 'sort'],
  table: ['colcount', 'rowcount'],
  grid: ['activedescendant', 'colcount', 'disabled', 'multiselectable', 'readonly', 'rowcount'],
  treegrid: ['activedescendant', 'colcount', 'disabled', 'errormessage', 'invalid', 'multiselectable', 'orientation', 'readonly', 'required', 'rowcount'],
  tablist: ['activedescendant', 'disabled', 'multiselectable', 'orientation'],
  menu: ['activedescendant', 'disabled', 'orientation'],
  menubar: ['activedescendant', 'disabled', 'orientation'],
  tree: ['activedescendant', 'disabled', 'errormessage', 'invalid', 'multiselectable', 'orientation', 'required'],
  treeitem: ['checked', 'disabled', 'expanded', 'haspopup', 'level', 'posinset', 'selected', 'setsize'],
  radiogroup: ['activedescendant', 'disabled', 'errormessage', 'invalid', 'orientation', 'readonly', 'required'],
  group: ['activedescendant', 'disabled'],
  separator: ['disabled', 'orientation', 'valuemax', 'valuemin', 'valuenow', 'valuetext'],
  toolbar: ['activedescendant', 'disabled', 'orientation'],
  dialog: ['modal'],
  alertdialog: ['modal'],
  application: ['activedescendant', 'disabled', 'expanded', 'haspopup'],
  article: ['posinset', 'setsize'],
  img: [], figure: [], document: [], feed: [], math: [], note: [], presentation: [], none: [],
  banner: [], complementary: [], contentinfo: [], form: [], main: [], navigation: [], region: [], search: [],
  alert: [], log: [], marquee: [], status: [], timer: [], tabpanel: [], tooltip: [],
  definition: [], term: [], paragraph: [], generic: [], blockquote: [], caption: [], code: [],
  emphasis: [], strong: [], time: [], deletion: [], insertion: [], subscript: [], superscript: [],
};

const INPUT_ROLES = {
  checkbox: 'checkbox', radio: 'radio', range: 'slider', number: 'spinbutton',
  search: 'searchbox', email: 'textbox', tel: 'textbox', text: 'textbox', url: 'textbox',
  button: 'button', submit: 'button', reset: 'button', image: 'button',
};

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
  if (tag === 'input') return INPUT_ROLES[element.type] ?? null;
  if (tag === 'select') return element.multiple || element.size > 1 ? 'listbox' : 'combobox';
  if (tag === 'img') return element.getAttribute('alt') === '' ? 'presentation' : 'img';
  if (tag === 'header') return element.closest('article, aside, main, nav, section') ? 'generic' : 'banner';
  if (tag === 'footer') return element.closest('article, aside, main, nav, section') ? 'generic' : 'contentinfo';
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
