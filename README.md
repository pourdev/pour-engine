# pour engine

The accessibility audit engine behind [pour.dev](https://pour.dev) — a
clean-room WCAG engine written from the W3C specifications. Zero
dependencies, runs entirely in the browser, returns structured per-rule
results with the exact failing elements and the evidence for each verdict.

## Rules & coverage

**WCAG only, by design.** The engine tracks the WCAG spec exclusively — no
Section 508, EN 301 549, or other standards. The full WCAG 2.2 catalog (all
86 success criteria) lives in `engine/wcag22.js`, and
[`engine/COVERAGE.md`](engine/COVERAGE.md) shows exactly which criteria are
automated, partially automated, or need human review. Rules pierce open
shadow DOM, callers can cover same-origin frames by running the engine per
document, and every result carries its WCAG criterion, severity, a CSS path
to the element, and an HTML snippet.

Automation has limits, and the engine is honest about them: criteria no tool
can verify are returned as a `manualReview` checklist instead of being
silently skipped, and findings the engine can't judge conclusively land in
`incomplete` rather than being guessed at.

An experimental WCAG 3.0 draft mode (`engine/wcag30-draft.js`) reframes
results against the draft's guidelines — clearly stamped as a draft, because
no tool can honestly claim conformance to an unfinished standard.

## Getting started

```sh
npm install pour-engine
```

```js
import { run, name, version } from 'pour-engine';

// Audit the current document (browser, extension content script, bookmarklet…)
const results = await run(document, {
  // optional: filter rules by tag. Tags are cumulative — WCAG 2.2 AA means
  // every A/AA rule from 2.0 through 2.2. Omit to run everything.
  tags: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'],
  // standard: 'wcag30-draft', // optional: experimental WCAG 3.0 draft mode
});

console.log(results.violations, results.passes, results.incomplete);
```

`run(context, options, onProgress)` accepts any Document (the top document
or an iframe's), an options object, and an optional progress callback
invoked before and after each rule — useful for live progress UI. Results
include `violations`, `passes`, `incomplete`, `inapplicable`,
`manualReview`, and per-rule timings.

## Philosophy

- **Spec-first.** Every rule and helper was written from the W3C
  specifications (WCAG, ARIA, accname), not from other tools' behavior.
  When a rule tightens, it tightens toward the spec.
- **Zero dependencies.** The engine ships nothing but its own code, so it
  can run anywhere a DOM exists — content scripts, bookmarklets, test
  harnesses — without bundling baggage or supply-chain surface.
- **No false authority.** A result is a violation only when the spec says
  so. Everything uncertain is `incomplete` or `manualReview`, never a guess
  dressed up as a finding.

## Supported environments

Any evergreen browser (the pour extension ships to Chromium; the bookmarklet
runs wherever it's dropped). The engine needs a live DOM — it does not parse
static HTML strings. For Node-based testing, drive it through a real browser
(Puppeteer/Playwright).

## Package contents

- `engine/index.js` — the runner: rule selection, scoping, timings, results.
- `engine/rules/` — one file per rule, named by criterion
  (`1.1.1-image-alt.js`), plus the catalog index.
- `engine/lib/` — shared helpers: DOM traversal, accessible-name
  computation, contrast math, role model.
- `engine/wcag22.js`, `engine/wcag30-draft.js` — the WCAG catalogs.
- `config/project.config.js` — package-local stand-in for the pour
  monorepo's project config (engine name + version only).

The `engine/` directory is a byte-identical copy of `src/engine/` in the
pour monorepo, which is the current source of truth — make changes there and
sync them here. The test suite (annotated testbed pages and the verification
runner) also lives in the monorepo and is not part of this package yet.

## License

Every rule and helper was written from the W3C specifications (WCAG 2.2,
WAI-ARIA, accname). Rule ids and tag names follow the vocabulary the
accessibility-tooling ecosystem already shares, so reports interoperate
with existing pipelines.

MIT — see [LICENSE](LICENSE).
