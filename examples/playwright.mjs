// Audit any URL with Playwright:  npm i pour-engine playwright
//   node examples/playwright.mjs https://example.com
// The engine is dependency-free ES modules, so the page can import it
// directly from a CDN. (Sites with a strict CSP can block CDN imports —
// serve the installed package's files from the page's own origin via
// request interception instead; no bundler needed either way.)
import { chromium } from 'playwright';

const url = process.argv[2] ?? 'https://example.com';

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(url, { waitUntil: 'load' });

const results = await page.evaluate(async () => {
  const { run } = await import('https://unpkg.com/pour-engine@1/engine/index.js');
  const report = await run(document, { tags: ['wcag2a', 'wcag2aa'] });
  return {
    violations: report.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.map((n) => ({ target: n.target[0], summary: n.failureSummary })),
    })),
    passes: report.passes.length,
    manualReview: report.manualReview.length,
  };
});
await browser.close();

console.log(`${url}: ${results.violations.length} rules failing, ${results.passes} passing, ${results.manualReview} criteria need a human`);
for (const violation of results.violations) {
  for (const node of violation.nodes) {
    console.log(`FAIL ${violation.id} (${violation.impact}) at ${node.target}\n  ${node.summary}`);
  }
}
