# "Did you know?" toast

## Purpose

Surfaces one `Fact` at a time as a low-pressure, dismissible aside — the
app's one piece of ambient delight, never a modal blocker and never a
distraction from the map/timeline the visitor is actually using. Backed by
`Fact.text` (<=140 chars, FK<=7) plus `related_ids` linking back to the
entity it's about.

## Anatomy

```
┌───────────────────────────────────────────┐
│ ⓘ Did you know?                          [x]│
│  Ships from Kalinga carried elephants as    │
│  gifts to kings across the sea!             │
│  ✓ Strongly Supported  ● Tradition   [source]│
│                              [Show me →]     │
└───────────────────────────────────────────┘
```

- Position: bottom-right toast at ≥600px (clear of the timeline and zoom
  controls); full-width bar pinned above the timeline at 360px so it never
  overlaps the map's own controls.
- `[Show me →]` appears only when `related_ids` resolves to something
  visible/selectable on the current view (a port, route, good, site); it
  selects that entity (opens its card) and dismisses the toast. Omitted
  when there's nothing to jump to.
- `[source]` is a compact `SourcePopover`, not the full inline citation
  list, to keep the toast small — expands in place like everywhere else.

## Behaviour

- **One at a time.** A new fact never appears while one is open; it queues
  (silently — no "1 more fact waiting" counter, to avoid nagging) and
  surfaces after the current one is dismissed or its own display window
  elapses.
- **Trigger cadence:** on period change (a fact relevant to the new period,
  if one exists) or a soft idle timer (~45s of inactivity) — never on
  every marker hover, which would be exhausting.
- **Auto-dismiss:** after 12s of no interaction, fades out — but only if
  the visitor hasn't focused or hovered it; focus/hover pauses the timer
  indefinitely (WCAG 2.2.1 — moving content must be pausable, and
  dismissing a screen-reader user's toast mid-read is worse than leaving it
  up).
- **Manual dismiss:** `[x]` or `Esc` (only when the toast itself has focus,
  so `Esc` doesn't fight the map/panel's own `Esc` handling — see
  atlas-map.md's layering notes; toast sits at `--z-toast`, above panels).

## States

| State | Treatment |
|---|---|
| Entering | Slide/fade in, `--dur-base`, `--ease-page`. |
| Default | As sketched, auto-dismiss timer running. |
| Focused/hovered | Timer paused; a thin `--gold-400` top border appears as a subtle "this is holding" cue. |
| Source expanded | Grows in place; auto-dismiss timer stays paused while `<details>` is open. |
| Exiting | Fade/slide out, `--dur-base`; if the queue has a next fact, it waits one full `--dur-base` beat before entering (never back-to-back with zero gap — reads as jarring). |
| Reduced motion | Enter/exit is an instant show/hide; auto-dismiss timing unchanged (it's a delay, not an animation). |

## Accessibility notes

- Container: `role="status" aria-live="polite"` (not `alert` — a fact is
  never urgent) so screen readers announce it without interrupting
  whatever the visitor is doing.
- Keyboard reachable: the toast receives programmatic focus only if it
  appeared as a direct result of a user action (e.g. selecting a period);
  on the idle timer it appears without stealing focus, but is reachable via
  a fixed position in the tab order (e.g. right after the timeline) so a
  keyboard user doesn't have to hunt for it.
- Never more than one toast in the DOM at a time — this is also a
  performance/complexity guard, not just a UX one.
- Badge and source are never dropped even in this small a surface — a fact
  is a historical claim like any other and follows the same "no source, no
  render" rule as a port or route.

## Tokens used

`--bg-elevated`, `--fg`, `--gold-400`, `--text-sm`, `--space-3/4`,
`--radius-md`, `--shadow-card`, `--z-toast`, `--dur-base`, `--ease-page`,
`--focus-ring`, tier/type tokens via `EvidenceBadge`.
