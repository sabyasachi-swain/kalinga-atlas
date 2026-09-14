# Atlas map

## Purpose

The centrepiece `<figure>` (`AtlasMap.tsx`). Shows Natural Earth coastline,
routes and ports/sites for the active period, and is the entry point into
progressive disclosure (dot → card → panel, see port-card.md/port-panel.md).
Must work identically for a 10-year-old tapping a glowing dot and a scholar
tabbing through every marker with a screen reader.

## Layout — 360 px (base, mobile-first)

Map is full-width, side panel becomes a bottom sheet that overlays the map
(does not push it) so the visitor never loses their place.

```
┌───────────────────────────────┐
│ Period label · "Chola Age"     │ <- caption bar, --parchment-100 on navy? no:
│ (900–1200 CE) "Approximate     │    text sits ON the map surface, so use
│  reconstruction" (small)       │    --map-label with sea-colour halo
├───────────────────────────────┤
│                                 │
│         [ map canvas+svg ]     │  min-height 20rem, flex:1
│            (navy sea)          │
│                                 │
│  ⊕  ⊖  ⟲   (zoom controls,     │ <- bottom-left, stacked, 44px each
│   bottom-left, floating)        │
│                          [?]    │ <- keyboard-keys popover trigger,
│                     bottom-right│    bottom-right, 44px
├───────────────────────────────┤
│  Legend (collapsible <details>)│ <- closed by default on 360px to save
│  ▸ Map key                     │    vertical space; button-styled summary
└───────────────────────────────┘
      (Timeline island below, out of this component's scope)

[ Port card slides up from bottom on selection — see port-card.md ]
```

- Map block: `aspect-ratio: 4/3` minimum, `min-height: 20rem`, grows with
  viewport; never letterboxed by a fixed pixel height.
- Legend: a native `<details>` under the map, closed by default at this
  width so the map keeps the vertical space; `<summary>` is a real 44px
  tappable row, not a small chevron.
- Zoom controls and the `?` keys-popover trigger float over the map inside
  the same `<figure>`, each a 44×44 px button, `--navy-800` background at
  85% opacity, `--gold-400` icon, so they read against any part of the map.

## Layout — ≥ 900 px (map + side panel)

```
┌───────────┬──────────┬────────────────────────────────────────┐
│ Legend     │          │ Period label · "Chola Age" (900–1200 CE) │
│ (open,     │          │ "Approximate reconstruction" · [?] keys  │
│ persistent │   MAP    ├────────────────────────────────────────┤
│ card,      │          │                                          │
│ left rail, │  (navy)  │        Side panel (port-card /           │
│ 15–18rem)  │          │        port-panel render here,           │
│            │  ⊕⊖⟲    │        see port-card.md/port-panel.md)   │
│            │ bottom-  │                                          │
│            │ left     │        Empty state: "Select a port,      │
│            │          │        route or site to learn more."     │
└───────────┴──────────┴────────────────────────────────────────┘
```

- Three-column CSS grid: `grid-template-columns: 16rem 2fr 1fr` inside
  `--content-max`; legend rail and side panel both scroll independently of
  the map, which stays fixed/sticky in the viewport.
- Legend is permanently open (a `<aside>`, not a `<details>`) once there is
  room for it — same content as the mobile `<details>`, just not
  collapsible.
- Side panel is empty-state by default, fills with the port/route/site
  card+panel on selection; it never covers the map (map and panel are
  siblings, not overlay+underlay, above 900px).
- Breakpoint: `@media (min-width: 56.25rem)` (900px token boundary per
  tokens.md).

## Legend content (both breakpoints, identical content)

Three groups, each item colour + glyph + text label (never colour alone):

```
Evidence tier          Evidence type            Route mode
✓✓ Confirmed            ◆ Archaeology             ━━━━ Maritime
✓  Strongly Supported   ■ Scholars say            – – – Coastal
~  Probable             ● Tradition               · · ·  River
?  Hypothetical                                   ─·─·─ Land
                                                   (dashed = Hypothetical,
                                                    any mode — see below)
```

- Tier and type glyphs/colours are exactly `EvidenceBadge`'s (`--tier-*`,
  `--type-*`); the legend is the one place they're shown without a specific
  claim attached, so each row also carries the same `title=` help text as
  the badge component for a mouse-hover explainer.
- Route-mode rows use the swatches from route-styles.md; add one line under
  the route group: "Dashed lines mean the route is Hypothetical — a
  scholarly idea, not proven." This repeats the tier glyph's meaning in
  plain words for the 10-year-old reading the legend top-to-bottom.
- Legend is a `<dl>` (term = swatch+glyph, description = label) so it reads
  correctly to a screen reader as a list of definitions, not a wall of
  spans.

## "Approximate reconstruction" caption rule

