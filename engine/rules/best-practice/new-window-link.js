// WCAG technique G200/G201: opening a new window without warning disorients
// users who can't see the window change. Heuristic is English-only for now.
const MENTIONS_NEW_WINDOW = /new (window|tab)|opens? in/i;

/** The nearest declared language. An undeclared language is judged as
 *  English (html-lang reports the missing declaration itself). */
function effectiveLang(element) {
  return element.closest('[lang]')?.getAttribute('lang')?.trim()
    || element.ownerDocument.documentElement.getAttribute('lang')?.trim()
    || '';
}

/** G201 asks only that a warning is "spoken in assistive technology"; its
 *  own second example delivers it through aria-describedby, so the
 *  description joins the text tested. Targets are read hidden or not, the
 *  way the description computation reads them (2026-08-25 overnight audit). */
function describedByText(element) {
  const refs = element.getAttribute('aria-describedby');
  if (!refs) return '';
  const root = element.getRootNode();
  return refs.split(/\s+/).filter(Boolean)
    .map((id) => root.getElementById?.(id)?.textContent ?? '')
    .join(' ');
}

export default {
  id: 'new-window-link',
  name: 'New-window warnings',
  impact: 'minor',
  tags: ['best-practice'],
  help: 'Links opening a new window should say so',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Techniques/general/G201',
  selector: 'a[target="_blank"], a[target="blank"]',
  evaluate(element, { accessibleName }) {
    const name = `${accessibleName(element)} ${element.getAttribute('title') ?? ''} ${describedByText(element)}`;
    if (MENTIONS_NEW_WINDOW.test(name)) return { status: 'pass' };
    // The wording test reads English only. In another language the DOM
    // cannot prove the warning is missing ("nouvelle fenêtre" satisfies
    // G201 just as well), so the verdict is a question, not a failure
    // (2026-08-25 overnight audit).
    const lang = effectiveLang(element);
    if (lang && !/^en(?:[-_]|$)/i.test(lang)) {
      return {
        status: 'incomplete',
        message: `This link opens a new window or tab. Does its name, title or description say so in the page's language ("${lang}")? The automated wording check reads English only.`,
        fix: 'Say so in the link text or a visually hidden span (for example the local-language equivalent of "opens in new window"), or drop target="_blank".',
      };
    }
    return {
      status: 'fail',
      message: 'This link opens a new window/tab without saying so — the back button stops working and screen-reader users get no warning about the context change.',
      fix: 'Append visually-hidden text like <span class="sr-only">(opens in new window)</span>, or drop target="_blank".',
    };
  },
};
