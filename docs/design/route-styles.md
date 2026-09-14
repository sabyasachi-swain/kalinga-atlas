# Route styles

## Purpose

One visual system for every `Route` on the map: mode (how people travelled) and
evidence tier (how sure we are) must both be readable without colour alone,
at 360 px and at desktop zoom, and must animate cheaply enough for a phone on
4G. This spec is the contract for the `<path>` classes AtlasMap renders per
`route.mode` × `route.evidence_level`, the ambient "flow" animation, and the
ship-along-route animation.

## Anatomy

Each route is two stacked SVG elements inside the routes `<g>`, plus an
optional third for the animated ship:

```
<g class="route" data-mode="…" data-tier="…" data-inactive?>
  <path class="route-glow" .../>   <!-- wide, blurred-looking underlay -->
  <path class="route-line" .../>   <!-- the line itself, dashed per table -->
  <path class="route-hit"  .../>   <!-- invisible, wide, tabindex=0, role=button -->
</g>
<use class="route-ship" href="#ship-sailing" />  <!-- only while selected/focused -->
```

`route-hit` is the focusable element (map-architecture.md's `role="button"
tabindex="0"`); `route-glow`/`route-line` are `aria-hidden`, decorative
duplicates of its geometry.

## Mode × tier: stroke, dash, glow

Base stroke width 2 px, `vector-effect: non-scaling-stroke` (constant at any
zoom). All dasharrays below are literal `stroke-dasharray` values at that
width — one technique for every mode, so the same `@keyframes` animates all
of them; no special case for a "solid" look.

| Mode | Colour | Glow (colour, underlay width 6px) | Dash — Confirmed / Strongly Supported / Probable | Dash — Hypothetical |
|---|---|---|---|---|
| maritime | `--map-route-maritime` | `--map-route-glow-maritime` | `40 6` (near-solid, open-sea reach) | `6 14` |
| coastal | `--map-route-coastal` | `--map-route-glow-coastal` | `10 5` (visible coast-hugging stops) | `10 13` |
| river | `--map-route-river` | `--map-route-glow-river` | `3 4` (fine, frequent ticks) | `3 10` |
| land | `--map-route-land` | `--map-route-glow-land` | `7 3 2 3` (dash-dot, caravan halts) | `7 8 2 8` |

Hypothetical additionally sets `route-line { opacity: 0.75 }` and pairs with
an `EvidenceBadge` in the route's card/popover — dash pattern is the map
glyph, the badge is the text-and-glyph confirmation, so the signal is never
colour alone even for a colourblind viewer comparing two dashed lines.

`route-glow` is always solid (no dasharray) at 35–45% alpha — a blurred
underlay reads better continuous, and it still communicates mode via colour
+ position since it exactly follows `route-line`.

## Legend glyph (map legend, see atlas-map.md)

Each mode also gets a short line-sample swatch with a label, so mode is
never colour-only either:

```
━━━━━  Maritime      (near-solid teal)
– – – –  Coastal        (long amber dash)
· · · ·  River          (fine blue tick)
─·─·─  Land            (terracotta dash-dot)
```

## Flow animation ("the sea is moving")

```css
.route-line {
  animation: route-flow var(--dur-flow) linear infinite;
}
@keyframes route-flow {
  to { stroke-dashoffset: calc(-1 * var(--route-pattern-length)); }
}
```

`--route-pattern-length` is set inline per element (sum of one dasharray
period, e.g. `46` for maritime `40 6`) since it must match each route's own
pattern. Under `prefers-reduced-motion`, `--dur-flow` is already zeroed by
`tokens.css`, which freezes the animation on its first frame — no separate
rule needed.

Only routes visible for the active period animate; `[data-inactive]` routes
pause the animation (`animation-play-state: paused`) as well as fading to
40% opacity, so a busy map at zoomed-out scale doesn't animate routes the
visitor can't act on.

## Ship-along-route animation

- Applies to `maritime`, `coastal` and `river` modes (an original ship
  silhouette exists for sail and river craft). `land` routes have no vehicle
  glyph in this wave — open decision below.
- On select (`Enter`/`Space`/click on `route-hit`) or keyboard focus, one
  `<use>` referencing `src/assets/ships/sailing-vessel.svg` (maritime,
  coastal) or `river-boat.svg` (river) animates along the route's path once,
  bow-first, using `offset-path: path(...)` set to the same `d` as
  `route-line` with `offset-rotate: auto` (so the silhouette — already drawn
  facing right/bow-forward — turns to the route's tangent) and
  `offset-distance` animated `0% → 100%` over `--dur-sail`, `ease-in-out`.
- The ship fades in (`--dur-fast`) at the start point and out at the end
  point; it does not loop automatically — replaying requires re-selecting
  the route, so it never becomes ambient background motion competing with
  the "did you know?" toast or the panel.
- Reduced motion: the ship appears static at the route's midpoint (`offset-
  distance: 50%`), oriented along the local tangent, with no transition. It
  still signals "this is a sailing/river route" without moving.

## States

| State | Treatment |
|---|---|
| Default (active period) | Table colours/dashes above, flow animation running. |
| Hover / focus (`route-hit:hover`, `:focus-visible`) | `route-line` stroke-width 3px, glow width 9px and alpha +15%; `:focus-visible` also gets `--focus-ring` on `route-hit`. |
| Selected | Same as hover, plus the ship-along-route animation plays once and the panel/card for the route opens. |
| Inactive-in-period (`[data-inactive]`) | Opacity 40%, flow animation paused, not focusable (`tabindex="-1"`) per map-architecture.md period filtering. |
| Reduced motion | Flow frozen at frame 0; ship static at 50% offset; nothing else changes. |

## Accessibility notes

- `route-hit` carries `aria-label`, e.g. `"Maritime route, Tamralipti to
  Suvarnabhumi, Strongly Supported, scholarly"` — mode, endpoints, tier,
  type, matching the marker label pattern in map-architecture.md.
- Never encode mode or tier in colour alone: dash pattern (a shape signal)
  plus the legend's text label plus, on the route's own card, an
  `EvidenceBadge` all repeat the same information.
- Minimum stroke width for the *hit* target is not the visual 2px — `route-
  hit` is stroked at 12px transparent so touch/mouse selection meets the
  44px-equivalent generous target the map's zoomed-out scale allows for a
  1-dimensional line (a full 44px is impractical for a thin line at world
  scale; 12px screen-px hit width plus the `d3-zoom` scale factor is the
  documented compromise — see atlas-map.md keyboard section for the
  alternative keyboard path to the same route via the Routes section list).

## Tokens used

`--map-route-maritime/coastal/river/land`, `--map-route-glow-*`,
`--dur-flow`, `--dur-sail`, `--dur-fast`, `--focus-ring`, `--ease-page` (not
used here directly, listed for contrast with page-turn), `--text-xs` (legend
labels), `--space-2` (legend swatch gap).

## Open design decision

**Land routes have no ship/vehicle glyph in this wave.** Recommendation:
ship the dash-dot line + glow only for `land` now (it still reads clearly
against the other three modes); commission a generic ox-cart/caravan
silhouette in the goods-icon wave once `src/assets/ships/` conventions are
proven, rather than rushing a fourth vehicle silhouette now.
