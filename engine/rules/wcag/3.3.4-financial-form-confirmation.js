// WCAG SC 3.3.4 Error Prevention (Legal, Financial, Data) (Level AA)
// For a page that causes a financial transaction, a legal commitment or a
// change to stored user data, a submission must be reversible, checked
// with a chance to correct, or reviewable and confirmable before it is
// final. Which of those a form offers is process, invisible to a scan; but
// one class of page names itself: a form that collects card details
// (autocomplete cc-number, cc-csc, cc-exp and the rest, or a
// transaction-amount) is a payment form, and a payment is the financial
// transaction the criterion describes. That form is asked about, once,
// never failed: a review step may sit on the next page, and a purchase
// may be refundable within a stated period (G164).
//
// Deletion of user data and legal commitments have no markup signature
// and stay with the reviewer.
export default {
  id: 'financial-form-confirmation',
  name: 'Payment form safeguards',
  impact: 'serious',
  tags: ['wcag2aa', 'wcag334'],
  help: 'A form that takes a payment must be reversible, checked or confirmed before submission',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/error-prevention-legal-financial-data.html',
  selector: 'form',
  visibleOnly: false,
  evaluate(element) {
    if (!element.querySelector('input[autocomplete*="cc-" i], input[autocomplete~="transaction-amount" i]')) return { status: 'pass' };
    return {
      status: 'incomplete',
      message: 'This form collects card details, so submitting it makes a financial transaction. 3.3.4 requires at least one of: the submission can be reversed, the entries are checked for errors with a chance to correct them, or a review-and-confirm step comes before the final submit. Check which applies to this checkout.',
      fix: 'Add a review page before the final submit, validate the entries and let the user correct them, or state a period in which the order can be amended or cancelled.',
    };
  },
};
