# Token summary

Canonical file: `src/styles/tokens.css`. Contrast ratios below are for the listed pairs; recheck if you change a value.

## Palette

| Token | Hex | Role | AA pairs (ratio) |
|---|---|---|---|
| `--navy-900` | #071528 | map sea | with `--parchment-200` text 15.9:1 |
| `--navy-800` | #0b1f3a | deep ocean navy | with `--parchment-100` 14.6:1 |
| `--navy-600` | #1d3557 | mid sea, scholarly type badge | with `--white` 10.4:1 |
| `--parchment-100` | #f7f0df | page background | with `--ink-900` 15.7:1 |
| `--parchment-200` | #f3e9d2 | cards | with `--ink-900` 14.6:1 |
| `--parchment-400` | #d9c9a3 | rules, edges | decorative only |
| `--laterite-700` | #7a2e24 | accent, links, unverified tier | on parchment-100 7.9:1 |
| `--laterite-500` | #8b3a2f | traditional type badge | on parchment-100 6.4:1 |
| `--verdigris-700` | #2f6f62 | confirmed tier, archaeological type | white text 5.4:1 |
| `--verdigris-500` | #3e8a7a | secondary accent | large text only on white |
| `--verdigris-300` | #7fc4b3 | routes on navy | on navy-900 9.1:1 |
| `--gold-600` | #a8861b | strong tier (ink text) | ink-900 text 5.6:1 |
| `--gold-400` | #c9a227 | ports, focus ring on dark | on navy-900 8.2:1 |
| `--ochre-600` | #9a5b1f | probable tier | white text 5.0:1 |
| `--slate-600` | #5b6470 | hypothetical tier | white text 5.6:1 |
| `--ink-900` | #17120c | text on parchment | |
| `--ink-600` | #4a4036 | secondary text | on parchment-100 8.0:1 |

## Type scale

`--text-xs` 0.8rem · `--text-sm` 0.9rem · `--text-md` 1rem · `--text-lg` 1.25rem · `--text-xl` 1.6rem · `--text-2xl` 2.1rem · `--text-3xl` 2.8rem. Body line-height 1.6, headings 1.15.

## Spacing

4 px base: `--space-1` (4) · `--space-2` (8) · `--space-3` (12) · `--space-4` (16) · `--space-6` (24) · `--space-8` (32) · `--space-12` (48). Gutter `clamp(1rem, 4vw, 2.5rem)`. Content max 72rem.

## Motion

`--dur-fast` 150ms · `--dur-base` 300ms · `--dur-page` 700ms (period switch) · `--dur-sail` 6s (ship along route). Easing `--ease-page` cubic-bezier(0.22, 1, 0.36, 1). All zeroed under `prefers-reduced-motion`.

## Breakpoints (mobile-first, min-width)

360 (base) · 600 (two-column cards) · 900 (map + side panel) · 1200 (wide atlas). Use `rem` media queries: 37.5rem, 56.25rem, 75rem.
