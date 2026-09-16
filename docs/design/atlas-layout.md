# Atlas home page — layout and timeline spec

## Purpose

Fixes five measured layout bugs and adds one new context layer to the home
page's `Atlas` island (map + timeline + legend + "Did you know?" toast +
detail panel). This spec **overrides** the layout portions of
`docs/design/atlas-map.md` and `docs/design/timeline.md` where they
conflict; their anatomy, keyboard model and states stand except where noted
below. Colour values are unchanged from `docs/design/map-style-light.md`
except the one new token for the country-borders layer.

This is a spec only. The engineer implements it in `src/islands/Atlas.tsx`,
`src/islands/AtlasMap.tsx`, `src/islands/Timeline.tsx` and
`src/styles/atlas.css`. Nothing here was written into those files.

## Problem list (as measured on the running site)

1. **The "Did you know?" toast covers the slider mid-drag, and refires once
   per period crossed.** Confirmed by the coordinator: dragging from
   "Mauryan Kalinga" to "British colonial" swaps the fact card repeatedly;
   `document.elementFromPoint` at the slider's own centre returns a citation
   `span` inside the toast, not the slider, immediately after a drag at
   1280px; at 380px the toast renders taller than the timeline itself,
   directly beneath it.
2. **Four of eleven period bands render a blank label at 1280px; all eleven
   are blank at 380px.** `.tl-band-label` measures 0px wide — the current
   rule drops text entirely below a width threshold instead of truncating.
   Two-row lane staggering (not real overlap — 0 band-vs-band overlaps were
   measured at 1280px) reads as "overlapping" to the owner because blank
   boxes next to truncated ones with no visual relationship look broken.
3. **The slider is off-screen while the map is in view.** At 1280×900 the
   `.atlas-timeline__range` centre sits 888px below the top of the map card,
   because the legend (324px) sits between the map canvas and the timeline,
   and the map card itself is 764px tall for a 440px canvas.
4. **The legend (324px) sits between the map canvas and the timeline**,
   pushing them apart — see #3.
5. **The map canvas is only ~58% of its own card's height** (440 of 764px)
   at 1280px — the rest is chrome and the legend.
6. **`public/geo/countries-50m.json` is fetched but never drawn.** No
   orientation layer exists for a visitor unfamiliar with the Bay of Bengal
   coastline.

## Fix summary (recommendation per problem)

| # | Recommendation |
|---|---|
| 1 | Toast's containing box becomes the map card/host, never the viewport — geometrically cannot reach the timeline. Debounce fact selection to one card per settled period, not one per period crossed. |
| 2 | Move period **names** out of the SVG bands entirely into a real, horizontally-scrollable HTML chip strip with a guaranteed-readable minimum width. SVG bands become an unlabelled proportional ruler. |
| 3+4 | Legend moves from an in-figure `<details>`/`<aside>` to a **popover triggered by a map control chip** ("Map key"), same pattern as the existing `[?]` keyboard-shortcuts dialog. This removes the 324px block between the map and the timeline entirely, at every width, with no new grid column. |
| 5 | Deepen the canvas aspect ratio, raise `min-height`, and cap `max-height` in `dvh` so the canvas — not chrome — fills the card, and the map+timeline block fits one typical viewport without the legend's stolen space. |
| 6 | A single faint, non-interactive, `aria-hidden` borders path drawn from `countries-50m.json`, hidden below a zoom threshold, always behind routes/markers, captioned as modern and not a historical claim. |

---

## 1. "Did you know?" toast — placement and firing rule

### What it is, precisely

`Atlas.tsx`'s `<aside className="atlas-fact" role="status">` — the
`did-you-know.md` toast, `position: fixed`, `z-index: 30`. Measured
directly: at 1280×900, 1405×800 and 380×800 the toast's rectangle does
**not** geometrically intersect the slider's rectangle at rest. The real
problem, confirmed by two rounds of measurement, is two separate things,
neither of which is "the toast sits on top of the slider":

1. **It refires on every period crossed while dragging** — a different
   fact (Ashoka's, then Sisupalgarh's, and so on) appears and re-triggers
   the show/dismiss animation and its `FACT_TIMEOUT_MS` timer once per
   period the pointer passes over, because `fact` is recomputed from
   `activePeriod` on every render with no debounce.
2. **It is fixed to the viewport, not to the map**, so it never scrolls
   away and permanently occupies real screen space — at 380×800 it
   blankets the lower half of the viewport (y 447–784 of an 800px-tall
   window) for as long as it's shown. On a visitor's own, possibly shorter,
   window this fixed bottom-anchored block can reach far enough up the
   screen to sit directly over the timeline even without any dragging at
   all. This is why it *reads* as "a popup in the way" during timeline use,
   even on layouts where the rectangles happen not to overlap at test size.

