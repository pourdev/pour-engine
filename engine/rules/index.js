// Rule registry. Add a rule: create the file in the right folder, import
// it, add it here.
//
//   wcag/          — rules mapped to WCAG success criteria (spec-required;
//                    tagged with wcag* criterion tags)
//   best-practice/ — opt-in extras tagged 'best-practice': ARIA Authoring
//                    Practices, WAI tutorial guidance, and our "overdoing
//                    it" redundancy family. Never tagged as WCAG.

// --- WCAG ---
import documentTitle from './wcag/2.4.2-document-title.js';
import htmlLang from './wcag/3.1.1-html-lang.js';
import validLangParts from './wcag/3.1.2-valid-lang-parts.js';
import imageAlt from './wcag/1.1.1-image-alt.js';
import svgImgAlt from './wcag/1.1.1-svg-img-alt.js';
import buttonName from './wcag/4.1.2-button-name.js';
import linkName from './wcag/2.4.4-link-name.js';
import linkTextGeneric from './wcag/2.4.4-link-text-generic.js';
import linkTextGenericOnly from './wcag/2.4.9-link-text-generic-only.js';
// Re-parked by product decision (2026-08-01, David, after a one-day
// un-parking): 2.5.3 is normative Level A but chiefly serves speech-input
// users, and the findings volume isn't wanted in results for now. The SC is
// classed 'manual' in wcag22.js so it lands in the human checklist instead
// of being silently skipped. The rule itself (incl. the labelled-field
// widening) stays maintained here — restore the import + registry entry to
// bring it back.
// import labelInName from './wcag/2.5.3-label-in-name.js';
import formLabel from './wcag/1.3.1-form-label.js';
import autocompleteValid from './wcag/1.3.5-autocomplete-valid.js';
import orientationLock from './wcag/1.3.4-orientation.js';
import metaViewport from './wcag/1.4.4-meta-viewport.js';
import colorContrast from './wcag/1.4.3-color-contrast.js';
import frameTitle from './wcag/4.1.2-frame-title.js';
import ariaValidRefs from './wcag/4.1.2-aria-valid-refs.js';
import validRole from './wcag/4.1.2-valid-role.js';
import ariaHiddenFocus from './wcag/4.1.2-aria-hidden-focus.js';
import listStructure from './wcag/1.3.1-list-structure.js';
import nestedInteractive from './wcag/4.1.2-nested-interactive.js';
import bypassBlocks from './wcag/2.4.1-bypass-blocks.js';
import targetSize from './wcag/2.5.8-target-size.js';
import audioControl from './wcag/1.4.2-audio-control.js';
import pauseStopHide from './wcag/2.2.2-pause-stop-hide.js';
import mediaCaptions from './wcag/1.2.2-media-captions.js';
import ariaAttrValid from './wcag/4.1.2-aria-attr-valid.js';
// Reviews rather than asserts: an unsupported ARIA attribute breaks an ARIA
// author MUST (1.2 §8.6) but is INERT, so name, role and value all survive
// and no success criterion provably fails. It sits in the WCAG scope anyway,
// because a real authoring error that a browser silently discards should not
// be invisible in a default audit, and it asks whether the state is real
// instead of claiming a failure (see the note in the rule file).
import ariaAllowedAttr from './wcag/4.1.2-aria-allowed-attr.js';
import ariaFieldName from './wcag/4.1.2-aria-field-name.js';
// Asks instead of asserting: a prohibited name on a generic element is a
// real ARIA MUST violation the browser silently drops, so it runs in the
// default scope as a review question (see the note in the rule file —
// it has been asserted, demoted, and now asks; same route as
// aria-allowed-attr).
import ariaLabelMisuse from './wcag/4.1.2-aria-label-misuse.js';
import roleRequiredAria from './wcag/4.1.2-role-required-aria.js';
import labelForValid from './wcag/4.1.2-label-for-valid.js';
import listitemParent from './wcag/1.3.1-listitem-parent.js';
import definitionList from './wcag/1.3.1-definition-list.js';
import dlitemParent from './wcag/1.3.1-dlitem-parent.js';
import areaAlt from './wcag/1.1.1-area-alt.js';
import objectAlt from './wcag/1.1.1-object-alt.js';
import inputImageAlt from './wcag/1.1.1-input-image-alt.js';
// Demoted to best-practice: multiple labels are valid HTML that 3.3.2
// does not prohibit (see the note in the rule file).
import multipleLabels from './best-practice/multiple-labels.js';
import metaRefresh from './wcag/2.2.1-meta-refresh.js';
import linkInTextBlock from './wcag/1.4.1-link-in-text-block.js';
import pAsHeading from './wcag/1.3.1-p-as-heading.js';
import ariaRequiredChildren from './wcag/1.3.1-aria-required-children.js';
import ariaRequiredParent from './wcag/1.3.1-aria-required-parent.js';
import scrollableRegionFocusable from './wcag/2.1.1-scrollable-region-focusable.js';
import tableHeaders from './wcag/1.3.1-table-headers.js';
import contrastEnhanced from './wcag/1.4.6-contrast-enhanced.js';
import targetSizeEnhanced from './wcag/2.5.5-target-size-enhanced.js';
import dialogName from './wcag/4.1.2-dialog-name.js';
import controlContrast from './wcag/1.4.3-control-contrast.js';
import nonTextContrast from './wcag/1.4.11-non-text-contrast.js';
import textSpacing from './wcag/1.4.12-text-spacing.js';
import reflow from './wcag/1.4.10-reflow.js';
import focusVisible from './wcag/2.4.7-focus-visible.js';
import focusNotObscured from './wcag/2.4.11-focus-not-obscured.js';
import authFieldObstruction from './wcag/3.3.8-auth-field-obstruction.js';
// 2026-08-10 spec-sweep batch: the six missing failure families plus the two
// state-dependent heuristics the sweep judged automatable (see COVERAGE.md).
import embedAlt from './wcag/1.1.1-embed-alt.js';
import canvasAlt from './wcag/1.1.1-canvas-alt.js';
import videoLoopMotion from './wcag/2.2.2-video-loop-motion.js';
import visualOrderDivergence from './wcag/2.4.3-visual-order-divergence.js';
// 2026-08-25 gap batch (reports/coverage-gaps/2026-08-25-1915.html): the four
// A/AA criteria neither engine covered where an honest review question
// exists. All four ask, none asserts — each SC's failure hinges on a fact
// (a transcript nearby, an essential confirmation, a no-drag path, meaning
// in a sequence) the DOM cannot prove.
import audioTranscript from './wcag/1.2.1-audio-transcript.js';
import readingOrderDivergence from './wcag/1.3.2-reading-order-divergence.js';
import dragAlternative from './wcag/2.5.7-drag-alternative.js';
import redundantEntry from './wcag/3.3.7-redundant-entry.js';
import onInputNavigation from './wcag/3.2.2-on-input-navigation.js';
import errorMessageLinkage from './wcag/3.3.1-error-message-linkage.js';
import compositeWidgetName from './wcag/4.1.2-composite-widget-name.js';
import summaryName from './wcag/4.1.2-summary-name.js';