Any time the map shows a **reconstructed** geographic feature not itself
sourced to modern survey data — a historical coastline (map-architecture.md
calls this out explicitly), a conjectural route waypoint set, or period
land/sea extent that differs from Natural Earth's present-day coast — the
map surface must carry a visible caption, not just a tooltip:

```
figcaption.map-caveat (always visible, not visually-hidden):
  "Approximate reconstruction — coastlines and some routes are drawn from
   historical and scholarly sources, not satellite survey."
```

- Position: directly under the period label bar, `--text-xs`,
  `--map-label` at 80% opacity, so it's legible but doesn't compete with
  the period heading.
- Shown whenever `src/data/coastlines.json`-style reconstructed geometry is
  present for the active period, or whenever any visible route/port is
  `Hypothetical`/`Probable`; hidden only if literally everything on screen
  is `Confirmed`/`Strongly Supported` and drawn from present-day coastline
  (an edge case that may never occur — default to showing it).
- This caption is in addition to, not instead of, per-entity `EvidenceBadge`
  and `SourcePopover` — it is a map-wide disclaimer, they are per-claim
  citations.

## Keyboard-keys popover

Triggered by the `[?]` button (also by pressing `?` while the figure has
focus, per map-architecture.md's keyboard handler).

```
┌─────────────────────────────┐
│  Map keyboard shortcuts   [x]│
│  ─────────────────────────── │
│  Tab / Shift+Tab   move between markers │
│  Enter / Space     open the selected marker │
│  Esc               close panel, return focus │
│  + / =             zoom in       │
│  -                 zoom out      │
│  Arrow keys        pan 40px      │
│  0                 reset view    │
│  ?                 toggle this panel │
└─────────────────────────────┘
```

- Implemented as a native `<dialog>` or a focus-trapped `<div role="dialog"
  aria-modal="true" aria-labelledby="keys-title">`; opening moves focus to
  its close button, closing returns focus to the `[?]` trigger.
- `Esc` closes it (does not also close a port panel that might be open
  underneath — only the topmost layer, per `--z-popover` vs `--z-panel`).
- Content is a `<table>` or `<dl>` — two columns, key then action — never an
  image of keys, so it's screen-reader readable and translatable later.

## Zoom controls

Three 44×44 px buttons, bottom-left, vertically stacked, `aria-label`
"Zoom in" / "Zoom out" / "Reset view" — mirrors and supplements (never
replaces) the keyboard shortcuts, since not every visitor discovers `+`/`-`.
Disabled state (`aria-disabled="true"`, 40% opacity) at `scaleExtent`
bounds, per map-architecture.md's `d3-zoom` config.

## Period label

```
"Chola Age · 900 CE – 1200 CE"
```

`--font-heading`, `--text-lg`, sits at the top of the map surface (both
breakpoints), updates on Timeline change with the same `--dur-page` cross-
fade the markers use — never a hard cut, so the map and the period label
turn "the page" together.

## States

| State | Treatment |
|---|---|
| Default | Legend closed (360px) / open (≥900px), no selection, empty side panel. |
| Marker hover/focus | Glow halo brightens (`--map-port-glow` / route hover per route-styles.md), cursor pointer. |
| Marker selected | Card/panel opens; marker gets a persistent ring at `--gold-400`, 3px. |
| Period switching | Cross-fade `--dur-page`/`--ease-page`; inactive-for-new-period markers fade to 40%; nothing remounts (map-architecture.md). |
| Reduced motion | Cross-fade becomes an instant swap; route flow and ship animation stop (route-styles.md). |
| Keys popover / port panel open | Focus trapped in the topmost dialog; background map still visible (dimmed with `--scrim` only on the 360px bottom-sheet case where the panel overlays the map). |

## Accessibility notes

- The whole map is one `<figure role="group" tabindex="0" aria-label="Map of
  Kalinga trade routes, {period label}">` per the existing stub; the
  `figcaption` (marker index) stays `.visually-hidden` but the "Approximate
  reconstruction" caption above is a *second*, visible caption element —
  don't merge them.
- Focus order: skip link → figure → each marker in `load.ts` array order →
  zoom controls → keys-popover trigger → legend → (900px+) side panel
  contents, matching map-architecture.md.
- Every icon-only control (zoom, keys trigger, legend summary chevron) has
  a text `aria-label`; nothing communicates by icon shape alone.

## Tokens used

`--map-sea`, `--map-land`, `--map-land-edge`, `--map-river`, `--map-label`,
`--map-port`, `--map-port-glow`, route tokens (route-styles.md),
`--tier-*`, `--type-*`, `--focus-ring`, `--scrim`, `--z-map`, `--z-panel`,
`--z-popover`, `--hit-min`, `--space-*`, `--radius-md`, `--dur-page`,
`--ease-page`, breakpoint `56.25rem`.
