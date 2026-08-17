// "Overdoing it" family: explicit role attributes that duplicate the
// element's built-in (implicit) ARIA role are noise — they add maintenance
// risk without helping assistive technology.
const IMPLICIT_ROLES = {
  ul: 'list', ol: 'list', li: 'listitem',
  button: 'button', nav: 'navigation', main: 'main', aside: 'complementary',
  form: 'form', table: 'table', article: 'article', img: 'img', hr: 'separator',
  progress: 'progressbar', textarea: 'textbox', dialog: 'dialog', option: 'option',
  h1: 'heading', h2: 'heading', h3: 'heading', h4: 'heading', h5: 'heading', h6: 'heading',
  // Table structure (th is skipped: its implicit role is contextual —
  // columnheader or rowheader). header/footer/section are contextual too.
  tr: 'row', thead: 'rowgroup', tbody: 'rowgroup', tfoot: 'rowgroup', td: 'cell',
  fieldset: 'group',
};

const INPUT_ROLES = {
  checkbox: 'checkbox', radio: 'radio', button: 'button', submit: 'button', reset: 'button',
  text: 'textbox', email: 'textbox', tel: 'textbox', url: 'textbox',
  range: 'slider', number: 'spinbutton', search: 'searchbox',
};

function implicitRole(element) {
  const tag = element.tagName.toLowerCase();
  if (tag === 'a') return element.hasAttribute('href') ? 'link' : null;
  if (tag === 'input') return INPUT_ROLES[element.type] ?? null;
  return IMPLICIT_ROLES[tag] ?? null;
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
    // The exceptions this rule's own advice describes are honoured, not
    // just documented:
    //  - role="list"/"listitem" on list-style:none lists is the standard
    //    fix for Safari/VoiceOver dropping list semantics — keep it.
    //  - role="img" on an SVG-source <img> is the standard fix for
    //    VoiceOver skipping the alt text of SVG images — keep it.
    if (explicit === 'list' && getComputedStyle(element).listStyleType === 'none') return { status: 'pass' };
    if (explicit === 'listitem') {
      const list = element.closest('ul, ol');
      if (list && getComputedStyle(list).listStyleType === 'none') return { status: 'pass' };
    }
    if (explicit === 'img' && /\.svg([?#]|$)/i.test(element.currentSrc || element.src || '')) return { status: 'pass' };
    const tag = element.tagName.toLowerCase();
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
