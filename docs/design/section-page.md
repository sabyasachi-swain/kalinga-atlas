# Section page & entity detail page

## Purpose

One shared skeleton for the five section index pages (`/routes`, `/ports`,
`/goods`, `/evidence`, `/sources`) and the entity detail pages
(`/ports/<id>`, `/routes/<id>`, `/goods/<id>`, `/sites/<id>`,
`/inscriptions/<id>`). This spec documents the pattern already implemented
in `src/pages/ports/index.astro` and `src/pages/ports/[id].astro` (and
mirrored in `evidence/index.astro`, `sources.astro`) so every future page —
and any edit to an existing one — stays consistent, and records the one
question those files don't yet answer on their own: **where narrative
Markdown sits relative to the structured data card.**

## Section index layout (`/ports`, `/routes`, `/goods`, `/evidence`)

```
360px and up (single column; card grid reflows, never the structure):
┌───────────────────────────────────┐
│  Ancient Ports                     │  <- h1, --font-heading
│  {intro from src/content/sections/ │  <- Markdown intro if the editor has
│   ports.md, or a fallback lede}    │     written one; else a fallback
│                                     │     <p class="lede"> one-liner —
│                                     │     the page is never blocked on
│                                     │     narrative content existing yet.
│  〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰  │  <- WaveDivider (ornament/wave-divider.svg)
│                                     │
│  ┌────────────┐ ┌────────────┐    │  <- EntityCard grid,
│  │ Name        │ │ Name        │    │     minmax(18rem,1fr), 1 col at
│  │ summary/    │ │ summary/    │    │     360px, 2+ as it widens
│  │ kid_line    │ │ kid_line    │    │
│  │ [badge][src]│ │ [badge][src]│    │  <- EvidenceBadge compact +
│  └────────────┘ └────────────┘     │     SourcePopover, every card
└─────────────────────────────────────┘
```

- `/evidence` is the one index with two entity kinds (sites, inscriptions):
  same pattern repeated under two `<h2>`s rather than interleaved — each
  kind gets its own heading, its own empty state, its own card grid.
- `/sources` is a deliberate exception: it is a bibliography, not a card
  grid — full citations grouped under `registry_category` headings
  (primary / secondary / site-report / early-modern / geospatial), plain
  `<ol>`, no `EntityCard`. It keeps the same page chrome (`Base`, `h1`,
  `--gutter`/`--content-max`) but its content region is narrower (50rem,
  set in `sources.astro`) because it's reading-width prose+list, not a
  scannable grid.
- Empty state: a section with zero published entities shows one italic
  `--fg-muted` line ("No published ports yet.") in place of the grid —
  never an empty grid or a spinner (there is nothing to fetch; `load.ts`
  data is build-time static).

## Entity detail page layout (`/ports/<id>`, etc.)

