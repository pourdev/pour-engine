// Engine runner: evaluates every applicable rule against the page and
// returns structured results (violations / passes / incomplete /
// inapplicable, plus the manual-review criteria and per-rule timings).
import config from '../config/project.config.js';
import rules from './rules/index.js';
import wcagCatalog from './wcag22.js';
import wcag30Draft from './wcag30-draft.js';
import { isVisible, isRendered, cssPath, htmlSnippet, ownText, collectRoots } from './lib/dom.js';
import { accessibleName } from './lib/accessible-name.js';
import { resetAuditCaches } from './lib/contrast.js';

export const name = config.engine.name;
export const version = config.engine.version;

const ruleHelpers = { isVisible, isRendered, cssPath, htmlSnippet, ownText, accessibleName };

/** Does this rule match the requested tag selection? Empty/absent = all rules. */
function ruleMatchesTags(rule, tags) {
  if (!tags?.length) return true;
  return rule.tags.some((tag) => tags.includes(tag));
}

/** Which WCAG version/level was requested, judged from the selected tags. */
function scopeFromTags(tags) {
  if (!tags?.length) return { version: '2.2', level: 'AAA' }; // no filter → everything
  const version = tags.some((t) => t.startsWith('wcag22')) ? '2.2'
    : tags.some((t) => t.startsWith('wcag21')) ? '2.1' : '2.0';
  const level = tags.some((t) => /aaa$/.test(t)) ? 'AAA'
    : tags.some((t) => /aa$/.test(t)) ? 'AA' : 'A';
  return { version, level };
}

const VERSION_ORDER = { '2.0': 0, '2.1': 1, '2.2': 2 };
const LEVEL_ORDER = { A: 0, AA: 1, AAA: 2 };

/**
 * The WCAG criteria in scope that automation cannot fully judge — reported
 * with every audit so that "full spec coverage" is real: rules handle what
 * they can, and the rest is an explicit human checklist, never silence.
 */
function manualReviewCriteria(tags) {
  const scope = scopeFromTags(tags);
  return wcagCatalog
    .filter((criterion) => criterion.automation !== 'auto')
    .filter((criterion) => VERSION_ORDER[criterion.since] <= VERSION_ORDER[scope.version])
    .filter((criterion) => LEVEL_ORDER[criterion.level] <= LEVEL_ORDER[scope.level])
    .map(({ num, name: criterionName, level, principle, url, automation }) =>
      ({ num, name: criterionName, level, principle, url, automation }));
}

/**
 * True when the element, or any flat-tree ancestor (crossing shadow
 * boundaries host-ward), matches the exclude selector. Lets a testing tool
 * keep its own injected UI out of the audit — a panel drawn over the page
 * must never appear in the page's results.
 */
function isExcluded(element, selector) {
  let node = element;
  while (node) {
    if (node.closest?.(selector)) return true;
    node = node.getRootNode()?.host ?? null;
  }
  return false;
}

/** Serialize one evaluated element into a result node. */
function toResultNode(element, outcome) {
  const node = {
    target: [cssPath(element)],
    html: htmlSnippet(element),
    failureSummary: [outcome.message, outcome.fix && `Fix: ${outcome.fix}`].filter(Boolean).join('\n'),
  };
  // Structured extras from the rule (e.g. the exact colour pair behind a
  // contrast failure) ride along for UIs that can use them.
  if (outcome.data) node.data = outcome.data;
  return node;
}

/**
 * Run the audit.
 * @param {Document|Element} context - what to scan
 * @param {{ tags?: string[], exclude?: string, standard?: string, signal?: AbortSignal }} options -
 *   rule selection by tag (wcag2a…wcag22aa, best-practice), empty selects
 *   every rule; exclude is a CSS selector — elements matching it, or inside
 *   a match (including across shadow boundaries), are left out of every
 *   rule; standard 'wcag30-draft' reframes the report against the WCAG 3.0
 *   Working Draft (results.standard is stamped draft, the manual checklist
 *   becomes the draft guidelines, and each rule result carries the draft
 *   guideline it maps to) — the rules themselves stay WCAG 2.x, which is
 *   the only honest claim a tool can make about a draft;
 *   signal aborts the run between rules (throws AbortError)
 * @param {(progress: object) => void} [onProgress] - called before each rule
 *   starts ({rule, running}), during a rule at each renderer yield with a
 *   fractional done (completed rules + this rule's evaluated-element share,
 *   so a bar fills smoothly through big element sets), and after it
 *   finishes ({rule, ms, counts})
 */
