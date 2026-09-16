# Kalinga Atlas: session handoff

Last updated 15 September 2026. Read this first in a new session, then `CLAUDE.md`.

## Where things stand

The site is complete as a content-rich static atlas and deploys to GitHub Pages. The remaining work is a better experience for children: an easier map and features that reward exploring.

| Check | State |
|---|---|
| Working tree | Clean; everything committed on `main` |
| `npm run check` | 0 errors, 0 warnings |
| `npm run build` | 64 pages |
| `npm run validate:data` | Valid, 0 warnings |
| `npm run readability` | Every narrative at grade 7 or lower |
| `[NEEDS VERIFICATION]` markers | 0 |
| Deployment | GitHub Pages at `https://sabyasachi-swain.github.io/kalinga-atlas`, base path `/kalinga-atlas` |

### Published data

| Entity | Count |
|---|---|
| Sources (all approved) | 42 |
| Periods | 11 |
| Ports (12 Kalinga, 7 destinations) | 19 |
| Routes | 12 |
| Goods | 13 |
| Sites | 7 |
| Inscriptions | 5 |
| Facts ("Did you know?") | 14 |
| Narrative files | 75 |

### What is built

- **Research.** Every entry cites a page-verified source and carries an evidence tier. Research notes are in `docs/research/`. Promotions to published are logged in `docs/research/status-log.md`.
- **Fact-checking.** An Opus pass flagged 49 claims across 33 narratives; all were corrected or cut. A later sweep removed every superlative the sources don't support. The log is `docs/research/fact-check-log.md`.
- **Design.** Specs in `docs/design/`, 34 original SVGs in `src/assets/`, attribution in `docs/attribution.md`.
- **Map and timeline.** D3-geo canvas basemap with an SVG overlay, keyboard model, ship animation, cargo manifest, fact toast, detail panel.
- **Map speed.** A 20-step zoom now renders the map once instead of 20 times, and the basemap draws from a cached image during gestures. Geodata was cut from 1.3 MB to 144 KB.
- **Pages.** Home, section indexes, detail pages for every entity type, sources, attribution and 404.
- **Accessibility.** Lighthouse accessibility 98 to 100. The two failures it reported, a disallowed role on the map and heading order on index pages, are fixed.
- **Tooling.** `validate-data`, `readability`, `fetch-geo`, `merge-sources`, `set-status`, and `serve-dist`, a gzip server for honest local Lighthouse runs.

## Next action plan

Do these in order. Each pass edits the same files as the next, so do not run them in parallel.

### 0. Finish the model-routing config change (done 15 September 2026)

Done: researcher on Sonnet with OpenRouter tools, the three tasks exist in `model-routing.json`, CLAUDE.md rewritten, and the `no-opus-subagents` hook uses a plain `command` string. The notes below are kept for the record.

**The policy is decided:** Opus runs only in the main session. No agent or forked skill uses Opus. Agents draft through OpenRouter where it is cheaper and as good, and spend Claude tokens on checking. Built-in agents such as Explore, general-purpose and Plan must be given `sonnet` or `haiku` explicitly.

The agent and skill files were moved to this setup late in the session, and the migration is only partly done. Checked on 15 September 2026, these mismatches remain. A new session will trip over them, so fix them first.

| Mismatch | Where | Fix |
|---|---|---|
| `model: opus` | `.claude/agents/researcher.md` frontmatter | Change to `model: sonnet`, and keep its high effort |
| Has an "OpenRouter first" section but no OpenRouter tools, so it cannot call them | `researcher.md` `tools:` line | Add `mcp__openrouter__pick_model`, `ask_model`, `review_code`, `compare_models` and `list_models`, as in `editor.md` |
| Agents and skills name routing tasks that don't exist: `extract_claims`, `draft_prose` and `audit_summary` | researcher, editor, qa-auditor, and the `phase` skill | Add those three tasks to `tools/openrouter-mcp/model-routing.json`. It currently only defines `code_review`, `summarise_extract`, `draft_code`, `debug_second_opinion`, `compare_perspectives` and `quick_question`, so `pick_model` fails for the missing ones |
| Still routes work to Opus | `CLAUDE.md` lines 59, 61, 68 and 70, and the routing principle on line 74 | Rewrite the agent and skill tables and the principle to match the decided policy |

When done, grep `.claude/` and `CLAUDE.md` for "opus": it should appear only where it says the main session.

### Progress on 16 September 2026 (uncommitted until verified)