// --- Best practice ---
import headingOrder from './best-practice/heading-order.js';
import emptyHeading from './best-practice/empty-heading.js';
import positiveTabindex from './best-practice/positive-tabindex.js';
import region from './best-practice/region.js';
import landmarkOneMain from './best-practice/landmark-one-main.js';
import pageHeadingOne from './best-practice/page-heading-one.js';
import landmarkUnique from './best-practice/landmark-unique.js';
import redundantRole from './best-practice/redundant-role.js';
import redundantAria from './best-practice/redundant-aria.js';
import redundantAriaLabel from './best-practice/redundant-aria-label.js';
import redundantAltPhrase from './best-practice/redundant-alt-phrase.js';
import redundantTabindex from './best-practice/redundant-tabindex.js';
import redundantImageAlt from './best-practice/redundant-image-alt.js';
import landmarkTopLevel from './best-practice/landmark-top-level.js';
import accesskeys from './best-practice/accesskeys.js';
import buttonType from './best-practice/button-type.js';
import noAutofocus from './best-practice/no-autofocus.js';
import newWindowLink from './best-practice/new-window-link.js';
import fieldsetLegend from './best-practice/fieldset-legend.js';

/** Sort key: primary WCAG SC (numeric), best-practice rules after all WCAG
 *  rules, ties by rule id. Execution order doesn't change any verdict —
 *  spec order just makes progress display and reports predictable. */
function scKey(rule) {
  const tag = rule.tags.find((t) => /^wcag\d{3,4}$/.test(t));
  if (!tag) return [9, 9, 99];
  const digits = tag.slice(4);
  return [+digits[0], +digits[1], +digits.slice(2)];
}

export default [
  documentTitle,
  htmlLang,
  validLangParts,
  imageAlt,
  svgImgAlt,
  buttonName,
  linkName,
  linkTextGeneric,
  linkTextGenericOnly,
  // labelInName, — re-parked 2026-08-01, see note at the import
  formLabel,
  autocompleteValid,
  orientationLock,
  metaViewport,
  colorContrast,
  frameTitle,
  ariaValidRefs,
  validRole,
  ariaHiddenFocus,
  listStructure,
  nestedInteractive,
  bypassBlocks,
  targetSize,
  audioControl,
  pauseStopHide,
  mediaCaptions,
  ariaAttrValid,
  ariaAllowedAttr,
  ariaFieldName,
  ariaLabelMisuse,
  roleRequiredAria,
  labelForValid,
  listitemParent,
  definitionList,
  dlitemParent,
  areaAlt,
  objectAlt,
  inputImageAlt,
  multipleLabels,
  metaRefresh,
  linkInTextBlock,
  pAsHeading,
  ariaRequiredChildren,
  ariaRequiredParent,
  scrollableRegionFocusable,
  tableHeaders,
  dialogName,
  controlContrast,
  nonTextContrast,
  textSpacing,
  reflow,
  focusVisible,
  focusNotObscured,
  authFieldObstruction,
  embedAlt,
  canvasAlt,
  videoLoopMotion,
  visualOrderDivergence,
  audioTranscript,
  readingOrderDivergence,
  dragAlternative,
  redundantEntry,
  onInputNavigation,
  errorMessageLinkage,
  compositeWidgetName,
  summaryName,
  contrastEnhanced,
  targetSizeEnhanced,
  headingOrder,
  emptyHeading,
  positiveTabindex,
  region,
  landmarkOneMain,
  pageHeadingOne,
  landmarkUnique,
  redundantRole,
  redundantAria,
  redundantAriaLabel,
  redundantAltPhrase,
  redundantTabindex,
  redundantImageAlt,
  landmarkTopLevel,
  accesskeys,
  buttonType,
  noAutofocus,
  newWindowLink,
  fieldsetLegend,
].sort((a, b) => {
  const ka = scKey(a);
  const kb = scKey(b);
  return (ka[0] - kb[0]) || (ka[1] - kb[1]) || (ka[2] - kb[2]) || a.id.localeCompare(b.id);
});
