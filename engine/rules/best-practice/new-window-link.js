// WCAG technique G200/G201: opening a new window without warning disorients
// users who can't see the window change. Heuristic is English-only for now.
const MENTIONS_NEW_WINDOW = /new (window|tab)|opens? in/i;

export default {
  id: 'new-window-link',
  impact: 'minor',
  tags: ['best-practice'],
  help: 'Links opening a new window should say so',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Techniques/general/G201',
  selector: 'a[target="_blank"], a[target="blank"]',
  evaluate(element, { accessibleName }) {
    const name = `${accessibleName(element)} ${element.getAttribute('title') ?? ''}`;
    if (MENTIONS_NEW_WINDOW.test(name)) return { status: 'pass' };
    return {
      status: 'fail',
      message: 'This link opens a new window/tab without saying so — the back button stops working and screen-reader users get no warning about the context change.',
      fix: 'Append visually-hidden text like <span class="sr-only">(opens in new window)</span>, or drop target="_blank".',
    };
  },
};
