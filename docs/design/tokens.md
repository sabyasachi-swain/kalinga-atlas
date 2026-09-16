# Design tokens

Canonical values live in `src/styles/tokens.css`. This page records what
changed for the **light map style** (docs/design/map-style-light.md) and
every contrast ratio, computed with the standard WCAG relative-luminance
formula (sRGB → linear, `L = 0.2126R + 0.7152G + 0.0722B`,
`contrast = (L1+0.05)/(L2+0.05)`), not estimated.

Token **names** are unchanged everywhere (components reference them by
name); only **values** moved. Some raw palette names (`--navy-*`,
`--route-amber-400`, etc.) no longer match their old hue — each has an
inline comment in `tokens.css` saying so.

## Old → new (all tokens whose value changed this wave)

| Token | Old | New | Role now |
|---|---|---|---|
| `--navy-900` | `#071528` | `#111827` | Header background, darkest ink accents |
| `--navy-800` | `#0b1f3a` | `#1f2937` | Dark slate for borders/emphasis on light surfaces |
| `--navy-600` | `#1d3557` | `#6b7280` | Mid grey hairline border, `--type-scholarly` text |
| `--parchment-100` | `#f7f0df` | `#fff8ee` | Page background (warm cream) |
| `--parchment-200` | `#f3e9d2` | `#ffffff` | Card background (white) |
| `--parchment-400` | `#d9c9a3` | `#e3dacb` | Rule/hairline (now decorative only) |
| `--laterite-700` | `#7a2e24` | `#c2410c` | Accent orange, text-safe |
| `--laterite-500` | `#8b3a2f` | `#f97316` | Bright orange, decorative/large only |
| `--verdigris-700` | `#2f6f62` | `#1a6b49` | Deep leaf green, route/badge |
| `--verdigris-500` | `#3e8a7a` | `#2e9e6a` | Mid green, decorative only |
| `--verdigris-300` | `#7fc4b3` | `#8fe0bc` | Light mint, decorative only |
| `--gold-600` | `#a8861b` | `#f2a93c` | Amber highlight fill (pairs with dark ink text) |
| `--gold-400` | `#c9a227` | `#f2a93c` | Alias of `--gold-600` — no separate dark-chrome shade needed now |
| `--ink-900` | `#17120c` | `#1a1a1a` | Primary text ink |
| `--ink-600` | `#4a4036` | `#374151` | Secondary text ink |
| `--white` | `#fbf8f1` | `#ffffff` | — |
| `--map-sea` | `#071528` (= navy-900) | `#cfe3e8` | Pale blue-grey sea |
| `--map-land` | `#2a2418` | `#f2eee6` | Pale warm cream-grey land |
| `--map-land-edge` | `#5a4b2e` | `#d9cdb8` | Faint land/coast edge line |
| `--map-river` | `#244a63` | `#6fa8c0` | Deeper blue, geographic river fill |
| `--map-route` (maritime alias) | `#7fc4b3` | `#1a6b49` | Deep leaf green |
| `--map-port` | `#c9a227` (gold-400) | `#c2410c` (laterite-700) | Deep orange |
| `--map-label` | `#f3e9d2` (parchment-200, light) | `#1a1a1a` (fg, dark) | Dark ink on the now-pale map |
| `--route-amber-400` | `#e0a23c` | `#8a4a00` | Coastal route (darkened for AA) |
| `--route-river-300` | `#8fc7e0` | `#1f5c87` | River route (darkened for AA; name kept) |
| `--route-terracotta-400` | `#e0876a` | `#5c4033` | Land/caravan route (darkened for AA) |
| `--type-traditional` | `--laterite-500` (`#8b3a2f`) | `--laterite-700` (`#c2410c`) | Was already borderline; old bright coral equivalent fails at 2.80:1 on white |
| `--scrim` | `rgba(7,21,40,0.6)` | `rgba(26,26,26,0.5)` | Decorative dimmer, ink-based |
| `--progress-fill` | `--verdigris-700` | `--teal-700` (`#0b7a70`) | New secondary-teal family |
| `--stamp-glow` / `--map-port-glow` / route glows | old rgb | recomputed from new hexes at same alpha | Decorative underlays |