So the fix below is framed correctly as: **stop the toast competing with
the timeline for the same fixed screen real estate, and stop it firing
once per period crossed** — not "move it off the slider," which measurement
shows was never literally true, but which does not change what needs
fixing.

### Placement fix — geometric, not z-index

The toast's containing block becomes the **map figure/host**, not the
viewport:

- Inline (≥ 37.5rem, live map visible): `position: absolute` inside
  `.atlas-map`, anchored top-right, below the `.atlas-map__topbar` period
  label — the same overlay layer the zoom controls and hint already use.
- Below 37.5rem in normal page flow (live map replaced by the static
  preview + "Explore the map" button, per `kid-experience.md` A3): anchor
  the toast the same way, `position: absolute` inside `.atlas-map-slot`
  (the preview card), top-right.
- Inside the fullscreen map `<dialog>`: anchor inside
  `.atlas-map-dialog__host` (the map portion), top-right — **never** inside
  or overlapping `.atlas-map-dialog__timeline` (the docked timeline strip
  at the bottom of the dialog).

Because the toast's positioning context is always the map's own box, and
the timeline is always a sibling that starts only after that box plus a
fixed gap (`--space-3` at 380px, `--space-4` at 1280px), the toast's
rectangle cannot extend into the timeline's rectangle. This is a structural
guarantee, not a stacking-order fix — no z-index arrangement is relied on.

### Sizing and the "too short for both" case

- `max-width: min(22rem, calc(100% - 2 * var(--space-3)))` (unchanged
  footprint from today).
- New: `max-height: min(20rem, 55%)` of the containing map box;
  `.atlas-fact__body` gets `overflow-y: auto` so a long fact scrolls
  internally instead of growing the card.
- New **collapsed pill** state for short viewports: when the containing map
  box reports a height under `24rem` (checked the same way `AtlasMap.tsx`
  already reads computed custom properties, or via a `ResizeObserver` the
  engineer already has for the map host), the toast renders as a 44×44px
  round "ⓘ" pill instead of the full card (`aria-expanded="false"
  aria-controls="fact-card-id"`, `aria-label="Did you know?"`). Activating
  it (click/Enter/Space) expands the full card as a popover anchored to the
  pill, still confined to the map box; `Esc` or the close button collapses
  it back to the pill and returns focus to the pill. This guarantees the
  toast never needs to borrow space from the timeline even when the
  viewport is too short to show a full card and a full map comfortably.
- This directly answers "what happens on a shorter viewport than tested":
  because the toast's container is now the map box (§ below) rather than
  the viewport, and the map box's own height is capped by
  `--atlas-map-max-h: min(46rem, 62dvh)` (§5), a short viewport shrinks the
  map box first — which shrinks the toast's positioning context and
  triggers the collapsed-pill threshold automatically, via the same
  `ResizeObserver` measurement, with no separate viewport-height check
  needed. A short window can never reproduce the old bug (a fixed card
  blanketing the lower half of the screen) because the toast is no longer
  fixed to the viewport at all.
- The badge and citation (`Badge` + `Sources`) are present in both the pill
  state (as content of the expanded popover) and the full card — nothing
  about evidence is lost by collapsing.

### Firing rule — one fact per settled period, not one per period crossed

- The map's `activePeriod` still updates live on every `input` tick
  (unchanged — this drives the map and the timeline callout, which are
  cheap to re-render and are specified elsewhere to update live).
- The **toast's** fact selection is gated by a settle debounce:
  `--dur-toast-settle: 500ms` (new token, motion section of
  `tokens.css`, not zeroed by `prefers-reduced-motion` — it is an
  interaction debounce, not an animation).
  - On every `activePeriod` change, (re)start a 500ms timer.
  - Only when the timer fires — i.e., 500ms have passed with no further
    `activePeriod` change **and** the range input is not currently pressed
    (no active pointer-down on the thumb, no key held for repeat) — does
    the component recompute the period-based fact and, if it differs from
    the fact already shown, display it.
  - Practical effect: dragging from "Mauryan Kalinga" to "British colonial"
    shows at most one fact card, for wherever the drag ends, not eleven.
- **Exception**: a fact shown because the visitor selected a specific
  port/route/site (marker click, not the timeline) is not subject to the
  settle delay — that is a discrete action, not a scrub gesture, and can
  show immediately as today.
- The toast never calls `.focus()` and never traps focus on appearing — it
  stays `role="status"`/`aria-live="polite"`, announced without moving
  focus, so a keyboard user stepping the slider with arrow keys is never
  interrupted mid-navigation.
- Dismiss, hover-hold, focus-hold and the citation `<details>` holding the
  auto-dismiss timer (`did-you-know.md`) are unchanged.

### States

