# Cargo manifest ("What's in the ship?")

## Purpose

A dedicated sheet, opened from a port or route panel ("What's in the
ship?" button) or from the Goods section page, that turns a list of
`Good` ids into a browsable, kid-first grid. It is the good-icon wave's
main consumer — this spec is written against the placeholder
`src/assets/goods/_template.svg` chip layout so the next wave's icons drop
in with no layout change.

## Anatomy

```
┌───────────────────────────────────────────┐
│  What's in the ship?                    [x]│
│  Goods carried on the Manikapatna–          │
│  Suvarnabhumi route, Gupta period           │
│ ───────────────────────────────────────── │
│  ┌────────┐ ┌────────┐ ┌────────┐          │
│  │  🌾    │ │  🧵    │ │  🐘    │          │  <- icon --icon-lg, 2 per row
│  │  →     │ │  ↔     │ │  ←     │          │     at 360px, 3–4 at wider
│  │ Rice   │ │Cotton  │ │ Ivory  │          │
│  │"Rice   │ │cloth   │ │"Traders│          │  <- kid_line, --text-sm,
│  │ fed    │ │"Woven  │ │ prized │          │     3-line clamp
│  │ sailors │ │ in     │ │ elephant│         │
│  │ for    │ │ Kalinga│ │ ivory  │          │
│  │ months."│ │ towns."│ │ for…"  │          │
│  │ ✓ ◆    │ │ ~ ■    │ │ ✓✓ ◆  │          │  <- EvidenceBadge, compact
│  └────────┘ └────────┘ └────────┘          │
│  … more goods …                             │
└───────────────────────────────────────────┘
```

- Grid: `grid-template-columns: repeat(2, 1fr)` at 360px, `repeat(3, 1fr)`
  at ≥600px, `repeat(4, 1fr)` at ≥900px (tokens.md breakpoints); `gap:
  var(--space-4)`.
- Each cell is a `<button>` (opens that good's own card, same chip
  component as the goods chips in port-panel.md) — the whole cell is
  tappable, not just the icon, keeping the target well above 44px.
- Direction arrow glyph sits directly under the icon, above the name, so it
  reads as part of the icon group rather than decoration: `→` export (goods
  leaving Kalinga), `←` import (goods arriving), `↔` both. This is a glyph
  in addition to any colour the icon might carry — direction is never
  colour-coded alone.
- `kid_line` (already <=160 chars, FK-checked by `npm run readability`) is
  the primary copy in the cell; `summary` is not repeated here to avoid
  redundant reading — full `summary` and citation detail live one tap away
  on the good's own card.
- `EvidenceBadge` renders `compact` (glyphs only, full labels for screen
  readers) to keep the cell height sane in a dense grid — this is the one
  place `compact` is preferred over the full badge, because the full badge
  already appears on the good's own card one tap away.

## Direction glyph legend

Shown once, above the grid, so the three arrows are explained before the
visitor scans 20 icons:

```
→ Leaves Kalinga (export)   ← Arrives in Kalinga (import)   ↔ Both directions
```

## States

| State | Treatment |
|---|---|
| Entering | Sheet slides up (360px) / opens as a centred modal (≥600px, `max-width: 40rem`), `--dur-base`. |
| Default | Grid as sketched, sorted by `category` then `name` (stable, not by evidence tier — tier is not a ranking). |
| Cell hover/focus | `--focus-ring`; cell lifts with `--shadow-card` intensified, `--dur-fast`. |
| Cell selected | Opens the good's card in place of the manifest sheet (same navigational depth, "Back" returns to the grid) — mirrors the port card→panel back pattern. |
| Empty (route/port has no `goods`) | The "What's in the ship?" trigger button is not rendered at all — never open an empty manifest. |
| Long list (>12 goods) | Sheet scrolls internally; header (title + direction legend) stays sticky at top so context isn't lost while scrolling. |
| Reduced motion | Instant show/hide, no slide. |

## Accessibility notes

- Sheet is `role="dialog" aria-modal="true" aria-labelledby="manifest-title"`,
  focus moves to `[x]` on open, returns to the trigger button on close.
- Each cell's accessible name is a full sentence composed from the visible
  parts, e.g. `aria-label="Rice, leaves Kalinga, Confirmed, archaeological.
  Rice fed sailors for months."` — so a screen-reader user gets the
  direction and evidence information even though it's conveyed by glyphs
  visually.
- Grid uses `role="list"` / cells `role="listitem"` semantics implicitly via
  a `<ul>`/`<li>` structure wrapping the buttons, so assistive tech
  announces "12 items" rather than 12 unrelated buttons.
- Icon alone never carries the good's identity — name text is always
  visible under the icon, per the design system's rule that colour/shape
  never stands alone (goods icons are line icons distinguished mostly by
  shape, which is why the text label is mandatory here, not optional).

## Tokens used

`--icon-lg` (icon display size), `--text-sm`/`--text-xs`, `--space-2/4`,
`--radius-md`, `--shadow-card`, `--bg-elevated`, `--fg`, `--focus-ring`,
`--dur-base`, `--dur-fast`, `--z-panel`, `--scrim` (≥600px modal backdrop),
tier/type tokens via `EvidenceBadge` (compact).
