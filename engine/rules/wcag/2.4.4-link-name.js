// WCAG SC 2.4.4 Link Purpose (In Context) (Level A) · SC 4.1.2 Name, Role, Value (Level A)
import { effectiveRole, implicitRole } from '../../lib/roles.js';

export default {
  id: 'link-name',
  name: 'Link names',
  impact: 'serious',
  tags: ['wcag2a', 'wcag244', 'wcag412'],
  help: 'Links must have an accessible name',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/link-purpose-in-context.html',
  // a[href] has the link role implicitly; role="link" claims it explicitly.
  // (Links without href have no link role and are correctly excluded.)
  selector: 'a[href], [role="link"]',
  evaluate(element, { accessibleName }) {
    // Route by EFFECTIVE role (2026-08-25 overnight audit): an <a href
    // role="button"> is exposed as a button, not a link (ARIA 1.2 section
    // 9.1, the role attribute overrides the host role), so its missing name
    // is button-name's finding, worded for a button; <a href role="tab"> is
    // composite-widget-name's. One nameless control, one finding. An
    // unknown explicit role is ignored by the browser and the native link
    // role survives, which is what the implicitRole fallback answers.
    const role = effectiveRole(element) ?? implicitRole(element);
    if (role !== 'link') return { status: 'pass' };
    if (accessibleName(element)) return { status: 'pass' };
    return {
      status: 'fail',
      message: 'This link has no accessible name — screen readers can only announce its URL.',
      fix: 'Add text content to the link, alt text to the image inside it, or an aria-label.',
    };
  },
};
