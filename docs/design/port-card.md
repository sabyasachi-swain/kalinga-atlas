# Port card

## Purpose

Step two of the map's progressive disclosure (dot → **card** → panel). The
card is what appears the instant a visitor selects a port marker: enough to
answer "what is this place?" in one glance, with a clear path to more. Same
component renders a route's or site's card too (see "Route and site
variants" below); this file specifies the port variant in full and the
deltas for the others.

## Anatomy

```
┌─────────────────────────────────────┐
│ ●  Manikapatna                    [x]│  <- glyph matches marker (port-marker.svg),
│    "A busy port where ships loaded   │     name in --font-heading, close button
│     rice and cloth for lands far     │     44px, top-right
│     across the sea."                 │  <- summary, kid-facing, --text-md
│                                       │
│  ✓ Strongly Supported  ■ Scholars say│  <- EvidenceBadge (level, type)
│  Sources: Tripathy 2010, p.44; …  [▾]│  <- SourcePopover, collapsed by default
│                                       │
│           [ Learn more → ]           │  <- opens PortPanel, 44px min height
└─────────────────────────────────────┘
```

- Appears as a bottom sheet at 360px (slides up over the map, `--scrim`
  behind it dims the map so focus is unambiguous) and as the side-panel
  content at ≥900px (no scrim needed — it's a sibling column, not an
  overlay, per atlas-map.md's ≥900px layout).
- Card surface: `--bg-elevated` (parchment-200) on `--fg` (ink-900) — this
  is the one place the map's dark theme switches to the parchment page
  theme, marking a clear transition from "chart" to "page."
- Width: full-width sheet at 360px; fills the side-panel column at ≥900px
  (`max-width: none` inside that column, `--content-max` doesn't apply —
  panel is already narrower than that).

## States

| State | Treatment |
|---|---|
| Entering | Slides up (360px: `translateY(100% → 0)`) or fades in (≥900px), `--dur-base`/`--ease-page`. |
| Default | As sketched above. |
| Source popover open | `<details>` expands in place per `SourcePopover.astro`; card grows, does not scroll internally unless it exceeds ~60vh. |
| Focus | Close button and "Learn more" both get `--focus-ring`; card itself is not focusable (its trigger, the marker, keeps `aria-expanded` state instead). |
| Dismissed | `Esc` or `[x]` closes the card and returns focus to the originating marker (map-architecture.md's focus-return rule). |
| Reduced motion | Enter/exit is an instant show/hide, no slide or fade. |
| Loading (should not normally occur) | N/A — panel content is pre-rendered static HTML per a `<template>` per entity (map-architecture.md), so there is no network fetch/spinner state. |

## Route and site variants

- **Route card**: glyph is the route's mode swatch (route-styles.md) instead
  of a port dot; summary becomes `kid_line` if present else `summary`; badge
  row unchanged; "Learn more" opens the route's panel (endpoints, goods
  carried, waypoint caveats).
- **Site card**: glyph is `site-marker.svg`; adds a one-line `site_type`
  under the name (e.g. "Fortified urban centre"); otherwise identical
  layout.

## Accessibility notes

- Card container: `role="dialog"` only in the 360px overlay case (it
  traps focus and dims the background, so it behaves modally); at ≥900px
  it's a normal, non-modal region (`aria-live="polite"` on a wrapper so
  screen-reader users get notified when its content changes on
  reselection, but focus is not forced into it — keeps the map fully
  navigable while the panel updates, per map-architecture.md's model where
  selection opens the panel but doesn't strand keyboard users there).
- `[x]` has `aria-label="Close"`, 44×44 px.
- The EvidenceBadge and SourcePopover are never omitted, resized to
  illegibility, or replaced with colour-only chips — this is the rule the
  whole app exists to protect (CLAUDE.md: "no source, no render").
- Kid-facing summary text is the *first* thing after the name — a 10-year-
  old should never have to read past a citation to find out what the place
  is.

## Tokens used

`--bg-elevated`, `--fg`, `--fg-muted`, `--font-heading`, `--text-md`,
`--text-sm`, `--space-3/4/6`, `--radius-md`, `--shadow-card`, `--scrim`,
`--focus-ring`, `--hit-min`, `--dur-base`, `--ease-page`, `--z-panel`,
tier/type tokens via `EvidenceBadge`.