| State | Treatment |
|---|---|
| Default (enough room) | Full card, top-right of the map box. |
| Default (short viewport) | Collapsed 44px pill; expands to a popover on activation. |
| Settling (drag in progress) | No toast changes; existing toast (if any) stays as-is. |
| Settled (500ms after last change) | New fact (if different) fades in per `did-you-know.md`'s existing `fact-in` animation. |
| Held (hover/focus/citation open) | Auto-dismiss timer paused, unchanged. |
| Reduced motion | `fact-in` animation skipped (existing rule); the 500ms settle debounce is unaffected (not a CSS animation). |

### Tokens used / added

Used: `--z-toast`, `--bg-elevated`, `--rule`, `--radius-md`,
`--shadow-card`, `--space-*`, `--hit-min`, `--focus-ring`, `--dur-base`,
`--ease-page`.
**New**: `--dur-toast-settle: 500ms` (motion section, `tokens.css`).

---

## 2. Period chips and the timeline axis

### The bug, restated

`Timeline.tsx` draws each `Period` as an SVG `<rect>` + `<text>` inside an
`aria-hidden` axis. When a band's pixel width can't fit its label at the
current character-width estimate, the label is dropped entirely (`showLabel
= b.width > 54`) rather than truncated — at 380px, where 11 periods share
one narrow strip, this drops **every** label. At 1280px it drops the four
narrowest.

### Fix — move names out of the SVG, into real HTML chips

The SVG axis keeps doing what it's good at (a proportional, colour-coded
ruler with tick marks) and stops trying to fit prose into rectangles. Names
move to a new, ordinary HTML row above the ruler:

```
360–1280px, same structure, chip row scrolls independently of the page:

┌─────────────────────────────────────────────────┐
│ Explore the timeline                             │
│ ┌────────┐┌──────────────┐┌────────┐┌──────────┐│ <- .atlas-timeline__chips
│ │Mauryan ││Kharavela and…││ Early  ││  Gupta   ││    real <button>s,
│ │Kalinga ││              ││historic││ centuries││    horizontal scroll,
│ └────────┘└──────────────┘└────────┘└──────────┘│    snap, 44px tall
│ 300BCE─┬────┬───┬──────┬───┬────┬────────┬─1900CE│ <- .atlas-timeline__axis
│ ▓▓▓▓▓▓ ▒▒▒▒ ▓▓▓ ▒▒▒▒▒▒ ▓▓▓ ▒▒▒▒ ▓▓▓▓▓▓▓▓ ▓▓▓▓▓▓▓ │    unlabelled colour
│ ────────────────▲───────────────────────────────│ <- native range input
│ Early Historic Period · 300 BCE – 200 CE         │ <- callout (unchanged)
│ "Kalinga's ships begin reaching Sri Lanka."      │
└─────────────────────────────────────────────────┘
```

### Chip strip anatomy

- `<ul class="atlas-timeline__chips" role="list">` of `<li><button></button
  ></li>`, one per period in `order`, `overflow-x: auto`,
  `scroll-snap-type: x proximity`, `-webkit-overflow-scrolling: touch`.
- Each chip: `min-width: 7rem` (new local var
  `--timeline-chip-min-w: 7rem`), `max-width: 12rem`
  (`--timeline-chip-max-w: 12rem`), `min-height: var(--hit-min)` (44px),
  `white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`.
- `title={`${period.label} · ${formatYear(start)} – ${formatYear(end)}`}`
  on every chip, so a mouse user always gets the untruncated name and dates
  regardless of ellipsis — this is the scholar's path to the full label.
- A visually-hidden span repeats the same full string for screen readers,
  so truncation never removes information from anyone: `<span
  class="visually-hidden">{fullLabel}</span>` alongside the visible
  (possibly truncated) text node, or simply rely on the button's
  `aria-label` carrying the untruncated string while the visible text node
  is `aria-hidden`.
- Longest label in the current data, "Kharavela and the Mahameghavahanas"
  (35 characters), fits inside the 12rem cap only with truncation — that is
  expected and fine, because the full name is always available via
  `title`/`aria-label` and is shown in full, untruncated, in the always-
  visible callout beneath the slider the moment that period is active.
- Each chip is a real, individually focusable `<button
  aria-pressed={isCurrent}>` that calls the same `onChange(period.id)`
  handler the range input's arrow keys use. This **adds** tab stops before
  the range input (one per period) — a deliberate change from
  `timeline.md`'s original "sole interactive element" model, because it
  gives keyboard and screen-reader users a way to jump straight to a named
  period instead of arrow-stepping through eleven values one at a time.
  The range input remains fully keyboard-operable on its own; the chips are
  an additional, not a replacement, path. Tab order: chip 1 → chip 2 → … →
  chip *n* → range input → (rest of the figure, unchanged).