- **Kid pass 1** is built (A1–A4, B6) in `AtlasMap.tsx`, `Atlas.tsx`, `DetailPanel.tsx` and `atlas.css`. Check and build passed, and a 20-step zoom caused 1 render. The first screenshots showed markers and labels hidden under the map's top chrome and overlapping at 380 px. A fix is in progress: fit inside the free area, cluster at every view, and count overlaps.
- **New look, chosen by the owner:** a light, calm map like the one at itihaas.ai/en/maps/ahom-kingdom. Pale sea and cream land drawn from Natural Earth (no tiles), the map in a white card, round coloured pins with white glyphs, a cream page and a dark header. It replaces navy and parchment. The designer wrote `tokens.css` values (names kept), `docs/design/tokens.md` with computed contrast, `docs/design/map-style-light.md`, and three pin glyphs in `src/assets/ports/`. The legend stays as the restyled left rail, not a floating card. CLAUDE.md, the `design-system` skill and `designer.md` are updated to match. The engineer is applying the style and replacing the hard-coded colours in `atlas.css` and `AtlasMap.tsx`.
- **Pre-existing bug found on 16 September, now top priority:** `import.meta.env.BASE_URL` is `/kalinga-atlas` with **no trailing slash**, so every `${base}path` template joins into one word. `dist/index.html` and the **live site** both carry `/kalinga-atlasports/`, `/kalinga-atlasgoods/`, `/kalinga-atlasfavicon.svg` and the rest, and the live island bundle requests `/kalinga-atlasgeo/land-50m.json`. So on the deployed site every nav link 404s and the map has no coastline; the pages themselves exist at the correct URLs. It came in with commit 2b30bc2 "Fix GitHub Pages navigation paths", not from the kid passes. Fix once with a shared `withBase(path)` helper used at every call site (`Base.astro`, `404.astro`, `index.astro`, `attribution.astro`, the `[id].astro` pages, `EntityCard.astro`, `AtlasMap.tsx:332-333`), then verify **both** dev and `dist/`: `grep -r "kalinga-atlas[a-z]" dist/` must return nothing.
- **Layout and timeline spec, 16 September:** `docs/design/atlas-layout.md` (730 lines) answers six problems the owner reported: the fact toast refiring per period and competing for screen space, period chips rendering blank (4 of 11 at 1280, 11 of 11 at 380), the legend's 324 px wedged between map and timeline, the slider sitting 888 px below the map top, the map card being only 58% canvas, and modern country outlines for orientation. It moves period names out of the SVG into real HTML chips, turns the legend into a "Map key" popover, anchors the toast inside the map card with a 500 ms settle debounce, and enlarges the map. Its "What the engineer must change" list names every file. Three decisions the orchestrator made: period chips **are** individually focusable buttons; the 500 ms debounce and the short-viewport pill threshold ship as specced and get checked once built; the legend becomes the popover rather than a side rail.
- **Font URLs miss the base in dev (low priority).** `src/styles/tokens.css` declares `src: url('/fonts/EBGaramond-Variable.woff2')` and the two other faces the same way. Astro rewrites these correctly in the build (`dist/` CSS reads `/kalinga-atlas/fonts/…`), but the dev router logs `Request URLs for public/ assets must also include your base` on every page load and serves no font, so local pages render in fallback faces. Fix with a base-aware font URL that works in both, and keep the fonts self-hosted.
- **Historical boundaries stay out:** modern country outlines are allowed as a faint, zoom-gated, `aria-hidden` layer captioned "modern borders, not a historical claim". Any ancient empire or kingdom extent is a sourced claim needing a researcher and a schema entity, and is not to be drawn by a designer or engineer.
- **Committed on 16 September:** `8e2f007` (base-path `withBase` helper, light restyle, design specs, kid pass 1 map work) and `0e1c6e6` (coast-view over-zoom and phone-dialog blank map). Verified against `dist/` before committing: active port inside the canvas at 1280 and 380, **0 pin and label overlaps** in both views, 2 renders per 20-step zoom, all links and geo files 200, no bad joins in `dist/`, check and build clean. **Nothing is pushed**, so the live site still has the broken links and blank map until someone pushes.
- **Agents must not commit.** The engineer agent created `8e2f007` despite "Don't commit" in its brief. Agent commits carry the repo owner's git identity, so they are easy to miss. The orchestrator commits, after verification, with a message describing what was actually checked.
- **Open defect: sea and land are nearly indistinguishable.** `--map-sea` `#cfe3e8` against `--map-land` `#f2eee6` is a luminance ratio of **1.15:1**, so the map reads as one washed-out cream field — a large part of why the map looks empty. The designer is choosing new map-surface values (and re-checking labels, routes, markers, cluster, borders hairline and focus ring against both new surfaces); the engineer applies them and must not pick them itself.
- **In flight:** the engineer is implementing `docs/design/atlas-layout.md` — HTML period chips, the Map key popover, timeline directly under the map, a bigger map, the fact toast anchored inside the map card with a 500 ms settle debounce, a lazily loaded and bbox-trimmed modern-borders layer from the 756 KB `countries-50m.json`, the two new tokens, and the font-URL base fix.

### 1. Kid pass 1: easier map (in progress, see above)

The last attempt stopped on a usage limit before changing any file, so start fresh.

- **Model:** Sonnet engineer.
- **Spec:** `docs/design/kid-experience.md`, sections A1, A2, A3, A4 and B6, all marked must.
- **Problems it fixes, verified in the code:**
  - The map opens on the whole Bay of Bengal to Java, so the 12 Odisha ports crowd together and their labels are hidden.
  - Wheel zoom only works with Ctrl held, and double-click zoom is off.
  - On phones, dragging vertically scrolls the page instead of panning the map.
