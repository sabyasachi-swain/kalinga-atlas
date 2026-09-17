# Kalinga Atlas: session handoff

Last updated 17 September 2026. Read this, then `CLAUDE.md`, then
`docs/design/improvement-plan-2026-09-16.md` — that plan is the work queue.

## Where things stand

The site is live and healthy at
`https://sabyasachi-swain.github.io/kalinga-atlas/` (base path `/kalinga-atlas`,
GitHub Pages, deploys on push to `main`).

| Check | State |
|---|---|
| `npm run check` | 0 errors, 0 warnings, 0 hints |
| `npm run build` | 113 pages |
| `npm run validate:data` | Valid, 0 warnings |
| `npm run readability` | All public copy at grade 7 or lower |
| Working tree | Clean except the owner's `additinal_sources_needs_review/` |

### Published data

| Entity | Total | Published | Draft |
|---|---|---|---|
| Sources | 44 | — | 0 unapproved |
| Periods | 11 | 11 | 0 |
| Ports | 32 | 32 | 0 |
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

1. ~~**Phase 1, engineer — stop confusing the visitor.**~~ **Done 17 September**
   (commit `3b1c249`), except §1.5. Fact card off the map; the slider really
   filters, with step, Play and a live count; focus-on-select, "Show only this
   route" and a "Show on the map" filter (§1.2b, added from owner feedback
   mid-phase); borders in both views, region and sea labels, scale bar, north
   arrow. §1.3 did **not** deliver named middle stops — see "The route-stops
   finding". §1.5 (hover states, opening zoom, hint target) is still open.
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

## Decisions — all four settled, 17 September

1. **Two sources approved.** `kingwell-banham-2018-antiquity-mantai` and
   `bellina-2018-antiquity-myanmar-ports` are `approved_by_human: true`, the
   reason recorded in each source's `note`. `mahatittha` and `maliwan` are
   published. **`src/data/` now has no drafts at all.** Build is 113 pages.
2. **Photographs: no.** The atlas stays original SVG. No licensing review.
3. **Odia: yes**, for a later phase. Noto Sans Oriya is already bundled.
4. **The four Ashoka edict routes: keep.** The period filter and the new
   "Show on the map" filter are what stop them dominating a maritime view.

## Known rough edges

- **Phase 1.5 was not built.** Pointer/hover states on every marker and route,
  the overview-to-detail opening zoom, and the check that the first-load
  "Tap a glowing dot" hint points at a real active marker. The default coast
  view still opens showing only two pins and a cluster, which is exactly what
  the opening zoom was meant to soften.
- **No route can name a middle stop, and that is now a data problem.** See
  "The route-stops finding" below. Do not re-attempt this in code.
- Thin periods: Gajapati has 0 routes and 0 sites, Bhauma-Kara 0 routes,
  Kharavela and Gupta 0 goods, Mughal-Maratha 0 sites. British has 22 goods.
- `src/data/cite.ts`'s `year()` drops the month, so the two Patnaik 2014 papers
  render identically and cannot be disambiguated as 2014a/2014b without
  changing the function and its call sites.
- Routes blocked for want of an endpoint entity: Maldives and Arakan cowrie
  runs. Rangoon cannot stand in for Arakan.

## The route-stops finding — read before touching §1.3 again

The improvement plan said the waypoints were already there and "the fix is
labelling, not geometry". That was wrong, and it took a near-miss to find out.

`Route.waypoints` is a bare `{lat, lng}[]` with no labels and **no sourcing**.
A first implementation matched each intermediate waypoint to any port or site
within 25 km and listed the hits under the heading "Stops along the way". That
put Radhanagar and the Ratnagiri/Lalitgiri Buddhist complex on
`route-cuttack-chandbali-canal` — a 19th-century steamer canal whose own
`caveats` field says the waypoints "were read off a modern map" — with no
caveat shown, because the bend count was zero. It also matched intermediates to
the route's *own* endpoints, which silently suppressed the approximate-course
note.

**The word "schematic" appears in 31 of the 32 route caveats.** Nearly every
route on this map declares its own drawn line to be a schematic. So no route
can honestly name an intermediate stop from the data we have.

`src/lib/route-stops.ts` now matches at 5 km, never to the route's own
`from`/`to`, and suppresses intermediate names entirely for any route whose
caveats match `/schematic|read off a modern map|not a surveyed|inference|
approximate/i`. Today that is all 32 routes: every panel lists its two sourced
termini under the heading "Route" and says "The drawn course between them is
approximate." Bends are drawn as unlabelled dots.

**Naming real stops is researcher work, not engineering.** It needs sourced
intermediate ports per route. Until that exists, leave this alone — and never
loosen the tolerance or the caveat filter to make the feature "work".

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
- **Measure the thing you are claiming.** An engineer reported "2 renders per
  20-step zoom" from a React commit counter, which counts React commits, not
  canvas repaints. Patch `stroke`/`fill`/`drawImage`/`clearRect` on both
  `CanvasRenderingContext2D` and `OffscreenCanvasRenderingContext2D` with
  `page.evaluateOnNewDocument` before the page loads. The real figure is 1
  vector repaint and 20 cache blits — the conclusion was right, the method
  didn't support it.
- **A pin's footprint is its 22px circle, not its 44px hit box.** The
  coordinator reported two label-over-pin overlaps that did not exist, because
  the probe used each marker's `HIT_RADIUS` rectangle. The engineer's "could
  not reproduce" was correct. Verify the verifier.
- **Screenshots find what probes cannot.** Every defect in the second review
  round — a button overflowing its card, citations splitting into two ragged
  columns, a fact card taller than the map it explained, a caption running
  across India — came from looking at a PNG, not from a number.
- **Sourcing bugs hide inside working features.** The §1.3 stop-naming code
  passed every geometric probe and still fabricated history. When a feature
  turns data into a claim, read the data next to the rendered output.
- **Local URLs.** Dev runs at `http://localhost:4321/kalinga-atlas/`; plain
  `localhost:4321/` is a 404. `scripts/serve-dist.mjs` serves `dist/` at the root,
  so use a base-prefixed server for browser checks. Never run two `astro dev`
  instances: they fight over `.astro/data-store.json` and the loser serves 500s
  while still rendering the page.
- **Kaspersky** injects ~850 KiB into plain-HTTP localhost pages and ruins local
  Lighthouse scores. Measure only against a proper `dist/` server.

## Prompt to start the next session

```
Read HANDOFF.md, CLAUDE.md and docs/design/improvement-plan-2026-09-16.md,
including "The route-stops finding" — do not re-attempt named route stops in
code. Start Phase 2: delegate to a Sonnet editor to write the 47 missing
narratives (20 routes, 14 goods, 11 ports, 2 sites), grade 7 or lower, one
citation per paragraph, and to sweep existing copy for hedging where the entry
is Confirmed or Strongly Supported. Never hedge in prose; the tier badge
carries the uncertainty, and Hypothetical gets "Scholars are not sure" in plain
words. Run two agents at most with incremental writes. Verify with
npm run readability and /fact-check, then commit yourself — agents must not
commit or push.
```

### Also open

- **§1.5**, the rest of Phase 1: pointer/hover states on markers and routes,
  the overview-to-detail opening zoom, and checking the first-load hint points
  at a real active marker.
- **Sourced route geometry**, if named middle stops still matter to the owner.
  That is a researcher task: intermediate ports per route, with citations.
- **Phase 5 audit.** Lighthouse last ran 15 September, before everything since.
