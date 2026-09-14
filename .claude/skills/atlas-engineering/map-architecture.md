# Map architecture

## Why D3-geo and not a tile map

- No tile server, no API key, no ODbL attribution surface, no network waterfall of 30 tiles.
- One TopoJSON land file (~200 KB) draws the whole Indian Ocean rim; that is the whole basemap.
- Full control of the look: parchment land on navy sea, hand-lettered labels, rhumb-line ornament.
- Every port and route is an SVG element, so it is focusable, labelled and styleable with CSS.

## Layers (bottom to top)

| Layer | Tech | Source | Notes |
|---|---|---|---|
| Sea | CSS background | tokens | `--map-sea` |
| Graticule + ornament | canvas | d3.geoGraticule | faint, decorative, `aria-hidden` |
| Land | canvas | `/geo/land-50m.json` | fill `--map-land`, stroke `--map-land-edge` |
| Rivers | canvas | `/geo/rivers-50m.json` | filter to bbox; stroke `--map-river` |
| Historical coastline (optional) | svg path | `src/data/coastlines.json` (future) | dashed, labelled "Approximate reconstruction", carries its own source |
| Routes | svg `<path>` | `routes.json` waypoints → `geoPath` on a LineString | class by `mode` and `evidence_level` |
| Sites | svg `<g role=button>` | `sites.json` | square marker |
| Ports | svg `<g role=button>` | `ports.json` | circle marker + glow |
| Labels | svg `<text>` | ports/sites | halo via `paint-order: stroke` |
| Ship | svg `<use>` | `src/assets/ships/*.svg` | animated along selected route |

## Projection and extent

```ts
const projection = geoMercator();
const bbox: GeoJSON.Feature = { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[60, -12], [120, -12], [120, 30], [60, 30], [60, -12]]] }, properties: {} };
projection.fitExtent([[24, 24], [width - 24, height - 24]], bbox);
const path = geoPath(projection);
```

Recompute on resize with a `ResizeObserver`; debounce redraw to one frame.

## Zoom and pan

`d3-zoom` with `scaleExtent([1, 12])`. On zoom event:
- canvas: `ctx.setTransform(k, 0, 0, k, x, y)` then redraw; keep stroke widths visually constant by dividing by `k`.
- svg: set `transform` on the root `<g>`; markers use `vector-effect: non-scaling-stroke` and a counter-scale so dots do not balloon.

Keyboard handler on the `figure` (tabindex=0): `+`/`=` zoom in, `-` out, arrows pan 40 px, `0` reset, `?` opens the keys legend.

## Focus order and selection

- Markers are `<g role="button" tabindex="0" aria-label="Manikapatna, port, Gupta period, Probable, archaeological">`.
- `Tab` order follows the array order from `load.ts` (sorted by `name` unless a `display_order` is added later).
- `Enter`/`Space` fires `onSelect({kind, id})`; the parent opens `<PortPanel>` (Astro-rendered content injected via a `<template>` per entity, so panel text stays static HTML and needs no client fetch).
- `Esc` closes the panel and returns focus to the marker.

## Period filtering

Islands receive all published ports/routes/sites once. Filtering by `activePeriod` happens in React; inactive markers get `data-inactive` and fade to 40 % over `--dur-page`. Never remount the SVG on period change.

## Data flow

```
src/data/*.json ──validate-data.ts──▶ load.ts (published only) ──▶ index.astro ──props──▶ Atlas.tsx
                                                                                      ├─▶ AtlasMap.tsx (canvas + svg)
                                                                                      └─▶ Timeline.tsx (range input + d3 axis)
public/geo/*.json ──fetch after mount──▶ AtlasMap.tsx
```

## Testing the map manually

1. `npm run dev`, open `/`, tab from the skip link: focus should reach the figure, then each marker, then the timeline.
2. Press `?` for keys; `+` twice; arrows; `0`.
3. Switch periods with the slider: markers fade, nothing remounts (check React DevTools or the absence of flicker).
4. Turn on reduced motion in the OS: no dash animation, no ship animation, instant period switch.
5. Screen reader: the figure announces its label; each marker announces name, kind, period, tier and type.
