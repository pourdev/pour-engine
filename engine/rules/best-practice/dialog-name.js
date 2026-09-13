// A dialog with no accessible name is announced as just "dialog". ARIA 1.2
// requires authors to name one, but WCAG 4.1.2 is written for user interface
// components, defined as controls, and a dialog is a container of controls
// whose own names 4.1.2 already covers. So the pattern is an ARIA authoring
// failure, not a WCAG one: demoted from 4.1.2 to best practice on 2026-09-13
// after rnib.org.uk's unnamed cookie banner was challenged.
import { labelledByName } from '../../lib/accessible-name.js';

export default {
  id: 'dialog-name',
  name: 'Dialog names',
  impact: 'serious',
  tags: ['best-practice'],
  help: 'Dialogs should have an accessible name',
  helpUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/',
  // Default visibility filter: a closed <dialog> is display:none, so only
  // dialogs the user can actually encounter are judged.
  selector: 'dialog, [role="dialog"], [role="alertdialog"]',
  evaluate(element) {
    if (labelledByName(element)) return { status: 'pass' };
    if (element.getAttribute('aria-label')?.trim() || element.getAttribute('title')?.trim()) {
      return { status: 'pass' };
    }
    return {
      status: 'fail',
      message: 'This dialog has no accessible name — screen readers announce just "dialog" with no hint of what it is or why it appeared.',
      fix: 'Point aria-labelledby at the dialog\'s heading, or add aria-label="What this dialog is".',
    };
  },
};
