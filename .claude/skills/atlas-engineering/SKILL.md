---
name: atlas-engineering
description: Engineering conventions for the Kalinga Atlas — Astro islands, D3-geo map architecture, timeline, data contract, accessibility and performance budgets. Preloaded into the engineer agent. Use when implementing or changing anything under src/.
user-invocable: false
---

# Engineering the Kalinga Atlas

Stack: **Astro 5** (static output) + **React 19 islands** + **D3-geo v7** + **TypeScript strict**. Node 20.

## Ground rules

1. **No source, no render.** Pages get data only through `src/data/load.ts`, which returns `published` entries. Never import a JSON file directly in a page or island.
2. **Islands only in `src/islands/`.** Everything else is an `.astro` component that ships zero JS. Mount islands with `client:visible` (or `client:idle` for above-the-fold), never `client:load` without a reason in a comment.
3. **Tokens, not values.** Colours, spacing, type and motion come from `src/styles/tokens.css`. No inline hex.
4. **Every visual has a text equivalent.** Map: `figure` + `figcaption` + a list view of the same data elsewhere on the page. Icons: `<title>`/`<desc>`.
5. **Build must pass.** `npm run build` (which runs `validate:data` first) and `npm run check` before you finish.

## Data contract

- Schema: `src/data/schema.ts`. Types are exported; import them, do not redeclare.
- Loader: `src/data/load.ts` (`getPorts()`, `getRoutes()`, …). Add a getter there when a new collection appears.
- Citation formatting: `src/data/cite.ts`. Rendering: `src/components/SourcePopover.astro` and `EvidenceBadge.astro`. Reuse them; never format a citation by hand in a page.
- Islands receive already-filtered arrays as props (serialisable, no functions from Astro).

## Map architecture

Full detail: `${CLAUDE_SKILL_DIR}/map-architecture.md`. The shape:

```
<figure role="group" aria-label="…">
  <canvas>            land, rivers (Natural Earth TopoJSON via topojson-client + d3-geo path)
  <svg>               routes (path), ports/sites (g[role=button] tabindex=0), labels
  <div class="ctl">   zoom buttons, period name, legend
  <figcaption>        visually-hidden description
</figure>
```

- Projection: `geoMercator` (or `geoEquirectangular` if distortion at Sumatra/Java is acceptable), centred on ~[92, 12], fitted to the Bay of Bengal → Java extent on load.
- `d3-zoom` on the container; canvas redraws on zoom via a single `requestAnimationFrame`; SVG uses a `transform` on one root `<g>`.
- Keyboard: `+`/`-` zoom, arrows pan, `0` reset, `Tab` cycles ports/routes in `order` of the data, `Enter`/`Space` selects, `Esc` closes the panel. Document the keys in the legend.
- Geodata loads lazily with `fetch('/geo/land-50m.json')` inside the island, after mount, so it never blocks first paint.

## Timeline

`src/islands/Timeline.tsx` wraps a native `<input type="range">` so keyboard, touch and screen-reader semantics are free. D3 draws the axis and period bands *around* it. `aria-valuetext` always names the period and its years.

## Animation

- Route "flow": animate `stroke-dashoffset` on the SVG path with CSS; no JS timer.
- Ship along route: `getPointAtLength()` sampled per frame, duration `--dur-sail`, cancelled on period change or `prefers-reduced-motion`.
- Period switch: two layers cross-fade over `--dur-page`; do not remount the island.

## Performance budget

| Budget | Value |
|---|---|
| Initial HTML+CSS+JS on `/` | < 1.5 MB (target < 400 KB before geodata) |
| Island JS (React + D3 + app) | < 120 KB gzipped |
| Geodata | lazy, < 600 KB total, cached with long max-age |
| FCP on 4G | < 2 s |
| Lighthouse | ≥ 90 all four categories |

Check with `npm run build` output sizes and `/audit`.

## Accessibility checklist per component

- Landmarks and one `h1` per page; heading order never skips.
- All interactive elements reachable by keyboard with a visible `--focus-ring`.
- Colour is never the only signal (badges already handle this; mirror it in the map legend).
- `prefers-reduced-motion` respected (tokens zero durations; also skip JS animations).
- Touch targets ≥ 44 px.
- Test with a screen reader mentally: what does a blind user hear for this element?

## Conventions

- TypeScript strict, `noUncheckedIndexedAccess` is on: guard array access.
- Named exports everywhere except Astro pages and the island entry (`Atlas.tsx` default export is required by `client:*`).
- Path aliases: `@data/*`, `@components/*`, `@islands/*`, `@layouts/*`, `@styles/*`.
- Files: `PascalCase.astro/.tsx` for components, `kebab-case.ts` for modules.
- No new dependencies without noting bundle cost in your report.
