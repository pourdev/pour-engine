// WCAG SC 4.1.2 Name, Role, Value (Level A)
//
// Rewritten 2026-08-25 overnight audit, two decisions:
//
// 1. The browser decides what is labelable, not a tag list. HTML defines
//    the labeled control as "the first element in tree order whose ID is
//    equal to the value of the for attribute, if it is a labelable element",
//    and exposes exactly that resolution as label.control. The list this
//    rule used to keep missed form-associated custom elements (HTML lists
//    them as labelable) and admitted input type=hidden (HTML does not).
//
// 2. A label is not a user interface component. 4.1.2 asks that every
//    component's name and role be determinable; a caption whose for points
//    at nothing, or at a paragraph, harms no component by itself. Where a
//    real control was left nameless, form-label asserts on that control, so
//    asserting here too was one fault reported twice, and where no control
//    was ever meant, it was a fault reported that does not exist. The rule
//    now asks. It still asserts the one shape the DOM proves: a label that
//    WRAPS a labelable control while its for points elsewhere, because
//    HTML's for rule overrides the wrapping and the wrapped control provably
//    loses its label.
const WRAPPABLE = 'input:not([type="hidden"]), select, textarea, button, meter, output, progress';

export default {
  id: 'label-for-valid',
  name: 'Label target references',
  impact: 'serious',
  tags: ['wcag2a', 'wcag412'],
  help: 'label[for] must reference a form control that exists',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html',
  selector: 'label[for]',
  evaluate(element) {
    const id = element.getAttribute('for');
    // `control` is the browser's own for-resolution: null when the id is
    // missing or names something that is not labelable. It resolves within
    // the label's own root, so a label in a shadow tree can only point at
    // controls in that same tree.
    if (element.control) return { status: 'pass' };
    const target = element.getRootNode().getElementById?.(id);
    // A hidden input is not labelable, but nothing perceivable is harmed by
    // a label that points at one (standing policy: this shape passes).
    if (target && target.tagName === 'INPUT' && target.type === 'hidden') return { status: 'pass' };
    const wrapped = element.querySelector(WRAPPABLE);
    if (wrapped) {
      return {
        status: 'fail',
        message: `This label wraps a <${wrapped.tagName.toLowerCase()}> but its for="${id}" ${target ? `points at a <${target.tagName.toLowerCase()}>, which is not labelable` : 'points at nothing'}. The for attribute overrides the wrapping, so the wrapped control is not labelled by this text.`,
        fix: `Point the for attribute at the wrapped control's id, or remove the for attribute so the wrapping labels it.`,
      };
    }
    return {
      status: 'incomplete',
      message: target
        ? `for="${id}" points at a <${target.tagName.toLowerCase()}>, which is not a labelable element, so the browser ignores the association. Was a form control meant to be here? If so it has no label from this text (form-label reports the control itself); if this text captions something that is not a control, nothing is affected.`
        : `for="${id}" points at nothing, so this label is not associated with any control. Was a form control meant to be here? If so it has lost its label (form-label reports the control itself); if this is leftover markup, no one is affected.`,
      fix: 'Point the for attribute at the id of the control it labels, or remove the attribute.',
    };
  },
};