- **Never blank**: a chip's box (background, border, min-width) always
  renders regardless of text length — there is no code path that produces
  an empty box, because the text node is always present (React renders
  `period.label`, CSS truncates visually, `title`/`aria-label` carry the
  rest). This is the direct fix for "blank chips": the failure mode was
  specific to trying to fit text inside a fixed-width SVG `<rect>` at
  render time; ordinary HTML text overflow does not have that failure
  mode.

### Colour and current-period state

- Default chip: `background: var(--bg-elevated)`, `border: 1px solid
  var(--rule)`, `color: var(--fg)`.
- Current period (`aria-pressed="true"`): `background: var(--accent)`,
  `color: var(--white)`, `border-color: var(--accent)` — 5.18:1 white-on-
  `--accent` (tokens.md, existing pair), matching the "you are here"
  accent language used everywhere else (marker selection ring, focus
  ring).
- Hover (pointer only): `background: var(--parchment-400)` — reuses the
  existing band-hover tone from `timeline.md`.
- Focus: `--focus-ring`, unchanged.
- Scroll affordance: a subtle `mask-image` fade at each scrollable edge
  when the strip has overflow (`overflow-x: auto` + CSS `scroll-timeline`
  or, if unsupported, a static edge fade `background` gradient) — decorative
  only, not required for function since native scrollbars/touch scroll
  already work; do not gate scrolling on this.

### SVG axis — unchanged mechanism, names removed