## New tokens added

| Token | Value | Why |
|---|---|---|
| `--teal-700` / `--teal-500` | `#0b7a70` / `#0d9488` | Owner's secondary teal; 700 is the darkened text-safe shade |
| `--violet-700` | `#6d28d9` | Third marker-kind colour (inscription), distinct from orange/teal |
| `--card-bg` | `= --parchment-200` (`#ffffff`) | Named per the brief's ask; map frame, legend, panels |
| `--card-shadow` | `0 1px 2px rgba(17,24,39,.08), 0 8px 24px rgba(17,24,39,.10)` | Soft card shadow |
| `--control-bg` | `rgba(255,255,255,0.95)` | Map overlay controls (zoom, reset, `?`, view toggle, hint) |
| `--control-fg` | `= --fg` | Dark glyphs on control chips |
| `--control-shadow` | `= --card-shadow` | — |
| `--radius-lg` | `0.75rem` (12px) | Map frame / controls / legend card radius |
| `--header-bg` / `--header-fg` / `--header-accent` | `#111827` / `#ffffff` / `#f97316` | If/when a site header is built |
| `--map-label-halo` | `= --card-bg` (white) | Label halo now light, not `--map-sea` |
| `--marker-port` / `--marker-site` / `--marker-inscription` / `--marker-destination` / `--marker-cluster` | see table below | One colour per marker kind, never colour alone |
| `--marker-ring` | `#ffffff` | 2–3px white ring, decorative |
| `--marker-outline` | `= --fg` (`#1a1a1a`) | The 1.25–1.5px dark hairline that actually carries the ≥3:1 guarantee (see below) |
| `--marker-glow` | `rgba(26,26,26,0.12)` | Soft halo underlay, decorative |

## Contrast table (every pair checked)

Formula and rounding as above; "Gate" is the applicable WCAG 2.1 AA
threshold (4.5:1 normal text, 3:1 large text/UI graphics, 3:1 focus
indicator).

### Body text and cards