```
┌───────────────────────────────────┐
│  ← Back to the atlas               │  <- returns to `/#ports` (the map’s
│                                     │     section anchor), not browser back
│  Manikapatna                       │  <- h1
│  [✓ Strongly Supported][■ Scholars]│  <- EvidenceBadge, full (not compact)
│  [Early Historic] [Gupta] [Medieval]│ <- PeriodChips
│                                     │
│  "A busy port where ships loaded   │  <- summary, --text-lg, --fg-muted,
│   rice and cloth..."               │     max-width 46rem
│                                     │
│  {Narrative Markdown, if written}  │  <- editor-authored prose, max-width
│  Multiple cited paragraphs, each   │     42rem, sits directly under the
│  ending [Author, Year, p.XX]. Or   │     summary — same reading column,
│  "Narrative coming soon."          │     narrower than the page so it
│                                     │     reads as continuous prose before
│                                     │     the structured data below.
│  ─────────────────────────────     │
│  Facts                             │  <- h2, definition list: coordinates
│  Coordinates  20.1°, 86.4° [source]│     (+ coordinate_source popover),
│  Modern name  ...                  │     modern_name, also_known_as,
│  Also known as ...                 │     region — entity-specific fields
│  Region  kalinga                   │     from schema.ts, not prose
│  ─────────────────────────────     │
│  Routes through Manikapatna        │  <- h2, EntityCard grid of related
│  [card][card]                      │     routes (same card component as
│  ─────────────────────────────     │     the index page)
│  Goods documented here             │  <- h2, EntityCard grid of related
│  [card][card]                      │     goods
│  ─────────────────────────────     │
│  ▸ Scholar notes                   │  <- ScholarNotes, closed <details>,
│    caveats + full citation list    │     always last on the page
└─────────────────────────────────────┘
```

### Where narrative sits relative to the data card — the rule

**Narrative Markdown goes immediately after the kid-facing `summary` and
before every structured, schema-derived section** (Facts, related Routes,
related Goods, Finds). Rationale:

1. The summary + badges answer "what is this and how sure are we" in one
   glance — that must never be pushed below a wall of prose.
2. The narrative is the *story*, told in order, citations inline — it reads
   best as continuous prose immediately after the one-line summary, before
   the visitor's eye switches into "scanning a spec sheet" mode for
   coordinates and chip grids.
3. Structured sections (`Facts`, `Routes through…`, `Goods documented
   here`) are derived straight from `schema.ts` fields and cannot fail to
   exist if the entity is published (H1–H7 already guarantee `summary`,
   `evidence_level`, etc.); narrative is optional and editor-authored on a
   different timeline, so it must degrade gracefully (`Narrative.astro`'s
   "Narrative coming soon." placeholder) without ever blocking or
   reordering the structured sections around it.
4. `ScholarNotes` (caveats + full citation list) is always last — it is the
   deepest disclosure level (dot → card → panel → **scholar notes**), and
   putting it last means a keyboard user tabbing top-to-bottom meets the
   kid-facing content first by construction, not by a separate "kid
   mode/scholar mode" toggle.

This ordering already matches `ports/[id].astro`'s implementation; this
document exists so `routes/[id]`, `goods/[id]`, `sites/[id]` and
`inscriptions/[id]` (and any future entity type) follow the same order
rather than each page inventing its own.

## States

| State | Treatment |
|---|---|
| Default | As sketched. |
| No narrative yet | `Narrative.astro` renders "Narrative coming soon." in italic `--fg-muted` — the page is otherwise complete and never looks broken. |
| No related routes/goods/finds | That whole `<section>` (heading included) is omitted, exactly as `port-panel.md` specifies for the panel — an index page and its detail page must agree on this rule so a visitor doesn't see conflicting "there's nothing here" signals between the map panel and the full page. |
| Scholar notes expanded | Native `<details open>`, no animation needed. |
| Card hover/focus (index page) | `h3 a` underlines on hover/focus-visible; whole card is not a link (only the title is) so the badge/source-popover inside the card remain independently interactive — do not wrap the whole `<li>` in an `<a>`. |
| Long card grid | `grid-template-columns: repeat(auto-fill, minmax(min(100%, 18rem), 1fr))` already handles reflow at any width without a breakpoint list. |

## Accessibility notes

- `<article>` per page, one `<h1>`, `<h2>` per subsection, each subsection
  with `aria-labelledby` pointing at its heading id — already the pattern
  in `ports/[id].astro`; keep it for every entity type.
- "Back to the atlas" is a real link to `/#ports` (or the relevant section
  anchor), not a `history.back()` script — works from a shared/bookmarked
  URL, not just when arriving via in-app navigation.
- `EntityCard` renders `EvidenceBadge` `compact` on index pages (grid
  density) and the full badge on detail pages (it's the primary claim on
  that page, deserves the full label) — this mirrors the compact-vs-full
  split already specified for the cargo manifest vs. the good's own card.
- Every card's description text (`kid_line` for goods, `summary`
  otherwise) is real text in the DOM, not a `title` attribute — screen
  readers and find-in-page both need it directly readable.

## Tokens used

`--content-max`, `--gutter`, `--space-4/6/8`, `--text-lg`/`--text-md`,
`--fg`/`--fg-muted`, `--bg-elevated`, `--radius-md`, `--shadow-card`,
`--rule`, `--accent-2` (wave-divider colour), `--font-heading`, plus every
token already listed for `EvidenceBadge`, `SourcePopover`, `PeriodChips`
and `ScholarNotes`.