export async function run(context = document, options = {}, onProgress) {
  const auditStarted = performance.now();
  const draft30 = options.standard === 'wcag30-draft';
  const results = {
    testEngine: { name, version },
    timestamp: new Date().toISOString(),
    url: context.location?.href ?? context.ownerDocument?.location?.href ?? '',
    standard: draft30 ? wcag30Draft.draftInfo : null,
    violations: [],
    passes: [],
    incomplete: [],
    inapplicable: [],
    manualReview: draft30 ? wcag30Draft.manualReviewChecklist() : manualReviewCriteria(options.tags),
    ruleTimings: [],
  };

  // `disabled: true` keeps a rule in the codebase (and coverage docs) but
  // out of every run — for rules parked pending quality review.
  const activeRules = rules.filter((rule) => !rule.disabled && ruleMatchesTags(rule, options.tags));
  // Per-audit caches (resolved backgrounds, opacities) must start fresh —
  // the page may have changed since the last run.
  resetAuditCaches();
  // Every queryable root — the page plus all open shadow trees — collected
  // once so rules see web-component content without re-walking per rule.
  const roots = collectRoots(context.querySelectorAll ? context : document);
  // Universal-selector rules (aria attribute checks) share one full scan
  // instead of each re-enumerating every element on the page.
  let universalScan = null;
  const elementsFor = (selector) => {
    if (selector === '*') {
      universalScan ??= roots.flatMap((root) => [...root.querySelectorAll('*')]);
      return universalScan;
    }
    return roots.flatMap((root) => [...root.querySelectorAll(selector)]);
  };
  let completed = 0;
  // Running totals so the UI can count issues up live as rules finish —
  // both affected elements and distinct rules ("types") per severity.
  const liveCounts = { critical: 0, serious: 0, moderate: 0, minor: 0, review: 0 };
  const liveTypeCounts = { critical: 0, serious: 0, moderate: 0, minor: 0, review: 0 };

  // The audit shares the page's main thread. Rules only await microtasks,
  // so without a real yield the whole run is one long task and the browser
  // never paints — in-page progress UI (the bookmarklet panel) would appear
  // only when everything is done, and the audited page itself freezes.
  // Yield about once a frame; between rules is the granularity we have.
  let lastYield = performance.now();
  // Yield via MessageChannel: a normal macrotask like setTimeout(0) — fair
  // FIFO with the audited page's own tasks (deliberately NOT
  // scheduler.yield(), whose continuations outprioritize and starve them) —
  // but WITHOUT the ~4ms nested-timer clamp, which added phantom wall time
  // across the hundreds of yields of a large audit.
  const yieldChannel = typeof MessageChannel === 'function' ? new MessageChannel() : null;
  const nextTask = () => new Promise((resolve) => {
    if (!yieldChannel) { setTimeout(resolve, 0); return; }
    yieldChannel.port1.onmessage = resolve; // one yield in flight at a time
    yieldChannel.port2.postMessage(0);
  });
  const yieldToRenderer = async (beforeYield) => {
    if (performance.now() - lastYield < 16) return;
    // Runs only when a real yield (and so a paint) follows — the natural
    // throttle for mid-rule progress reports.
    beforeYield?.();
    await nextTask();
    lastYield = performance.now();
  };

  for (const rule of activeRules) {
    // Between rules is the abort granularity we have — the same boundary
    // the renderer yield uses.
    if (options.signal?.aborted) throw new DOMException('Audit stopped', 'AbortError');
    await yieldToRenderer();
    // Announce BEFORE running: the UI label must show the rule currently
    // under test, not the one that just finished (a slow rule would
    // otherwise sit blamed on its predecessor's name).
    onProgress?.({ done: completed, total: activeRules.length, rule: rule.id, running: true });
    const ruleStarted = performance.now();

    let elements = elementsFor(rule.selector);
    if (options.exclude) {
      elements = elements.filter((element) => !isExcluded(element, options.exclude));
    }
    if (rule.visibleOnly !== false) {
      // visibility: 'visual' → rendered on screen counts even inside
      // aria-hidden (visual rules); default → must be exposed to AT too.
      elements = elements.filter(rule.visibility === 'visual' ? isRendered : isVisible);
    }

    let outcomes;
    if (rule.evaluateAll) {
      // Awaiting a plain array is a no-op, so sync evaluateAll rules are
      // untouched — async ones (the deferred-reference probe) resolve here.
      outcomes = await rule.evaluateAll(elements, ruleHelpers);
    } else {
      // Evaluate sequentially with periodic yields so ONE heavy rule on a
      // huge element set can't freeze the page for its whole duration —
      // and so a Stop lands mid-rule, not only between rules.
      outcomes = new Array(elements.length);
      for (let i = 0; i < elements.length; i++) {
        if ((i & 31) === 0 && i > 0) {
          if (options.signal?.aborted) throw new DOMException('Audit stopped', 'AbortError');
          // Fractional done: this rule's slice of the bar fills as its
          // elements are evaluated instead of jumping on completion.
          await yieldToRenderer(() => onProgress?.({
            done: completed + i / elements.length,
            total: activeRules.length,
            rule: rule.id,
            running: true,
          }));
        }
        outcomes[i] = await rule.evaluate(elements[i], ruleHelpers);
      }
    }

    // Only failures and review findings serialize element details — pass
    // nodes are counted, not rendered: nothing consumes them, and building
    // cssPath/snippets for every passing element dominated audit time on
    // large pages.
    const buckets = { fail: [], incomplete: [] };
    let passCount = 0;
    elements.forEach((element, i) => {
      const status = outcomes[i].status;
      if (status === 'pass') passCount += 1;
      else buckets[status]?.push(toResultNode(element, outcomes[i]));
    });

    const ruleResult = {
      id: rule.id,
      impact: rule.impact,
      tags: rule.tags,
      help: rule.help,
      description: rule.help,
      helpUrl: rule.helpUrl,
    };
    if (draft30) {
      // Which draft guideline this 2.x rule speaks to (null for rules with
      // no draft counterpart, e.g. best-practice extras).
      ruleResult.wcag30 = wcag30Draft.guidelineForTags(rule.tags);
    }
    if (!elements.length) results.inapplicable.push({ ...ruleResult, nodes: [] });
    if (buckets.fail.length) results.violations.push({ ...ruleResult, nodes: buckets.fail });
    if (buckets.incomplete.length) results.incomplete.push({ ...ruleResult, nodes: buckets.incomplete });
    if (passCount) results.passes.push({ ...ruleResult, nodes: [], nodeCount: passCount });

    liveCounts[rule.impact] = (liveCounts[rule.impact] ?? 0) + buckets.fail.length;
    liveCounts.review += buckets.incomplete.length;
    if (buckets.fail.length) liveTypeCounts[rule.impact] = (liveTypeCounts[rule.impact] ?? 0) + 1;
    if (buckets.incomplete.length) liveTypeCounts.review += 1;
    const ms = Math.round((performance.now() - ruleStarted) * 10) / 10;
    results.ruleTimings.push({ rule: rule.id, ms, elements: elements.length });
    onProgress?.({
      done: ++completed,
      total: activeRules.length,
      rule: rule.id,
      ms,
      counts: { ...liveCounts },
      typeCounts: { ...liveTypeCounts },
    });
  }

  results.durationMs = Math.round(performance.now() - auditStarted);
  return results;
}
