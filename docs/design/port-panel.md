# Port panel

## Purpose

Step three of progressive disclosure (dot → card → **panel**): everything
the atlas knows about one port, reached via "Learn more" on the port-card,
or landed on directly at `/ports/<id>` (section-page.md's entity detail
page, which renders this same content full-page rather than in a sheet).
Adds finds, goods, periods and caveats — never removes the badge or source
the card already showed.

## Anatomy

```
┌───────────────────────────────────────────┐
│ [← Back]              ●  Manikapatna    [x]│
│  "A busy port where ships loaded rice and  │
│   cloth for lands far across the sea."     │
│  ✓ Strongly Supported   ■ Scholars say     │
│  Sources: Tripathy 2010, p.44; Ray 1994 [▾]│
│ ───────────────────────────────────────── │
│  Active in: [Early Historic] [Gupta] [Medieval] │ <- period chips
│ ───────────────────────────────────────── │
│  What was traded here                      │
│  🌾 Rice  🧵 Cotton cloth  🐘 Ivory  …      │ <- goods chips, icon+name,
│                                             │    each opens the good's own
│                                             │    card on tap (Goods section)
│ ───────────────────────────────────────── │
│  Also known as: Palura (Ptolemy)*          │ <- only if also_known_as set
│ ───────────────────────────────────────── │
│  ▸ Scholar notes                           │ <- <details>, closed by default
│    (caveats: identification debated; see   │
│     also finds excavated nearby)           │
│    Finds:                                  │
│    • Rouletted ware — 2nd c. CE trade link │
│      to the Bay of Bengal [source]         │
│ ───────────────────────────────────────── │
│  Routes through here                       │
│  → Maritime to Suvarnabhumi (Probable)     │
│  → Coastal to Tamralipti (Confirmed)       │
└───────────────────────────────────────────┘
```

- Structurally the card's header (name, glyph, summary, badge, source) is
  reused verbatim at the top — the panel *extends* the card, it doesn't
  redesign it, so a visitor who scrolled past the card into the panel never
  loses the citation they already trusted.
- `[← Back]` returns to the card (sheet/panel-column collapses one level);
  only present when reached via "Learn more" — absent on the standalone
  `/ports/<id>` page, replaced there by ordinary page navigation
  (section-page.md).
- Period chips use the same pill shape as `EvidenceBadge` but neutral
  colour (`--bg`/`--fg-muted` border) — they are navigational context, not
  an evidence claim, so they must not be mistaken for a tier badge.
- Goods chips: icon (from the goods-icon wave; until then, a text-only pill)
  + name, `--hit-min` tall, tapping opens that good's own card — this is
  the seam cargo-manifest.md's "What's in the ship?" sheet also uses, so
  the same chip component serves both.

## "Scholar notes" disclosure

- Native `<details>`, closed by default (kid-first: the caveats and finds
  are real but secondary). `<summary>` reads "Scholar notes" plus a small
  count if there are finds, e.g. "Scholar notes (2 finds)".
- Contains: `caveats` (free text, if present), then the `finds[]` list, each
  find with its own `SourcePopover` (finds carry independent `source_refs`
  per `schema.ts`) — never inherit the port's citation for a claim that has
  its own.
- This is the one place UNVERIFIED-adjacent nuance lives; it is still never
  UNVERIFIED content itself (that never reaches `published`), just the
  lower-confidence and disputed detail a Confirmed port can still carry.

## Related routes

- A plain list, not a mini-map — each row is the route's mode glyph +
  destination name + tier glyph, e.g. "→ Maritime to Suvarnabhumi
  (Probable)". Tapping a row selects that route on the main map (scrolls it
  into view/opens its own card) rather than duplicating route detail here.

## States

| State | Treatment |
|---|---|
| Entering (from card) | Content crossfades/slides in place, `--dur-base`; header does not re-animate since it's unchanged from the card. |
| Default | As sketched. |
| Scholar notes expanded | `<details open>`; height auto, no animation needed (native disclosure). |
| Goods/route chip focus | `--focus-ring`; chip is a real `<button>` or `<a>`, never a `<div onclick>`. |
| Empty sub-sections | A section with no data (no `also_known_as`, no `finds`) is omitted entirely, not shown empty — never render "Finds: none" as if it were a claim. |
| Reduced motion | No slide/crossfade; content simply appears. |

## Accessibility notes

- Panel is a landmark (`<section aria-labelledby="port-name-id">`) so
  screen-reader users can jump straight to it.
- `[← Back]` and `[x]` are both real buttons with text labels, 44px.
- Every good/route chip has a full-sentence `aria-label` when its visible
  text is icon+short-name only, e.g. `aria-label="Rice, a traded good, open
  details"`.
- Reading order matches visual order top-to-bottom; the disclosure keeps
  "Scholar notes" out of tab order while collapsed (native `<details>`
  behaviour already does this — no extra `tabindex` management needed).

## Tokens used

Everything from port-card.md, plus `--bg`, `--fg-muted`, `--rule` (section
dividers), `--radius-pill` (period/goods chips), `--icon-sm`/`--icon-md`
(goods chip icons), `--space-6` (section gaps).
