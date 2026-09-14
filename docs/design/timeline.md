# Timeline

## Purpose

The period selector that drives both the map and, implicitly, which ports/
routes/sites/facts are visible everywhere else. `Timeline.tsx`'s stub
already has the correct accessible base (a native range input with
`aria-valuetext`); this spec adds the D3 axis, period bands, year labels
and the manuscript "page-turn" transition on top of that working control —
it must never regress the native keyboard/screen-reader behaviour already
in the stub.

## Anatomy

```
360px:
┌───────────────────────────────────────────┐
│  Explore the timeline                      │
│  300 BCE ─┬───┬─────┬───┬────┬───── 1900 CE│ <- D3 axis, tick per period
│  ▓▓▓▓▓▓▓ ▒▒▒▒▒ ▓▓▓▓▓▓ ▒▒▒▒ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │ <- period bands, alternating
│         ●═══════○────────────────────      │    fill for scannability
│  ─────────────▲─────────────────────────── │ <- native <input type=range>
│                                             │    thumb, --highlight colour
│  Early Historic Period · 300 BCE – 200 CE  │ <- current period callout
│  "Kalinga's ships begin reaching Sri Lanka."│    (Period.summary, 1 line)
└───────────────────────────────────────────┘

≥900px: same stack, wider axis, period band labels shown inline instead of
only in the callout (room for "Early Historic", "Gupta Age", … under each
band segment).
```

- The range input remains the actual control (value = period index, exactly
  as the stub); the D3 axis and bands are a **visual overlay** positioned
  behind/around it via absolute positioning in the same wrapper — D3
  renders to an `<svg>` that is `aria-hidden="true"`, because the real
  semantics live in the native input and its `aria-valuetext`.
- Period bands: one rect per `Period`, width proportional to
  `end_year - start_year` on a shared scale (`d3.scaleLinear` from the
  earliest `start_year` to the latest `end_year` across all periods),
  alternating `--bg-elevated`/`--bg` fill so adjacent short periods stay
  visually separable even without labels.
- Axis ticks: one per period boundary, label = `formatYear()` (already in
  the stub) — BCE/CE exactly as the stub formats it, not a raw signed
  number.

## Current period callout

- A single line, always visible, directly under the slider:
  `"{Period.label} · {start} – {end}"` then `Period.summary` beneath it —
  this duplicates the stub's `aria-live="polite"` paragraph content
  visually (do not remove the live region; the D3 layer is additive).
- On change, the callout's text swaps with the same `--dur-page` cross-fade
  as the map's period switch, so map and callout feel like one instrument
  turning together.

## "Page-turn" transition spec

When `activePeriod` changes (via drag, arrow keys, or clicking a band):

1. Callout text: outgoing fades + translates up 4px, incoming fades +
   translates up from 4px below, both over `--dur-page` with `--ease-page`,
   overlapping (cross-fade, not sequential) so there's no blank gap.
2. Active period band: gains a `--gold-400` 2px top border that slides from
   the previous band's position to the new one over the same duration
   (`transform: translateX`, not re-laying-out the DOM).
3. This transition is purely visual on the Timeline; it does not itself
   trigger the map's transition — both are driven by the same
   `activePeriod` state change in the parent island, so they run
   concurrently and stay in sync by construction rather than by timing
   coordination.

## Reduced-motion behaviour

- Cross-fade and border-slide are skipped entirely (`--dur-page: 0ms` under
  `prefers-reduced-motion`, per tokens.css); callout text and active-band
  border simply update in their new state on the same frame the input's
  value changes.
- No functionality is lost — this is purely the removal of the transition,
  never a removal of the axis, bands or callout content themselves.

## States

| State | Treatment |
|---|---|
| Default | Axis + bands + thumb positioned at current period, callout showing. |
| Dragging | Thumb follows pointer; callout updates live (throttled to one update per animation frame, not per pixel) rather than only on release, so keyboard and pointer users get the same live feedback. |
| Keyboard (arrow/Home/End) | Native input behaviour, unchanged from the stub; band border and callout update exactly as on drag. |
| Focus | `--focus-ring` on the native input (its default appearance is suppressed only for the track/thumb colour, never for the focus outline). |
| Hover on a band (pointer only) | Band brightens slightly and shows its label in a small tooltip if not already inline-labelled (360px case) — keyboard/touch users get the same information from the always-visible callout, so this is a convenience, not the only path to the label. |

## Accessibility notes

- The native `<input type="range">` remains the sole interactive/focusable
  element for changing period — the D3 axis/bands/callout are all either
  `aria-hidden` (decorative SVG) or already covered by the existing
  `aria-live="polite"` paragraph. No second, competing way to "select" a
  period via clicking a band bypasses the input's keyboard model — clicking
  a band sets the input's value programmatically (same code path as arrow
  keys), so behaviour stays consistent regardless of input method.
- Touch target: the native thumb is styled to be at least `--hit-min`
  (44px) via `::-webkit-slider-thumb`/`::-moz-range-thumb`, larger than the
  browser default.
- Colour is never the only period-boundary signal: alternating band fill
  (a value change, not just a hue change) plus the axis tick labels plus
  the text callout together carry the boundary information.

## Tokens used

`--font-heading`, `--text-lg`/`--text-sm`, `--highlight` (thumb/accent),
`--gold-400` (active band border), `--bg`/`--bg-elevated` (band alternation),
`--rule`, `--space-2/4`, `--dur-page`, `--ease-page`, `--hit-min`,
`--focus-ring`.
