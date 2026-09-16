# Token summary

Canonical values: `src/styles/tokens.css`. Values, old-to-new history and **computed** contrast ratios: `docs/design/tokens.md`. Map rules: `docs/design/map-style-light.md`. Recheck contrast whenever you change a value.

## Palette roles (light atlas)

Raw palette names such as `--navy-*`, `--parchment-*`, `--laterite-*`, `--verdigris-*` and `--gold-*` were kept for compatibility, but their values now belong to the light palette. Use the semantic tokens below in components.

| Token | Role | Rule |
|---|---|---|
| `--bg` | warm-cream page | body text `--fg` ≥ 4.5:1 |
| `--card-bg`, `--card-shadow`, `--radius-lg` | white cards: map frame, panels, legend | |
| `--fg`, `--fg-muted` | dark ink text | |
| `--header-bg`, `--header-fg`, `--header-accent` | dark site header | |
| `--map-sea`, `--map-land`, `--map-land-edge`, `--map-river`, `--map-graticule` | pale basemap | no tiles |
| `--map-label`, `--map-label-halo` | dark place names with a white halo | |
| `--map-route-maritime` / `-coastal` / `-river` / `-land` | route lines | ≥ 3:1 on sea and land; dash pattern also differs |
| `--marker-port` / `-site` / `-inscription` / `-destination` / `-cluster` | round pin fills | ≥ 3:1 on sea and land; white glyph inside, never colour alone |
| `--marker-ring`, `--marker-outline`, `--marker-glow` | pin anatomy | |
| `--control-bg`, `--control-fg`, `--control-shadow` | zoom, reset, view toggle, hint, dialog close | |
| `--accent` | orange: active states, focus, text-safe accent | ≥ 4.5:1 on white |
| `--highlight` | decorative only: borders, underlines | < 3:1 on white; never the only signal on a control or text |
| `--tier-*`, `--type-*` | evidence badges | colour + glyph + text |
| `--progress-*`, `--stamp-*` | kid logbook and stamps | |

## Type scale

`--text-xs` 0.8rem · `--text-sm` 0.9rem · `--text-md` 1rem · `--text-lg` 1.25rem · `--text-xl` 1.6rem · `--text-2xl` 2.1rem · `--text-3xl` 2.8rem. Body line-height 1.6, headings 1.15.

## Spacing

4 px base: `--space-1` (4) · `--space-2` (8) · `--space-3` (12) · `--space-4` (16) · `--space-6` (24) · `--space-8` (32) · `--space-12` (48). Gutter `clamp(1rem, 4vw, 2.5rem)`. Content max 72rem.

## Motion

`--dur-fast` 150ms · `--dur-base` 300ms · `--dur-page` 700ms (period switch) · `--dur-sail` 6s (ship along route). Easing `--ease-page` cubic-bezier(0.22, 1, 0.36, 1). All zeroed under `prefers-reduced-motion`.

## Breakpoints (mobile-first, min-width)

360 (base) · 600 (two-column cards) · 900 (map + side panel) · 1200 (wide atlas). Use `rem` media queries: 37.5rem, 56.25rem, 75rem.
