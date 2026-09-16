# Map style — light (Voyager-inspired)

## Purpose

Restyles `AtlasMap.tsx`'s own Natural Earth vector rendering (no tiles, no
third-party map brand) to a calm, pale basemap with white cards, borrowing
the visual language of light Leaflet/Voyager-style history maps: pale
land/sea, a white map frame with a soft shadow, round coloured pins with a
white ring and a white glyph, and dark-ink labels. This replaces the
previous dark-navy map chrome (docs/design/atlas-map.md,
docs/design/route-styles.md still govern layout, keyboard model and
anatomy; this file overrides their **colour and surface** treatment only).

Every colour value referenced below lives in `src/styles/tokens.css`;
computed ratios are in `docs/design/tokens.md`.

## Map frame (the card)

- The whole `<figure class="atlas-map">` becomes a **white card**:
  `background: var(--card-bg)`, `border-radius: var(--radius-lg)` (12px),
  `box-shadow: var(--card-shadow)`, no more 1px `--navy-600` border (the
  shadow provides the edge).
- Inside the card, the map canvas itself paints `--map-sea` /
  `--map-land` — the pale basemap — not the card white.
- 380px: card fills the width, `min-height: 20rem` as before
  (atlas-map.md). 1280px: card sits in the 2fr map column of the
  three-column grid, unchanged layout.

## Basemap