- **Build:**
  - A1: open fitted to the Kalinga ports, computed from their coordinates, with "Show the Odisha coast" and "Show the whole ocean" buttons.
  - A2: plain wheel zoom over the map, with a dismissible hint.
  - A3: below 600 px, a preview plus an "Explore the map" button that opens a full-screen map dialog.
  - A4: bigger markers, permanent labels at the default view, cluster bubbles in the whole-ocean view.
  - B6: the spec's friendlier wording for controls. Never change historical text.
- **Must keep:** the speed architecture. The live zoom transform stays in `liveTransformRef` and is applied to the DOM directly, React state commits only on the zoom `end` event, and the basemap is blitted from the offscreen cache mid-gesture. Also keep the keyboard model, focus return, badges and citations, and reduced-motion handling.
- **GitHub Pages base path:** every new link and fetch must use `import.meta.env.BASE_URL`, never a root-relative `/path`.
- **Done when:** a browser check at 1280 px and 380 px confirms each item, a 20-step zoom still causes at most two map renders, and check and build pass. `chrome-launcher` and `puppeteer-core` are already installed as Lighthouse dependencies. Use `node scripts/serve-dist.mjs 4399` to serve the build.

### 2. Kid pass 2: engagement (after pass 1)

- **Model:** Sonnet engineer.
- **Spec:** the same file, sections B1, B3, B4 (should), then B2 and B5 (could).
- **Build:**
  - B1: a skippable "Start your voyage" intro of three or four steps, remembered in localStorage.
  - B3: a ship's logbook that stamps each port, good and route a child opens, with a progress count, in localStorage.
  - B4: stamp visuals and small celebrations, off under reduced motion.
  - B2: a treasure-hunt quest whose questions are generated only from existing fields such as `port.goods`, `route.from` and `route.to`. A question is only asked when the data supports its answer, and wrong answers get a kind response.
  - B5: Disha the Compass, a guide who only points to things and never states history.
- **Assets:** already drawn in `src/assets/kids/`. Tokens are already in `tokens.css`.
- **Rule:** no invented history. Anything historical still shows its evidence badge and citation.

### 3. Verify and close

1. Run check, build, validate and readability.
2. Browser smoke test of both passes at 1280 px and 380 px.
3. Optional: a Haiku Lighthouse run through `npm run serve:dist` and `npm run audit:lighthouse`. The owner considers current scores fine.
4. Commit and push, then confirm the Pages deploy.

### Optional research follow-ups

Low priority. Each needs a researcher, and nothing on the site is wrong without them.

- `goods > elephants`: add Stirling 1825, p. 182 to restore a cut scholar note.
- `palur`: find a page citation for the Dantapura identification.
- `hariharpur`: cite Hunter 1872 for the Hariharpur and Harishpur ambiguity.
- `khalkatapatna`: cite who built the Konark Sun Temple, if the narrative should say.
- Two Patnaik 2014 papers render the same short citation; disambiguate as 2014a and 2014b in `cite.ts`.
- False Point is a well-documented colonial port still missing from `ports.json`.

## Working rules learned this session

- **Cost.** Opus only in the main session; never pass `model: opus` to an agent. Sonnet for building, writing, research and fact-checking. Haiku for audits. Until step 0 is done, `researcher.md` still defaults to Opus, so pass `model: sonnet` when delegating to it. Prefer an OpenRouter model whenever it costs less and does as well.
- **Usage limits.** Several parallel agents hit the Pro session limit three times. Prefer one agent at a time. When an agent dies, check what it wrote to disk before rerunning; work usually survives. Resume a dead agent with SendMessage rather than spawning a new one.
- **OpenRouter.** Use `pick_model(task)`, pass `file_paths`, and verify every finding against the code before acting. Free models were useful but wrong often. They called Kaspersky scripts a site bug, and five of seven map-review claims were false. Never use them for history.
- **Kaspersky.** It injects about 850 KiB of scripts into plain-HTTP localhost pages, which ruins local Lighthouse scores. Measure only with `serve:dist`, and keep the blocked Kaspersky URL pattern in the audit scripts.
- **Local URLs.** The site builds with base `/kalinga-atlas`, so dev runs at `http://localhost:4321/kalinga-atlas/`, and plain `localhost:4321/` returns 404. `scripts/serve-dist.mjs` serves `dist/` at the root, so asset URLs break under it. Put `dist/` behind a `/kalinga-atlas` prefix for browser checks. On 16 September a leftover `astro preview` on `[::1]:4321` answered `localhost` in place of the dev server and made the site look unstyled and broken. Check with `netstat -ano | grep 4321` before debugging "broken" pages.
- **Editors can reintroduce errors while fixing others.** After any content edit, sweep for superlatives such as busiest, biggest and greatest, and for paragraphs that make a historical claim without a closing citation.

## Prompt to start the next session

```
Read HANDOFF.md and CLAUDE.md. First do step 0: finish the model-routing
config so no agent or skill uses Opus and every named OpenRouter task exists.
Then start Kid pass 1: delegate to a Sonnet engineer using
docs/design/kid-experience.md sections A1-A4 and B6, keep the map speed
architecture and the GitHub Pages base path, verify in a browser at 1280px
and 380px, then commit.
```