- Bands keep their fill, alternating value, current-period marker, and
  lane-packing (`timeline.md`'s existing algorithm for overlapping
  periods) — **remove only the `<text>` label and the `showLabel`
  threshold**. Each band still carries an SVG `<title>` for a mouse-hover
  native tooltip (belt-and-braces on top of the chip row's own `title`)
  and stays clickable (`onClick` → `onChange`), consistent with
  `timeline.md`'s "clicking a band goes through the same path as an arrow
  key" rule.
- Because bands no longer need room for text, they can collapse toward a
  single lane far more often: reduce `BAND_H` to `10px` and drop the
  `TICK_MIN_GAP_PX` label-collision concern (ticks show only the year, via
  `formatYear`, in the existing `.tl-tick-label`, which is unaffected —
  those are date labels, not period names, and were never the blank-chip
  bug).
- New minimum band width for pointer/touch clicking: keep a `12px` minimum
  visual width (`Math.max(w, 12)`), but the band's **click/tap target**
  gets an invisible `44px`-tall (not wide — width can stay proportional)
  hit rectangle centred on the band, consistent with `--hit-min` for any
  interactive element, mouse and touch alike.

### 380px — chip strip is the primary path, not a fallback

At 380px the eleven periods clearly cannot all be visible at once at a
readable size — this is fine: the chip strip **scrolls horizontally**,
exactly as it does at 1280px; nothing different happens at this width
except that fewer chips are visible without scrolling. This directly
answers the coordinator's constraint: no chip is ever rendered blank at any
width, because the fix (real HTML text with ellipsis + title + aria-label)
does not depend on available width the way the old SVG-text-fit did. A
child on a phone always sees full or sensibly-truncated period names, never
empty boxes, and can always read the current period's full name in the
callout line below the slider regardless of scroll position.

### States

| State | Treatment |
|---|---|
| Default | Chips scrollable, current chip highlighted, axis unlabelled ruler, callout showing. |
| Hover (chip, pointer) | Background lightens. |
| Focus (chip, keyboard) | `--focus-ring`; `Enter`/`Space` activates. |
| Current period | `aria-pressed="true"`, accent fill, also mirrored by the active-band marker on the ruler and the callout text. |
| Dragging the slider | Chip strip auto-scrolls the current chip into view (`scrollIntoView({inline: 'center', behavior: prefers-reduced-motion ? 'auto' : 'smooth'})`) at most once per settle (same 500ms debounce concept as the toast, so a fast drag doesn't thrash the scroll position) — a convenience, not required for correctness, since the callout already shows the name regardless of scroll position. |
| Reduced motion | Chip auto-scroll becomes instant (`behavior: 'auto'`); band-marker slide and callout cross-fade unchanged from `timeline.md`. |

### Tokens used / added

Used: `--bg-elevated`, `--rule`, `--parchment-400`, `--accent`, `--white`,
`--fg`, `--focus-ring`, `--hit-min`, `--space-*`, `--font-body`, `--text-sm`.
**New local vars** (component-scoped in `atlas.css`, following the existing
`--atlas-panel-w` pattern, not global colour tokens):
`--timeline-chip-min-w: 7rem`, `--timeline-chip-max-w: 12rem`.

---

## 3+4. Legend moves to a map-control popover; timeline sits directly under the map

### Recommendation

Replace the in-figure `<details>`/`<aside>` legend (`.atlas-map__legend`,
currently 324px tall at 1280px, sitting between the canvas and the
timeline) with a **popover triggered by a new floating map-control chip**,
using exactly the pattern already built for the keyboard-shortcuts `[?]`
button and its `<dialog>`/focus-trapped panel (`atlas-map.md`'s "Keyboard-
keys popover" section).

This **supersedes** `map-style-light.md`'s "Open design decision" (which
recommended keeping the legend as a persistent left-rail `<aside>`, option
B). That option assumed a three-column grid that does not exist in the
current two-column `.atlas__grid` (`minmax(0,1fr) var(--atlas-panel-w)`)
and would require adding one. The popover option:

- Removes the 324px in-figure block entirely, at every width — the direct
  fix for "legend sits between the map and the timeline."
- Requires no new grid column and no responsive legend variant (one
  component, one set of states, works identically at 380px and 1280px).
- Reuses a focus-trap/dialog pattern the engineer has already built once
  (for the keys popover), so the diff is small.
- Keeps tab order sane by treating "Map key" exactly like "keyboard
  shortcuts": both are informational overlays reachable from the map's own
  control cluster, not from the main content flow.

### Anatomy

```
Map control cluster, bottom-left, stacked (existing zoom stack keeps its
position; the new "Map key" chip joins it):

┌────┐
│ ⊕  │  Zoom in
├────┤
│ ⊖  │  Zoom out
├────┤
│ ⟲  │  Reset view
├────┤
│ 🗝  │  Map key (NEW — opens legend popover)   <- 44x44, aria-label "Map key"
└────┘
                                          ┌────┐
                                          │ ?  │  Keys (unchanged, bottom-right)
                                          └────┘
```

- "Map key" button: same visual treatment as `.atlas-map__ctl` (control
  chip, `--control-bg`/`--control-fg`/`--control-shadow`, 44×44px,
  `aria-label="Map key"`, `aria-haspopup="dialog"`, `aria-expanded`).
- Opens a `<dialog>` (or focus-trapped `role="dialog" aria-modal="true"
  aria-labelledby="legend-title">`) with **the same content, unchanged**,
  as today's legend `<dl>`: evidence tier, evidence type, route mode
  groups, each colour + glyph + text (never colour alone), plus the
  "Dashed lines mean the route is Hypothetical" note (`atlas-map.md`'s
  legend content section — verbatim, no change), plus the new "modern
  borders" row from §6 below.
- Opening moves focus to the dialog's close button; closing (`Esc` or the
  close button) returns focus to the "Map key" trigger — identical
  mechanics to the existing keys popover, including that `Esc` closes only
  the topmost layer (`--z-popover`) and never a port panel open underneath.
- The `<dl>` markup, headings and per-row `title=` explainer text are
  unchanged from `atlas-map.md`; only the *container* (popover instead of
  in-figure `<details>`/`<aside>`) changes.

### Result: map card ends where the canvas ends

With the legend removed from the figure's bottom, `.atlas-map`'s own
bottom edge becomes (approximately) the bottom edge of `.atlas-map__stage`
plus the card's padding/shadow — no more 324px of legend content inside
the card. The timeline sits immediately after the map card in both DOM
order (already true in `Atlas.tsx` — `#timeline` follows the map slot) and
visual order, separated only by a fixed gap:

- 380px: `gap: var(--space-3)` (12px) between the map card and
  `.atlas-timeline`.
- 1280px: `gap: var(--space-4)` (16px).

No element may be inserted between the map card and the timeline at any
width — the "Map key" and "?" triggers live *inside* the map figure (as
overlay controls), not between the figure and the timeline, so they don't
reintroduce the gap.

### Reachability at both widths

- **380px, inline flow** (< 600px, live map replaced by static preview per
  `kid-experience.md` A3): preview card → caption → "Explore the map"
  button → (gap) → Timeline. Nothing intervenes; already correct once the
  legend's popover conversion removes it from the live map's figure (the
  live map is `display: none` at this width anyway, so its legend markup
  was never the visible culprit here — but the popover conversion still
  applies once the visitor opens the fullscreen dialog, see below).
- **380px, fullscreen dialog**: the dialog already docks its own `Timeline`
  at the bottom (`.atlas-map-dialog__timeline`), directly below the map
  host, which is correct placement; the "Map key" control chip renders
  inside the dialog's map host alongside zoom/keys controls, so the legend
  popover is reachable there too without disturbing the docked timeline.
- **1280px**: map card → (gap) → Timeline, directly, per the sketch above.
  The right-hand `DetailPanel` column is unaffected (still a sibling in
  `.atlas__grid`'s second column, empty-state by default).

### 1280px layout sketch (updated)

```
┌──────────────────────────────────────────┬──────────────────┐
│ Period label · "Chola Age" (900–1200 CE)  │                  │
│ "Approximate reconstruction" · [?] keys   │  Side panel      │
│┌──────────────────────────────────────┐   │  (empty state or │
││                                        │   │   port/route/   │
││                                        │   │   site card,    │
││          MAP CANVAS (larger,          │   │   see           │
││          fills the card — §5)         │   │   port-card.md/  │
││                                        │   │   port-panel.md)│
││  🗝 (map key)                          │   │                  │
││  ⊕⊖⟲ (zoom, bottom-left)     [?] ─────┤   │                  │
│└──────────────────────────────────────┘   │                  │
├──────────────────────────────────────────┤                  │
│ Explore the timeline                      │                  │
│ [chip][chip][chip][chip][chip]…  (scroll) │                  │
│ ──ruler (ticks + colour bands, no text)── │                  │
│ ────────────▲───────────────────────────  │                  │
│ Early Historic Period · 300 BCE – 200 CE  │                  │
└──────────────────────────────────────────┴──────────────────┘
```

### 380px layout sketch (updated, live map / fullscreen dialog case)

```
┌───────────────────────────────┐
│ Period label · "Chola Age"     │
│ "Approx. reconstruction" [?]   │
│         [ map canvas ]         │  <- taller, §5
│  🗝                              │
│  ⊕⊖⟲                    [?]    │
├───────────────────────────────┤
│  Explore the timeline           │
│  [chip][chip][chip]… (scroll)  │
│  ──ruler──                      │
│  ────────▲──────────────────   │
│  Early Historic · 300BCE–200CE │
└───────────────────────────────┘
```

### Accessibility notes

- Tab order (both widths): figure → each marker (`load.ts` order) → zoom
  in/out/reset → "Map key" → "?" keys → (chip 1 … chip *n*) → range input
  → side panel contents. This is `atlas-map.md`'s existing order with
  "legend" replaced by "Map key" trigger in the same slot, and the new
  chip row inserted between the map's own controls and the range input
  (matching their visual position, directly above the slider).
- The "Map key" popover and the "?" popover are mutually exclusive by
  convention (opening one should close the other, same as two dialogs
  never being open at once) — not enforced by any new mechanism, just by
  both being modal dialogs sharing `--z-popover`.

### Tokens used / added

Used: `--control-bg`, `--control-fg`, `--control-shadow`, `--radius-lg`,
`--hit-min`, `--bg-elevated`, `--rule`, `--radius-md`, `--shadow-card`,
`--scrim`, `--focus-ring`, `--space-*`, `--z-popover`. No new tokens.

---

## 5. A bigger map

### Numbers

| | Before | After |
|---|---|---|
| Narrow aspect ratio (`--atlas-map-ratio-narrow`) | `4 / 5` | `3 / 4` (taller) |
| Wide aspect ratio (`--atlas-map-ratio`) | `16 / 10` | `16 / 9` (wider, and the card's non-canvas chrome shrinks — see below — so more of that ratio is canvas) |
| `min-height` (narrow, `.atlas-map__stage`) | `20rem` (320px) | `26rem` (416px) |
| `min-height` (wide, ≥ 900px) | — (ratio-driven only) | `30rem` (480px) |
| `max-height` (new, both) | — | `min(46rem, 62dvh)` — caps the card on tall/short viewports alike using a dynamic viewport unit, so the map never overshoots or requires the visitor to scroll past it to reach the timeline |
| Right column width (`--atlas-panel-w`) | `22rem` | `20rem` — the freed 2rem goes to the map column |

- These are the existing **local** custom properties already declared in
  `.atlas-island` (`atlas.css`), not global tokens — same pattern, new
  values.
- Removing the in-figure legend (§3+4) alone recovers the ~324px of
  non-canvas chrome measured at 1280px; combined with the ratio/min-height
  changes above, the canvas should occupy the large majority of the card's
  height rather than the measured 58%.
- `max-height: min(46rem, 62dvh)` is chosen so that, combined with the
  shrunk timeline block (chips + unlabelled ruler + slider + callout, no
  legend, no per-band label lanes — roughly 15rem/240px total, down from
  a much taller multi-purpose block today), the map **and** the timeline
  are both visible together without scrolling on a typical 900px-tall
  laptop viewport — directly answering problem #3's "stay reachable and
  interactive at both 380 px and 1280 px" requirement.
- The fact toast (§1) is now an overlay *inside* the map's own box, so it
  never competes with the map column for grid width the way an in-flow
  element would.

### Reflow at 1280px

Three-region composition (not literally three CSS grid columns — the
existing two-column `.atlas__grid` is unchanged structurally):

- Column 1 (`minmax(0, 1fr)`): map card (bigger, per above) stacked with
  the timeline directly beneath it.
- Column 2 (`var(--atlas-panel-w)`, now `20rem`): `DetailPanel`, unchanged
  behaviour (empty-state or port/route/site card).
- The toast lives *inside* column 1's map card as an absolutely positioned
  overlay (§1) — it never occupies column-2 width or pushes the panel.

### Reflow at 380px

- Live map (≥ 600px only) or preview card (< 600px) gets the same taller
  ratio/min-height treatment.
- `DetailPanel` remains a bottom sheet overlay (unchanged from
  `atlas-map.md`/`port-card.md`) — it does not compete for vertical space
  with the map+timeline stack, since it overlays rather than pushing.

### Tokens used / added

Local vars only (`.atlas-island` block in `atlas.css`): `--atlas-map-ratio`,
`--atlas-map-ratio-narrow` (values changed), `--atlas-panel-w` (value
changed), plus two **new** local vars: `--atlas-map-min-h-wide: 30rem`,
`--atlas-map-max-h: min(46rem, 62dvh)`. No global tokens change.

---

## 6. Country borders — a faint modern-day context layer

### What this is and is not

A single, faint, present-day political-boundary line layer drawn from
`public/geo/countries-50m.json` (already fetched, Natural Earth data,
public domain), for **orientation only** — "which sea am I looking at,
roughly where is Sri Lanka." It carries **no historical claim** and must
never be read as a Kalinga-era, or any period-specific, political boundary.

### Rendering rules

- Layer order (back to front, within the existing map SVG, `--z-map`):
  sea → land → graticule → **country borders (new)** → rivers → routes →
  ports/sites/markers. Borders sit just above the land fill and below every
  data layer, so they never compete visually with routes or pins and are
  never mistaken for a route or a coastline.
- `pointer-events: none`, `aria-hidden="true"` — purely decorative
  orientation, not an interactive or data-bearing element, consistent with
  the existing graticule treatment.
- Stroke only, no fill: `stroke: var(--map-border-modern)` (new token,
  below), `stroke-width: 0.5px`, `vector-effect: non-scaling-stroke` (same
  convention as route/coastline hairlines), no dash (a plain hairline reads
  as "background geography," reserving dashes for the route-mode legend's
  `Hypothetical` meaning, so this new line is never confused with a
  route).
- **Zoom-gated**: hidden at the default "coast view" zoom level (the calm,
  uncluttered default a ten-year-old sees first) and fades in only once
  the visitor has zoomed in past the same threshold `AtlasMap.tsx` already
  uses to switch marker sizing between "coast view" and "whole-ocean view"
  (`map-style-light.md`'s marker-size table) — reuse that existing
  threshold rather than adding a second one. Cross-fades in/out over
  `--dur-page`/`--ease-page` like every other period/zoom transition;
  instant under `prefers-reduced-motion` per the existing rule that zeroes
  `--dur-page`.

### New token

`--map-border-modern: rgba(55, 65, 81, 0.35)` — `--ink-600`'s hue
(`#374151`) at 35% alpha, added to the "Map surface" section of
`tokens.css` next to `--map-graticule`.

**Contrast, computed and reported honestly**: alpha-blended over
`--map-land` (`#f2eee6`), this resolves to an effective colour of roughly
`#bababa`, luminance-contrast ≈ **1.68:1** against `--map-land` — well
under the 3:1 non-text-graphic gate. This is **intentional and matches the
existing `--map-graticule` precedent**: the borders layer is explicitly
non-essential background geography (the map's actual data — routes, ports,
sites — all independently clear 3:1+ per `tokens.md`), shown only past a
zoom threshold as an optional orientation aid, never the sole way to
identify or operate anything. It is not a UI component or a graphical
object required to understand the map's content per WCAG 1.4.11's scope,
so the sub-3:1 value is a deliberate design choice, not an overlooked
failure — flagged here rather than hidden.

### Caption — the accuracy rule

Because this is modern data with zero historical content, it must be
labelled as such wherever it's visible:

- A new row in the "Map key" popover (§3+4), grouped separately from the
  evidence-tier/type/route-mode groups: **"Modern country borders — shown
  for orientation only, not a historical boundary."** with a small neutral
  swatch (a thin grey line, not a colour used anywhere else in the legend).
- When the layer is visible (post zoom-threshold), the existing
  "Approximate reconstruction" caption block (`atlas-map.md`) gets one
  additional sentence, shown only in that state: **"Country outlines are
  present-day borders, shown for orientation — Kalinga had no fixed
  national boundaries in this period."** This keeps the rule from
  `atlas-map.md` that any non-obvious map convention gets a *visible*
  caption, not only a legend entry a visitor might never open.

### What a sourced historical-boundary layer would require (out of scope, for the human)

A layer showing an *ancient* Kalinga-era or other historical polity's
boundary is a historical claim like any port or route, and needs the same
apparatus this project already has for those: a new schema entity (e.g.
`boundary`) extending `Claim`, with `source_refs` naming a specific
cited map or scholarly reconstruction (for example Schwartzberg's
*Historical Atlas of South Asia*, or a specific period map cited in
`kulke-rothermund` the way `periods.json` already cites Map 4/5/6/9 for
date ranges) and an `evidence_level` — most such boundaries would land at
`Probable` or `Hypothetical` at best, since ancient political boundaries
were rarely fixed lines and different scholars draw them differently for
the same period; per-period polygon geometry (not just a start/end year)
traced from a named source at a stated scale, with an explicit caveat
in its own visible caption (parallel to the "Approximate reconstruction"
rule) that the line is a scholarly reconstruction of a fuzzy, contested
extent, not a surveyed border; and, like every other entity in this
project, `draft` status until a human reviews and promotes it — this is
squarely a `researcher`-agent task to scope against real sources, not a
design or engineering task, and it is not attempted here.

---

## What the engineer must change (by file)

- **`src/islands/Atlas.tsx`**: move `.atlas-fact` toast rendering so its
  parent is the map host/dialog host rather than a viewport-fixed sibling;
  add the 500ms settle-debounce around fact selection (keyed off
  `activePeriod` changes, bypassed for marker-click-triggered facts); add
  the short-viewport collapsed-pill toast variant; add the "Map key"
  control + popover (mirroring the existing `[?]` keys dialog); remove the
  legend `<details>`/`<aside>` from the map figure in favour of that
  popover's content.
- **`src/islands/AtlasMap.tsx`**: add the country-borders `<path>` layer
  from `countries-50m.json` (or expose the necessary path/topology data to
  `Atlas.tsx`/a shared render helper), zoom-gated per §6, positioned in the
  existing layer stack; add the "Map key" trigger to the control cluster;
  remove/relocate the in-figure legend markup per §3+4; report the current
  map-box height (for the toast's short-viewport check) via the existing
  `ResizeObserver`/ref pattern already used for `--map-counter`.
- **`src/islands/Timeline.tsx`**: add the `atlas-timeline__chips` HTML row
  (real buttons, per §2) above the existing SVG axis; remove the
  `<text class="tl-band-label">` rendering and the `showLabel` threshold
  from the SVG bands; reduce `BAND_H`; keep the `<title>` per band; wire
  chip `onClick`/`aria-pressed` through the same `onChange` path as bands
  and the native input; add `scrollIntoView` on settle for the current
  chip.
- **`src/styles/atlas.css`**: update `.atlas-island`'s local vars
  (`--atlas-map-ratio*`, `--atlas-panel-w`, new `--atlas-map-min-h-wide`,
  `--atlas-map-max-h`); restyle `.atlas-fact` from viewport-fixed to
  map-relative absolute, add the collapsed-pill variant; add
  `.atlas-timeline__chips`/`.atlas-timeline__chip` styles with the new
  `--timeline-chip-min-w`/`--timeline-chip-max-w` local vars; remove
  `.atlas-map__legend`'s in-figure styling in favour of a popover/dialog
  style (can reuse `.keys-sheet`'s existing rules); add
  `.atlas-map__border-modern` path styling; add `--dur-toast-settle`
  reference if the debounce timing is read from CSS rather than
  hardcoded in TS (either is fine — token exists either way for
  documentation).
- **`src/styles/tokens.css`**: add `--map-border-modern` (Map surface
  section) and `--dur-toast-settle: 500ms` (Motion section, outside the
  `prefers-reduced-motion` override block).

## Open design decisions for the human

- **Chip strip as an additional keyboard path** (§2): I recommend making
  each chip individually focusable, which adds up to 11 tab stops before
  the range input. This trades a small amount of tab-order length for a
  much faster way to jump straight to a named period, which the old
  arrow-step-only model didn't offer. If the human prefers to keep the
  range input as the *only* focusable period control (closer to the letter
  of `timeline.md`'s original rule), the alternative is to make chips
  `tabindex="-1"` (pointer/click-only, like the SVG bands today) and rely
  solely on `title`/visible text for identification — but that reduces,
  not improves, keyboard efficiency for a list of eleven periods, so I do
  not recommend it.
- **Toast collapse threshold** (§1): I used `24rem` map-box height as the
  trigger for the collapsed pill. This is a reasonable default but not
  measured against a real short-viewport device; the engineer should
  confirm it against an actual landscape-phone or small-laptop viewport
  and adjust the single threshold value if the pill appears too early or
  too late.
- **Toast settle delay** (§1): 500ms is a starting point balancing "not
  glued to the child's finger while scrubbing" against "the toast doesn't
  feel sluggish when they stop on a period they care about." Worth a quick
  usability check once built; a single constant to tune.

## Out of scope (flagged, not attempted here)

- A sourced historical-boundary layer (§6's closing paragraph) — a
  `researcher`-agent task requiring cited geometry and evidence tiers per
  boundary, not a layout task.
- Any change to `DetailPanel`'s own internal layout, `port-card.md`, or
  `port-panel.md` — this spec touches only the map/timeline/toast/legend
  composition around them.