| Layer | Token | Notes |
|---|---|---|
| Sea | `--map-sea` (#cfe3e8) | Pale blue-grey |
| Land | `--map-land` (#f2eee6) | Pale warm cream-grey |
| Land/coast edge | `--map-land-edge` (#d9cdb8) | 0.75px hairline, faint |
| River (geography, not routes) | `--map-river` (#6fa8c0) | Slightly deeper blue than the sea |
| Graticule | *(atlas.css-local `--map-graticule`, not owned here)* | Currently a warm-tan rgba tuned for the old dark sea — recommend darkening/adjusting to read faintly against the new pale sea; see hard-coded-colours list |

## Markers

### Anatomy (four stacked layers, back to front)

```
 ┌───────────────────────────┐
 │   glow (blurred, ~1.6×)   │  --marker-glow, decorative, no ratio required
 │  ┌─────────────────────┐  │
 │  │  outline (hairline)  │  │  --marker-outline (#1a1a1a), 1.25–1.5px — carries the AA guarantee
 │  │ ┌───────────────────┐│  │
 │  │ │   ring (2–3px)    ││  │  --marker-ring (white)
 │  │ │ ┌───────────────┐ ││  │
 │  │ │ │  fill (solid) │ ││  │  --marker-port/site/inscription, kind colour
 │  │ │ │   ⚓ glyph     │ ││  │  white icon (port-glyph / site-glyph / inscription-glyph.svg), currentColor set to white
 │  │ │ └───────────────┘ ││  │
 │  │ └───────────────────┘│  │
 │  └─────────────────────┘  │
 └───────────────────────────┘
```

- Every fill colour independently clears 3:1 against both `--map-sea` and
  `--map-land` (tokens.md), so the outline is a deliberate second layer of
  assurance, not a workaround for a failing fill — it also visually
  separates adjacent pins on a crowded coastline, which a ring alone (white
  on a pale sea) would not do reliably.
- The white icon glyph is **never the only signal for kind** — fill colour,
  glyph shape and the `aria-label`/card text all repeat "port" /
  "archaeological site" / "inscription", matching the existing `never
  colour alone` rule.

### Sizes

| Context | Marker diameter | Ring | Outline | Hit area |
|---|---|---|---|---|
| Coast view (default zoom) | 28px | 2.5px | 1.5px | 44×44px invisible hit circle, centred |
| Whole-ocean view (zoomed out, A1 view toggle) | 22px | 2px | 1.25px | 44×44px, unchanged — the hit target never shrinks even though the visible pin does |
| Site marker (diamond, not circle) | Same footprint as port at each zoom step | same | same | same 44px hit circle |

Sizes scale with `--map-counter` exactly as today (marker-scale counter-zoom,
map-architecture.md); only the *base* radius changes between the two view
states, not the scaling mechanism.

### Colour per kind

| Kind | Token | Hex | Glyph asset |
|---|---|---|---|
| Port | `--marker-port` | `#c2410c` | `src/assets/ports/port-glyph.svg` (anchor) |
| Archaeological site | `--marker-site` | `#0b7a70` | `src/assets/ports/site-glyph.svg` (monument) |
| Inscription | `--marker-inscription` | `#6d28d9` | `src/assets/ports/inscription-glyph.svg` (stone tablet) |
| Trading destination (outside Kalinga) | `--marker-destination` | `#374151` | Unfilled concentric rings, unchanged shape (`destination-marker.svg`), no glyph — kept deliberately plainer since it marks "elsewhere", not a Kalinga place |
| Cluster bubble | `--marker-cluster` | `#111827` | White count number, no glyph |

**Implementation note for the engineer:** `AtlasMap.tsx`'s `MarkerShape`
type currently only has `'port' | 'site' | 'destination'` — inscriptions
are not yet rendered as their own map marker kind. The `--marker-inscription`
token and glyph are ready for whenever that kind is wired in; until then,
inscriptions presumably render through the site/port path if at all.

### Selection ring

Unchanged mechanism (`marker-ring`, `data-selected`), but its colour should
move from `--gold-400` to `--accent` (`#c2410c`) or stay a neutral
`--marker-outline` — either reads fine on the pale basemap; pick one and
keep it consistent with the focus ring's accent colour for a single
"you are here" language across hover/focus/select.

## Labels

- `fill: var(--map-label)` (dark ink, `#1a1a1a`) — already clears 3:1 on
  both sea and land with **no halo** (tokens.md), but keep a 2–3px halo for
  legibility over route lines and the graticule: `stroke:
  var(--map-label-halo)` (white/`--card-bg`), `paint-order: stroke fill`.
- **Engineer follow-up (token-reference change, not a new hex):**
  `src/styles/atlas.css` `.marker-label` currently sets
  `stroke: var(--map-sea)` — that was correct for the old dark-sea design
  (halo = sea colour = dark) but is now the wrong direction (halo must be
  light). Swap to `stroke: var(--map-label-halo)`.
- **Engineer follow-up:** `.marker[data-kind='destination'] .marker-label`
  overrides `fill: var(--parchment-400)` (now a light decorative tone, not
  a text colour) — swap to `fill: var(--map-label)` so destination labels
  stay dark ink like every other label. Same fix applies to
  `.marker[data-kind='destination'] .marker-shape`/`.marker-core`, which
  also stroke `var(--parchment-400)` — swap to `var(--marker-destination)`.

## Map controls (zoom, reset, "?", view toggle, hint)

- Background: `--control-bg` (`rgba(255,255,255,0.95)`), `border-radius:
  var(--radius-lg)` (12px, not the old `--radius-sm`), `box-shadow:
  var(--control-shadow)`, no more 1px `--navy-600` border (or keep a very
  faint `--rule` border if a hairline is wanted for definition on top of
  the white map card).
- Glyphs/text: `--control-fg` (`= --fg`, dark ink) instead of
  `--gold-400`/`--map-label`.
- Pressed/active state (view toggle): swap the old "gold fill, navy text"
  treatment for `background: var(--accent)` (`#c2410c`), `color: white` —
  passes 5.18:1 the same way the darkened accent does everywhere else.
- **These are currently hard-coded literals in `atlas.css`, not token
  references** (`rgba(11, 31, 58, 0.85)` etc.) — seven occurrences listed
  in the hard-coded-colours section below. Token values alone cannot fix
  them; the engineer needs to change the declarations to use the new
  `--control-bg`/`--control-fg`/`--control-shadow`/`--radius-lg` tokens.

## Legend card — superseded by `docs/design/atlas-layout.md`

**This section's colour rules stand (white card, dark ink) but its
placement recommendation is superseded.** `docs/design/atlas-layout.md`
(measured: the in-figure legend was 324px tall and sat between the map
canvas and the timeline, the direct cause of "the timeline is unreachable"
and "the legend is in the wrong place") moves the legend out of the map
figure entirely, into a popover triggered by a new "Map key" control chip
— the same pattern as the existing `[?]` keyboard-shortcuts dialog. See
`atlas-layout.md` §3+4 for the full spec. The legend's *content* (the
`<dl>` groups, glyphs, tokens, the "Dashed lines mean Hypothetical" note)
is unchanged; only its container moves from an in-figure
`<details>`/`<aside>` to a `role="dialog"` popover, styled with the same
`--bg-elevated`/`--rule`/`--radius-md`/`--shadow-card` treatment already
used for the keyboard-shortcuts sheet. `atlas-layout.md` also adds one new
legend row for the modern-borders context layer (see that spec's §6).

The colour-swap instructions below still apply to whatever container ships
(popover instead of in-figure card): `background: var(--navy-800)` /
`color: var(--parchment-100)` (dark chrome direction, wrong for this style)
becomes `background: var(--card-bg)` / `color: var(--fg)`, legend
headers/notes move from `--parchment-400` to `--fg-muted`.

Same fix applies to `.atlas-map__status` (the live-region status panel):
`background: var(--navy-800)` → `var(--card-bg)`, `color:
var(--parchment-100)` → `var(--fg)`.

## Cluster bubbles

Same round-marker anatomy as a single pin (fill + white ring + dark
outline + glow), fill = `--marker-cluster` (`#111827`), white bold count
text, no kind glyph. Radius follows the existing cluster-bubble sizing
logic in `AtlasMap.tsx` unchanged; only the colours move.

## Country borders (modern context layer)

Full spec: `docs/design/atlas-layout.md` §6. Summary: a single faint,
`aria-hidden`, non-interactive hairline layer drawn from
`public/geo/countries-50m.json` (present-day borders, Natural Earth, public
domain), `stroke: var(--map-border-modern)` (new token, 0.5px,
non-scaling-stroke, no fill), sitting just above the land fill and below
rivers/routes/markers, hidden below the existing coast/whole-ocean zoom
threshold and cross-fading in only once zoomed past it. **This is modern
geography, not a historical claim** — it is captioned as such in both the
"Map key" popover legend and, when visible, the map's "Approximate
reconstruction" caption block. No ancient/period boundary is drawn; see
`atlas-layout.md`'s closing paragraph for what a sourced historical-
boundary layer would require.

## Route styles

Colours only — dash patterns, glow-underlay mechanism, flow/ship animation
and states are unchanged from docs/design/route-styles.md.

| Mode | Token | Hex |
|---|---|---|
| Maritime | `--map-route-maritime` | `#1a6b49` (deep leaf green) |
| Coastal | `--map-route-coastal` | `#8a4a00` (deep amber) |
| River | `--map-route-river` | `#1f5c87` (deep blue) |
| Land | `--map-route-land` | `#5c4033` (deep umber) |

All four clear ≥3:1 against both `--map-sea` and `--map-land` (tokens.md)
and stay visually distinct by hue as well as by dash pattern.

## Header (if/when built)

- `background: var(--header-bg)` (`#111827`), text `var(--header-fg)`
  (white, 17.74:1), a thin `var(--header-accent)` (`#f97316`) rule/border
  under it — decorative, no text sits on the accent line itself.
- Not currently a component in scope (`src/layouts/Base.astro` owns any
  real header); tokens are provided for whenever one is built.

## 380px notes

- Map card: full width, corners still `--radius-lg` (12px reads fine at
  this width, doesn't need to shrink).
- Controls: same 44×44px chips, just repositioned per atlas-map.md's
  existing 360px layout (bottom-left zoom stack, bottom-right `?`).
- Legend: collapsible white card, closed by default, `<summary>` still a
  44px tappable row.
- Marker sizes: use the "coast view" 28px pins by default (whole-ocean view
  is opt-in via the view toggle at any width, not just desktop).

## 1280px notes

- Map card sits in the fixed/sticky 2fr grid column (atlas-map.md);
  legend rail persists open as its own card in the 16rem left column, or —
  per "legend card inside the map" above — as a floating card anchored to
  the map's own bottom-left corner. Pick one; see open decision below.
- Side panel (port/route/site detail) stays a separate white card in the
  1fr right column, matching the same `--card-bg`/`--radius-lg`/
  `--card-shadow` treatment for visual consistency across all three
  columns.

## States (unchanged from atlas-map.md/route-styles.md except colour)

Default / hover / focus / selected / inactive-in-period / reduced-motion —
same triggers and timing tokens (`--dur-page`, `--ease-page`,
`--dur-flow`), only the colours referenced above change.

## Tokens used

`--map-sea`, `--map-land`, `--map-land-edge`, `--map-river`, `--map-label`,
`--map-label-halo`, `--marker-port/site/inscription/destination/cluster`,
`--marker-ring`, `--marker-outline`, `--marker-glow`,
`--map-route-maritime/coastal/river/land`, `--map-route-glow-*`,
`--card-bg`, `--card-shadow`, `--control-bg`, `--control-fg`,
`--control-shadow`, `--radius-lg`, `--header-bg`, `--header-fg`,
`--header-accent`, `--focus-ring`, `--accent`, `--hit-min`,
`--map-border-modern` (new, see "Country borders" above).

## Open design decision for the human — resolved

**Where exactly does the legend card sit at ≥900px?** This wave's earlier
two options (A: floating card inside the map; B: persistent left-rail
`<aside>`) are both superseded by measurement: `atlas-layout.md` found the
in-figure legend was 324px tall and the direct cause of the timeline being
unreachable, and neither A nor B removes that block from the figure. The
resolved answer is **C — a popover triggered by a "Map key" control chip**,
matching the existing keyboard-shortcuts `[?]` dialog pattern exactly (see
`atlas-layout.md` §3+4). This removes the in-figure block entirely at
every width, needs no new grid column, and reuses a focus-trap pattern
already built once. Option A remains a plausible future visual-parity
follow-up if the owner specifically wants a permanently-visible floating
card rather than an on-demand popover, but it is not the current
recommendation.
