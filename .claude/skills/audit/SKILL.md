---
name: audit
description: Build, preview and audit the site for accessibility and performance (Lighthouse, all four categories), write a dated report to docs/audits/, and list blocking issues. Use for "run the audit", "check Lighthouse", "is it accessible", or the launch phase.
context: fork
agent: qa-auditor
model: haiku
---

Run the launch audit. Do not edit any source file; you produce a report.

## Steps

1. `npm run build` (this also validates the data). If it fails, stop and report the error verbatim.
2. Start the preview server in the background: `npm run preview` (default http://localhost:4321). Wait until it answers (`curl -s -o /dev/null -w "%{http_code}" http://localhost:4321` returns 200; retry a few times).
3. `npm run audit:lighthouse` for the home page; then run Lighthouse again for `/sources` with `--output-path=./docs/audits/lighthouse-sources`.
4. Read the JSON reports and extract: the four category scores, FCP, TTI, total byte weight, and every accessibility audit with score 0 (these are the axe-core rule failures).
5. Stop the preview server.
6. Write `docs/audits/YYYY-MM-DD.md` (today's date) with:
   - Score table per page (performance, accessibility, best practices, SEO) and pass/fail against ≥ 90.
   - FCP, TTI, page weight vs targets (< 2 s, < 3 s, < 1.5 MB).
   - Accessibility failures: rule id, impact, element snippet, count.
   - Performance opportunities with estimated savings, top 5.
   - A **Blocking** list (anything that keeps a score < 90 or is an axe serious/critical issue).
7. Append a one-line entry to `docs/audits/README.md` (create it if missing) linking the report.

## Report back

The score table, the blocking list, and the path of the report file. Keep it under 30 lines. Do not propose code changes; the orchestrator opens a build phase for that.

If Chrome is not available on the machine, say so and print the exact Lighthouse error so the user can install Chrome or set `CHROME_PATH`.
