// WCAG SC 2.4.2 Page Titled (Level A)
// "Web pages have titles that describe topic or purpose." A title that is
// merely PRESENT satisfies the markup, not the criterion, so the two
// well-known undescriptive shapes are checked as well.
//
// Tier one, failed: strings that are a stand-in under every reading.
// "Untitled Document" is what an editor writes when the author wrote
// nothing, and no page is ever about that.
// Tier two, sent to a human: single generic words and framework scaffold
// defaults. Almost always a leftover, but a gallery page really can be about
// an artwork called "Untitled", and "Example Domain" really is the subject
// of example.com. Those are somebody's call to make, not the engine's.
// "New document", "New page" and "New tab" sit in tier two as well: a
// document editor's creation screen, a wiki's new-page form or a
// browser-style app's new-tab page is about exactly that, so only the
// numbered editor default ("New Page 1", F25's example) is a certain
// placeholder (2026-08-25 overnight audit).
//
// Deliberately NOT judged: whether a real-looking title matches the page it
// sits on. That needs someone who can read the page, and guessing at it
// would produce exactly the confident-but-wrong findings this engine avoids.
import { isEmbeddedDocument } from '../../lib/dom.js';

const PLACEHOLDER = new Set([
  'untitled document', 'untitled page', 'untitled-1', 'untitled 1',
  'no title',
  'insert title here', 'title here', 'page title', 'document title',
  'web page', 'webpage',
]);
const UNDESCRIPTIVE = new Set([
  'untitled', 'document', 'page', 'title', 'default', 'index',
  'new document', 'new page', 'new tab',
  'react app', 'create react app', 'vite app', 'vite + react', 'vite + vue', 'vite + svelte',
  'next app', 'create next app', 'vue app', 'nuxt app', 'svelte app', 'angular app',
  'my app', 'my site', 'my website', 'site title', 'your site title',
  'example domain', 'hello world',
]);

export default {
  id: 'document-title',
  name: 'Page title',
  impact: 'serious',
  tags: ['wcag2a', 'wcag242'],
  help: 'The page must have a title that describes its topic or purpose',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/page-titled.html',
  selector: 'html',
  visibleOnly: false,
  evaluate(element) {
    // 2.4.2 applies to "Web pages", which the spec defines as non-embedded
    // resources. A widget or ad iframe is part of the page, not a page:
    // demanding a <title> of it invents failures on every embedded frame
    // (its name comes from the iframe's title attribute, judged by 4.1.2).
    if (isEmbeddedDocument(element.ownerDocument)) return { status: 'pass' };
    const title = element.ownerDocument.title.trim();
    if (!title) {
      return {
        status: 'fail',
        message: 'The page has no title, so users of screen readers and browser tabs cannot tell what it is.',
        fix: 'Add <title>Page name — Site name</title> inside <head>.',
      };
    }
    // Collapsed and lowercased so "Untitled   Document" is caught too.
    const normalized = title.replace(/\s+/g, ' ').toLowerCase();
    if (PLACEHOLDER.has(normalized) || /^(?:untitled|new (?:document|page|tab))[\s-]*\d+$/.test(normalized)) {
      return {
        status: 'fail',
        message: `“${title}” is a placeholder left by an editor or template. It gives no topic and no purpose, so a screen reader announces nothing useful when the page loads, and a row of open tabs, bookmarks or history entries becomes impossible to tell apart.`,
        fix: 'Put this page\'s own subject in the title first, then the site name.',
      };
    }
    if (UNDESCRIPTIVE.has(normalized)) {
      return {
        status: 'incomplete',
        message: `“${title}” is a generic title, and usually a default nobody replaced. Unless the page really is about that, it describes neither topic nor purpose and 2.4.2 is not met. Check whether it was meant to be filled in.`,
      };
    }
    return { status: 'pass' };
  },
};