| Pair | Ratio | Gate | Pass? |
|---|---|---|---|
| `--fg` (#1a1a1a) on `--bg` (#fff8ee) | 16.50:1 | 4.5:1 | Pass |
| `--fg` on `--bg-elevated`/`--card-bg` (#ffffff) | 17.40:1 | 4.5:1 | Pass |
| `--fg-muted` (#374151) on `--bg` | 9.77:1 | 4.5:1 | Pass |
| `--fg-muted` on `--bg-elevated` | 10.31:1 | 4.5:1 | Pass |
| `--accent`/link (#c2410c) on `--bg` | ~4.97:1 | 4.5:1 | Pass (tight; do not lighten further) |
| `--accent` on `--bg-elevated` (#ffffff) | 4.97:1 | 4.5:1 | Pass |
| `--header-fg` (white) on `--header-bg` (#111827) | 17.74:1 | 4.5:1 | Pass |

### Focus ring

| Pair | Ratio | Gate | Pass? |
|---|---|---|---|
| `--accent` ring vs `--bg`/`--card-bg` (white/cream) | 4.97–5.18:1 | 3:1 | Pass |
| `--accent` ring vs `--map-sea` | 3.90:1 | 3:1 | Pass |
| `--accent` ring vs `--map-land` | 4.48:1 | 3:1 | Pass |
| `--accent` ring vs `--header-bg` | 3.43:1 | 3:1 | Pass |

The outer `--card-bg` ring is a decorative separator only (white-on-white
in most contexts); the accent ring alone carries the guarantee above, so it
passes on every surface it can appear on.

### Map labels

| Pair | Ratio | Gate | Pass? |
|---|---|---|---|
| `--map-label` (#1a1a1a) on `--map-sea` (#cfe3e8), no halo | 13.10:1 | 3:1 (large map text) | Pass |
| `--map-label` on `--map-land` (#f2eee6), no halo | 15.04:1 | 3:1 | Pass |

Both already clear the gate without the halo; the white 2–3px halo
(`--map-label-halo`) is for legibility over busy route lines/graticule, not
a contrast requirement.

### Route colours (mode × background)

| Mode | Colour | vs `--map-sea` | vs `--map-land` | Gate | Pass? |
|---|---|---|---|---|---|
| Maritime | `#1a6b49` | 4.88:1 | 5.60:1 | 3:1 | Pass |
| Coastal | `#8a4a00` | 5.17:1 | 5.93:1 | 3:1 | Pass |
| River | `#1f5c87` | 5.37:1 | 6.17:1 | 3:1 | Pass |
| Land | `#5c4033` | 7.07:1 | 8.11:1 | 3:1 | Pass |

All four are also visually distinct hues (green/amber/blue/umber-brown) and
keep their existing dash patterns (route-styles.md) — colour is never the
only signal.

### Markers (fill vs sea/land, and white glyph vs fill)

| Kind | Fill | vs `--map-sea` | vs `--map-land` | White glyph on fill | Gate | Pass? |
|---|---|---|---|---|---|---|
| Port | `#c2410c` | 3.90:1 | 4.48:1 | 5.18:1 | 3:1 | Pass |
| Site | `#0b7a70` | 3.92:1 | 4.50:1 | 5.21:1 | 3:1 | Pass |
| Inscription | `#6d28d9` | 5.35:1 | 6.14:1 | 7.11:1 | 3:1 | Pass |
| Destination (unfilled rings) | `#374151` | 7.76:1 | 8.91:1 | n/a (no fill) | 3:1 | Pass |
| Cluster bubble | `#111827` | 13.35:1 | 15.33:1 | 17.74:1 | 3:1 / 4.5:1 | Pass |
| `--marker-outline` hairline (any kind) | `#1a1a1a` | 13.10:1 | 15.04:1 | — | 3:1 | Pass |

Every marker fill independently clears 3:1 against both sea and land (no
outline needed to pass), **and** additionally carries the 1.25–1.5px dark
`--marker-outline` hairline as a belt-and-braces guarantee per
map-style-light.md — so the graphic-contrast gate is met even if a future
palette tweak pushes a fill closer to the line.

### Evidence badges

| Badge | Colour | On | Ratio | Gate | Pass? |
|---|---|---|---|---|---|
| Tier: Confirmed | `#1a6b49` bg, white text | — | 6.48:1 | 4.5:1 | Pass |
| Tier: Strongly Supported | `#f2a93c` bg, `--ink-900` text | — | 8.72:1 | 4.5:1 | Pass |
| Tier: Probable | `#9a5b1f` bg, white text | — | 5.40:1 | 4.5:1 | Pass |
| Tier: Hypothetical | `#5b6470` bg, white text | — | 5.99:1 | 4.5:1 | Pass |
| Tier: Unverified | `#c2410c` bg, white text | — | 5.18:1 | 4.5:1 | Pass |
| Type: archaeological | `#1a6b49` text | `--bg`/`--bg-elevated` | 6.48–6.13:1 | 4.5:1 | Pass |
| Type: scholarly | `#6b7280` text | `--bg`/`--bg-elevated` | 4.83:1 | 4.5:1 | Pass (tight; do not lighten) |
| Type: traditional | `#c2410c` text | `--bg`/`--bg-elevated` | 5.18–4.71:1 | 4.5:1 | Pass |

### Kid experience

| Pair | Ratio | Gate | Pass? |
|---|---|---|---|
| `--progress-fill` (#0b7a70) vs `--progress-track` (#e3dacb) | 3.76:1 | 3:1 (UI, non-text) | Pass |
| `--stamp-ink` (#c2410c) vs `--parchment-200`/`--card-bg` (white) | 5.18:1 | 4.5:1 | Pass |

### Known tight margins (flagged, not failing)

- `--accent`/`--type-traditional`/`--stamp-ink` all sit at 4.7–5.2:1 on
  white — comfortably above 4.5:1 but with less headroom than the greens
  and violets. Don't lighten `--laterite-700` without recomputing.
- `--type-scholarly` (`#6b7280` on white) is 4.83:1 — the tightest pass in
  the set. If `--navy-600` is ever reused somewhere lighter than pure
  white/`--bg`, recompute before shipping.
- `.atlas-timeline__range` thumb (`accent-color: var(--highlight)`,
  `#f97316` on the light page) is ≈2.57:1 as a standalone filled circle —
  below the 3:1 UI-component gate. Not in this wave's explicit checklist;
  flagged for the engineer to add a thin dark outline to the thumb, or use
  `--accent` (`#c2410c`, which does pass) instead of `--highlight` there.

## New tokens — `docs/design/atlas-layout.md` wave

| Token | Value | Why |
|---|---|---|
| `--map-border-modern` | `rgba(55, 65, 81, 0.35)` | Faint modern-country-borders context layer (`--ink-600` hue at 35% alpha), zoom-gated orientation aid — see map-style-light.md "Country borders" |
| `--dur-toast-settle` | `500ms` | Debounce before the "Did you know?" toast recomputes its fact after an `activePeriod` change, so scrubbing the timeline shows one settled fact, not one per period crossed. Motion-section token but **not** zeroed by `prefers-reduced-motion` (an interaction debounce, not an animation) |

Local, component-scoped (not global colour/motion tokens — same pattern as
the existing `--atlas-panel-w` in `.atlas-island`, `atlas.css`): map card
sizing (`--atlas-map-ratio`, `--atlas-map-ratio-narrow`, new
`--atlas-map-min-h-wide: 30rem`, new `--atlas-map-max-h: min(46rem,
62dvh)`) and the new timeline chip strip (`--timeline-chip-min-w: 7rem`,
`--timeline-chip-max-w: 12rem`).

### `--map-border-modern` vs `--map-land` (computed, and reported honestly)

Alpha-blending `rgba(55,65,81,0.35)` (source `#374151` at 35% alpha) over
`--map-land` (`#f2eee6`) per-channel (`v = 0.35·fg + 0.65·bg`):

- R: `0.35·55 + 0.65·242 = 176.6` → 177
- G: `0.35·65 + 0.65·238 = 177.4` → 177
- B: `0.35·81 + 0.65·230 = 177.9` → 178

Effective colour ≈ `#b1b1b2`. Relative luminance (sRGB→linear,
`c ≤ 0.03928 → c/12.92`, else `((c+0.055)/1.055)^2.4`):

- `177/255 = 0.6941` → linear `0.4319`
- `178/255 = 0.6980` → linear `0.4362`
- `L ≈ 0.2126·0.4319 + 0.7152·0.4319 + 0.0722·0.4362 = 0.4325`

`--map-land` luminance (from the existing row above) = `0.8572`.

Contrast = `(0.8572 + 0.05) / (0.4325 + 0.05) = 0.9072 / 0.4825 ≈ 1.88:1`.

**Gate: 3:1 (non-text graphic).** Fails, by design, same category as the
existing `--map-graticule` (also sub-3:1, also decorative background
geography, not required to carry meaning on its own). The borders layer is
never the sole way to identify or operate anything on the map — routes,
ports and sites all independently clear 3:1+ (see the "Markers" and "Route
colours" tables above) — and it is hidden entirely below the coast-view
zoom threshold, shown only as an optional orientation aid past it. Flagged
here rather than silently under a passing-looking summary table.

## Focus ring, restated

`--focus-ring: 0 0 0 3px var(--accent), 0 0 0 5px var(--card-bg);` — see
"Focus ring" table above for the surfaces checked.
