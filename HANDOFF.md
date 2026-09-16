# Kalinga Atlas: session handoff

Last updated 16 September 2026. Read this, then `CLAUDE.md`, then
`docs/design/improvement-plan-2026-09-16.md` — that plan is the work queue.

## Where things stand

The site is live and healthy at
`https://sabyasachi-swain.github.io/kalinga-atlas/` (base path `/kalinga-atlas`,
GitHub Pages, deploys on push to `main`).

| Check | State |
|---|---|
| `npm run check` | 0 errors, 0 warnings, 0 hints |
| `npm run build` | 111 pages |
| `npm run validate:data` | Valid, 0 warnings |
| `npm run readability` | All public copy at grade 7 or lower |
| Working tree | Clean except `docs/design/improvement-plan-2026-09-16.md` and the owner's `additinal_sources_needs_review/` |

### Published data

| Entity | Total | Published | Draft |
|---|---|---|---|
| Sources | 44 | — | 2 unapproved |
| Periods | 11 | 11 | 0 |
| Ports | 32 | 30 | 2 |
| Routes | 32 | 32 | 0 |
| Goods | 27 | 27 | 0 |
| Sites | 9 | 9 | 0 |
| Inscriptions | 5 | 5 | 0 |
| Facts | 14 | 14 | 0 |

## What changed on 16 September

Eleven commits. The important ones:

- **A base-path bug that had broken the live site was found and fixed.**
  `import.meta.env.BASE_URL` has no trailing slash, so every `${base}path`
  template produced `/kalinga-atlasports/`. Every nav link 404'd and the map
  requested `/kalinga-atlasgeo/land-50m.json`, so the deployed map had no
  coastline. A shared `withBase()` helper in `src/lib/base-url.ts` now joins
  with exactly one slash and is used at every call site. **Never reintroduce a
  raw `${base}` template.** It came in with commit `2b30bc2`, not from the kid
  passes.
- **The map view fits were badly broken.** A degenerate single-point bounding
  box (any period with one active Kalinga port) zoomed ~500x and threw markers
  thousands of pixels off-screen; the phone dialog never refit after the portal
  moved the map. Both fixed, plus a later regression where `refitCurrentView`
  returned early on `viewMode === 'manual'`, silently skipping every refit after
  the first pan.
- **The palette moved from navy/parchment to a light atlas.** The sea was
  `#cfe3e8` against `#f2eee6` land — a 1.15:1 luminance ratio, which read as one
  washed-out field. It is now `#7eb8cf`, giving 1.88:1 plus a blue-to-cream hue
  jump. Values and computed contrast live in `docs/design/tokens.md`.
- **Layout rebuilt** per `docs/design/atlas-layout.md`: period names moved out of
  the SVG into real focusable chip buttons (4 of 11 were blank at 1280, all 11 at
  380), the legend became a "Map key" popover instead of a 324 px block wedged
  between map and timeline, the timeline now sits directly under the map, and the
  fact card is debounced 500 ms so scrubbing no longer fires one card per period.
- **Data grew from 64 to 111 pages**: 12 ports, 20 routes, 14 goods, 2 sites and
  3 route endpoints added, all with page-verified citations.
- **Fonts moved into the bundle** (`src/assets/fonts/`) so their URLs carry the
  base path, with the OFL licence texts still served from `public/fonts/`.

## The work queue

`docs/design/improvement-plan-2026-09-16.md` is the plan, written from owner
feedback and checked against the code first. In order:

1. **Phase 1, engineer — stop confusing the visitor.** Move the fact card off
   the map; make the slider actually filter (hide other centuries, add step and
   Play controls, show a live route/port count); name the stops on each route;
   give the map orientation (borders always on, country and sea labels, scale
   bar, north arrow); add an overview-to-detail opening zoom.
2. **Phase 2, editor — writing.** 47 published entities have no narrative: 20
   routes, 14 goods, 11 ports, 2 sites. Also: never hedge in prose; the tier
   badge carries uncertainty, and anything Hypothetical gets "Scholars are not
   sure" in plain words.
3. **Phase 3, engineer and designer — the kid magnet.** "Sail this route" (a
   ship travelling the waypoints, pausing at each named stop with one sourced
   line) is the highest-value single feature. Then the logbook and stamps,
   Disha the Compass, icons for every good, and the "Start your voyage" intro.
   **All ten illustrations already exist in `src/assets/kids/` and have never
   been used.**
4. **Phase 4 — a real `/timeline` page.** It does not exist; the nav link is an
   anchor to `#timeline` on the home page, which is why the two feel identical.
5. **Phase 5, qa-auditor — verify.** Lighthouse last ran 15 September, before
   everything above.

## Decisions waiting on the owner

