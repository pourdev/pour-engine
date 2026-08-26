// WCAG SC 4.1.2 Name, Role, Value (Level A)
import { effectiveRole, implicitRole } from '../../lib/roles.js';

export default {
  id: 'button-name',
  name: 'Button names',
  impact: 'critical',
  tags: ['wcag2a', 'wcag412'],
  help: 'Buttons must have an accessible name',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html',
  selector: 'button, [role="button"], input[type="button"], input[type="submit"], input[type="reset"]',
  evaluate(element, { accessibleName }) {
    // Route by EFFECTIVE role (2026-08-25 overnight audit): a <button
    // role="tab"> or <button role="link"> is exposed under that role, so its
    // missing name belongs to the rule that speaks for that role
    // (composite-widget-name, link-name). This rule owns every element whose
    // effective role is button, whatever its tag: <a href role="button">
    // included, which used to draw a finding here AND in link-name. An
    // unknown explicit role falls back to the native role.
    const role = effectiveRole(element) ?? implicitRole(element);
    if (role !== 'button') return { status: 'pass' };
    if (accessibleName(element)) return { status: 'pass' };
    return {
      status: 'fail',
      message: 'This button has no accessible name — a screen reader announces just "button".',
      fix: 'Add visible text inside the button, or aria-label="What it does" for icon-only buttons.',
    };
  },
};