1. **Approve two sources** — `kingwell-banham-2018-antiquity-mantai` and
   `bellina-2018-antiquity-myanmar-ports`, both 2018 *Antiquity* excavation
   reports fetched and read in full. This publishes `mahatittha` and `maliwan`,
   the only two remaining drafts. Run
   `npm run merge:sources -- --approve "<reason>"`. **An agent must never flip
   `approved_by_human`.**
2. **Photographs?** The site has none, only original SVG. CC-BY museum or
   Wikimedia artefact images would help enormously; it is a licensing decision.
3. **Odia language?** Noto Sans Oriya is already bundled and reserved.
4. **The four Ashoka edict routes** (Dhauli and Jaugada to Ujjayini and
   Takshashila) draw as 1,400–2,600 km schematic lines to the west and may
   dominate a maritime map. Keep, or restrict the atlas to trade routes?

## Known rough edges

- The fact card now sits over the middle of the map. Phase 1.1 moves it out.
- Thin periods: Gajapati has 0 routes and 0 sites, Bhauma-Kara 0 routes,
  Kharavela and Gupta 0 goods, Mughal-Maratha 0 sites. British has 22 goods.
- `src/data/cite.ts`'s `year()` drops the month, so the two Patnaik 2014 papers
  render identically and cannot be disambiguated as 2014a/2014b without
  changing the function and its call sites.
- Routes blocked for want of an endpoint entity: Maldives and Arakan cowrie
  runs. Rangoon cannot stand in for Arakan.

## Rejected material — do not resurrect

`additinal_sources_needs_review/` contains four JSON files supplied by the
owner. **All four are rejected.** Every DOI they cite returns "DOI Not Found"
from doi.org and every deep locator 404s, while control DOIs and archive.org
items resolve fine from this machine. Two researchers then independently found
their specific claims unsupportable: no ceramics source uses the word "Islamic",
and Chandrabhaga is the Konark beach, not a Chilika landing. Full evidence in
`docs/research/rejected-sources-2026-09-16.md`. They may be mined for *topics*
only; never cite them.

## Working rules learned the hard way

- **Agents must not commit or push.** Three agent commits and two unrequested
  pushes happened on 16 September despite explicit instructions in every brief.
  Agent commits carry the owner's git identity, so they are invisible unless you
  check for the `Co-Authored-By` trailer. The orchestrator commits after
  verifying. Consider a PreToolUse hook blocking `git commit`/`git push` from
  subagents, the way `.claude/hooks/no-opus-subagents.mjs` blocks Opus.
- **Usage limits.** Four parallel agents were killed three times in one day. Run
  **two at most**, and require **incremental writes** — 3 or 4 entries, validate,
  continue — so a kill costs one batch, not the session. Resume a dead agent with
  `SendMessage`, never a fresh spawn; check what it wrote to disk first.
- **Verify every agent claim.** An engineer reported 0 overlaps while 1 of 6
  active pins was inside the canvas; screenshots showed a nearly empty map. Run
  the probes in the scratchpad (`rect-probe.mjs`, `overlap-probe.mjs`,
  `final-check.mjs`) against `dist/`, and look at the screenshots.
- **External models: escalate past the free tier for review.**
  `cohere/north-mini-code:free` produced **0 valid findings from 6** — it invented
  missing cleanups that demonstrably exist, then emitted seventeen duplicate
  entries until it hit the token ceiling. `dots-studio/dots-3-note-preview:free`
  returned HTTP 400. `deepseek/deepseek-v4.1-flash` at **$0.0126** found three
  real bugs, all confirmed. Free models are fine for inventory and extraction;
  verify everything regardless. An external model is never a source.
- **Local URLs.** Dev runs at `http://localhost:4321/kalinga-atlas/`; plain
  `localhost:4321/` is a 404. `scripts/serve-dist.mjs` serves `dist/` at the root,
  so use a base-prefixed server for browser checks. Never run two `astro dev`
  instances: they fight over `.astro/data-store.json` and the loser serves 500s
  while still rendering the page.
- **Kaspersky** injects ~850 KiB into plain-HTTP localhost pages and ruins local
  Lighthouse scores. Measure only against a proper `dist/` server.

## Prompt to start the next session

```
Read HANDOFF.md, CLAUDE.md and docs/design/improvement-plan-2026-09-16.md.
Start Phase 1: delegate to a Sonnet engineer to move the fact card off the
map, make the period slider hide other centuries and gain step/Play controls
with a live route count, name the intermediate stops on each route, and give
the map orientation (borders always on, country and sea labels, scale bar).
Keep the speed architecture, withBase() for every URL, 0 pin/label overlaps
and 2 or fewer renders per 20-step zoom. Verify against dist/ with the probes
in the scratchpad, then commit yourself — agents must not commit or push.
```
