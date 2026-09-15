\
# Kid experience: easier map, more reasons to explore

## Why this doc exists

Four problems were found in the current map (`AtlasMap.tsx`, not edited
here): it opens zoomed out to the whole Bay of Bengal so the 12 Odisha
ports crowd together and hide their labels; wheel-zoom needs Ctrl, which
nobody discovers; phone drags scroll the page instead of panning the map;
and there is no welcome, no reward, no reason to keep tapping. This spec
fixes all four and adds a small, strictly data-driven engagement layer.
Everything a child sees still carries an `EvidenceBadge` and a source —
nothing here invents history. New copy in this doc targets Flesch-Kincaid
grade ≤ 5, stricter than the site-wide grade ≤ 7 rule, because it is the
first thing a 10-year-old reads.

Builds directly on `atlas-map.md`, `port-card.md`, `port-panel.md`,
`cargo-manifest.md`, `did-you-know.md`, `timeline.md`. Nothing in those
files is replaced; this doc only adds the default-view, zoom, phone-layout
and label rules that were missing, plus new components (intro, quest,
logbook). Extends `atlas-map.md`'s existing states/tokens tables rather
than restating them.

---

## Part A — Map interaction for kids

### A1. Default view: "Odisha coast" first (must)

**Purpose.** A first-time visitor should see their own 12 ports large
enough to read and tap, not lost in a map that also shows Java.

**Behaviour.**
- On load, and whenever the view resets, the map fits its viewport to a
  bounding box computed from every `published` port with
  `region: "kalinga"` in the *current* period, plus 15% padding on every
  side. This is computed at runtime from `load.ts` data, not hard-coded
  coordinates — it stays correct if a 13th port is published later.
- Two view buttons sit together, top-left of the map figure, under the
  period label bar:

```
[ 🏝 Show the Odisha coast ]   [ 🌊 Show the whole ocean ]
```

  - "Show the Odisha coast" (default, pressed state on load) re-fits to
    the bounding box above.
  - "Show the whole ocean" fits to every visible marker in the current
    period, Kalinga and foreign destinations alike (i.e. today's default
    view becomes the second, opt-in view).
  - Both are real `<button>`s, `--hit-min` tall, `aria-pressed` reflects
    which view is active (mutually exclusive, like a 2-item toggle group,
    `role="group" aria-label="Map view"`).
  - Transition between views: the same `d3-zoom` `transform` interpolated
    over `--dur-page` with `--ease-page` (a smooth pan+scale, not a jump),
    matching the "turning a page" language already used for period
    switches. Instant under `prefers-reduced-motion`.
- Manual zoom/pan (below) always overrides the last-pressed view button;
  once the visitor drags or scrolls, neither button shows `aria-pressed`
  until they press one again.

**360 px layout.**
```
┌───────────────────────────────┐
│ Chola Age · 900–1200 CE        │
│ [🏝 Odisha coast] [🌊 Whole ocean] │  <- wraps to 2 lines if needed,
│                                 │     each button min 44px tall
│         [ map canvas ]         │
```

**Desktop (≥900 px).** Same two buttons, inline, top-left of the map
column, to the left of the "Approximate reconstruction" caption if both
are present (caption wraps below on narrow desktop widths before it
collides with the buttons).

**States.** Default (Odisha-coast, pressed) · whole-ocean pressed ·
neither pressed (after manual pan/zoom) · disabled-during-transition (both
buttons `aria-disabled` for the `--dur-page` duration of an in-flight
transition, so a second click can't fight the first).

**Keyboard / screen reader.** Both buttons are normal tab stops before the
map figure (or right after it — pick whichever order the engineer's
existing focus sequence in `atlas-map.md` makes least disruptive; either
is acceptable as long as it's consistent). `aria-pressed` announces state
change. No new modal, no focus trap.

**Tokens.** `--hit-min`, `--space-2/3`, `--radius-pill` (pill-shaped toggle
buttons match the period chips' visual language), `--map-label` text on
`--navy-800` background at 85% opacity (same recipe as the existing zoom
control buttons in `atlas-map.md`), `--gold-400` for the pressed/active
state (matches the selected-marker ring, so "this view is active" and
"this marker is active" read as the same visual language), `--dur-page`,
`--ease-page`, `--focus-ring`.

---

### A2. Zoom input: plain wheel, no Ctrl (must)

**Decision.** Plain mouse-wheel zoom while the pointer is over the map
figure, plus double-click and double-tap to zoom in one step, plus pinch
on touch. Ctrl-to-zoom is dropped.

**Justification.** The Ctrl convention exists to stop an *embedded* map
from hijacking the scroll of a page the visitor is scrolling past (a map
inside an article, for instance). This map is not that: it is the
full-viewport centrepiece of its own screen (`kalinga-website-master-prompt.md`
§2, "interactive map + timeline as the centrepiece"), reached deliberately,
not scrolled past incidentally. A 10-year-old has near-zero chance of
discovering a modifier key; every mainstream consumer map product a child
has used (phone maps apps) zooms on a plain wheel/pinch. The trade-off —
a visitor cannot scroll the *page* while their pointer sits over the map
— is acceptable because the map fills the viewport at the breakpoint
where this matters (≥900 px it sits in a fixed three-column layout that
does not scroll internally anyway; at 360 px, A3 below removes the
conflict entirely by giving the map its own full-screen mode).

**First-visit affordance.** A dismissible overlay hint appears centred on
the map the first time a *pointer* (mouse) device is detected hovering the
figure (never on touch — touch has its own hint, see A3):

```
┌─────────────────────────────┐
│   🖱  Scroll to zoom in       │
│      Drag to look around     │
│                          [x] │
└─────────────────────────────┘
```

- Fades out on first wheel or drag interaction, or after 5 s, or on `[x]`;
  never shown again once dismissed (localStorage key
  `kalinga-map-hint-dismissed`).
- `role="status" aria-live="polite"`, not focus-stealing; reachable by Tab
  while visible with a visible close button, same pattern as the toast in
  `did-you-know.md`.

**Tokens.** Same floating-button recipe as the zoom buttons in
`atlas-map.md` (`--navy-800` at 85%, `--map-label` text, `--radius-md`,
`--shadow-card`), `--z-popover`, `--dur-base`.

**Priority.** Must (the wheel-zoom fix and the hint together).

---

### A3. Phone layout: "Explore the map" full-screen mode (must)

**Problem it solves.** Inline on a 360 px page, a vertical drag on the map
is indistinguishable from a vertical drag meant to scroll the page. Rather
than teach a child a two-finger-drag exception (fragile, undiscoverable),
the map gets its own screen on phones, exactly like opening a photo to
full screen: no ambiguity, no gesture the visitor has to be told about.

**Behaviour.**
- Below 600 px width, the map section on the page renders as a *static
  preview*: a non-interactive snapshot-style card (real markers, but
  `pointer-events: none` except for one big button) captioned to set
  expectations:

```
┌───────────────────────────────┐
│  The map of Kalinga's ports     │
│  ┌───────────────────────────┐ │
│  │ (still preview: coastline, │ │ <- decorative, aria-hidden;
│  │  ports as dots, no labels) │ │    same SVG markers, just inert
│  └───────────────────────────┘ │
│                                 │
│   [ 🗺  Explore the map  ]      │ <- full-width, 52px tall button
└───────────────────────────────┘
```

- Tapping "Explore the map" opens a full-screen `<dialog>` (or
  focus-trapped `div[role="dialog"][aria-modal="true"]`) that *is*
  `AtlasMap`, at 100dvh/100dvw, with its own close button top-right (44 px,
  `aria-label="Close map"`) and the period label, view buttons (A1), zoom
  buttons and legend `<details>` all present exactly as specced in
  `atlas-map.md`'s 360 px layout — nothing is removed, the map just gets
  the whole screen instead of sharing it with the page.
- Inside this full-screen mode, drag-to-pan and pinch/wheel-to-zoom behave
  exactly as A2 with no page-scroll conflict, because there is no page
  behind it to scroll — the dialog itself does not scroll.
- Closing (via `[x]`, `Esc`, or a browser back gesture where supported)
  returns focus to the "Explore the map" button.
- The Timeline stays *outside* this full-screen mode, docked at the
  bottom of it (same component, just relaid-out to fit), since period
  switching is core to using the map at all — it does not require its own
  separate screen.

**360 px layout (full-screen mode open):**
```
┌───────────────────────────────┐
│ ← Chola Age · 900–1200 CE   [x]│
│ [🏝 Odisha coast][🌊 Whole ocean]│
│                                 │
│         [ map canvas ]         │
│                                 │
│  ⊕ ⊖ ⟲                    [?]  │
├───────────────────────────────┤
│ ▸ Map key                      │
├───────────────────────────────┤
│  Timeline (compact, same       │
│  component as page, docked)    │
└───────────────────────────────┘
```

**≥600 px.** Not needed — at this width the pan-vs-scroll conflict does
not arise the same way (trackpad/mouse users get A2's hint instead), so
the map renders inline as already specced in `atlas-map.md`. The
full-screen entry point is phone-only (`@media (max-width: 37.4375rem)`,
i.e. below the 600 px token boundary).

**States.** Preview (static, page) · full-screen open · full-screen
closing. Reduced motion: full-screen dialog opens/closes with an instant
show/hide instead of a scale/fade transition.

**Accessibility.** Standard modal dialog pattern: focus moves to the
close button on open (not into the map figure, so a screen-reader user
isn't dropped mid-figure), `Esc` closes, focus returns to the trigger.
The static preview card is `aria-hidden="true"` on its markers (it is
decorative — real interaction lives one tap away) but the "Explore the
map" button itself has a full sentence label:
`aria-label="Explore the map of Kalinga's ports, full screen"`.

**Tokens.** `--z-panel`/`--z-popover` as in `atlas-map.md`, `--scrim` not
needed (dialog is opaque, full-bleed), `--dur-base` for the open/close
transition, `--hit-min`, `--shadow-card` on the preview card.

**Open decision for the human:** whether "Explore the map" should also
appear as an option at 600–900 px (tablet portrait), where the conflict is
milder but not absent. Recommend: no, ship phone-only first, revisit if
the audit shows a problem at tablet widths.

---

### A4. Labels, clusters and bigger markers (must)

**Labels at the default view.** With the map fit to the 12-Odisha-port
bounding box (A1), every Kalinga port keeps a permanent label — the whole
point of A1 is that this box was chosen precisely so 12 labels fit without
overlap. Label rule: `--font-heading`, `--text-sm`, `--map-label` colour,
2 px `--map-sea` halo (per `atlas-map.md`), positioned above the marker by
default, flipped below when a label would run past the top edge or
collide with a neighbour (collision computed once per view-fit, not per
frame).

**Clusters in the "whole ocean" view only.** Once the view expands past
Kalinga, ports that are genuinely close together at that zoom level
(destinations in Sri Lanka, or a Southeast Asian cluster) collapse into a
numbered bubble rather than hiding labels:

```
   ╭────╮
   │ 3  │   <- --gold-400 fill, --navy-900 text, 28px diameter minimum
   ╰────╯      (well under 44px visually, but hit area padded to 44px)
```

- Cluster threshold: any two-or-more markers whose screen-space distance
  at the current zoom is under ~32 px. Purely a rendering rule, not a data
  concept — clustering never changes which entities exist or hides any of
  them permanently.
- Tap/click/Enter on a cluster zooms and pans (same `--dur-page` animated
  transform as A1) to a fit box around just that cluster's markers, which
  then de-clusters as spacing increases; it does not open a card directly
  (a cluster is a zoom shortcut, not a claim about the places in it).
  `aria-label="3 ports near here — activate to zoom in"`.
  Focus moves to the first de-clustered marker once the zoom settles.
- Cluster bubbles are decorative shape *plus* the number *plus* the label
  — never a colour-only dot — consistent with the "colour is never the
  only signal" rule.

**Bigger markers.** Displayed marker size increases from the current 6 px
dot to 10 px at the default (Odisha-coast) view and 8 px at the
whole-ocean view (smaller because more are on screen at once); the
already-required 44 px invisible hit area (`atlas-map.md`) is unchanged.
Selected state: solid `--gold-400` 3 px ring, 6 px outside the marker edge
(bigger, easier-to-see ring than a hairline), still per
`atlas-map.md`'s existing "Marker selected" row — this is a size increase
to that same treatment, not a new state.

**Tokens.** `--map-port`, `--map-port-glow`, `--map-label`, `--gold-400`,
`--navy-900`, `--z-map`, `--dur-page`, `--ease-page`, `--hit-min`.

---

## Part B — Engagement, built only from data already in `src/data/`

Every screen below reads only: `port.goods`, `port.periods`,
`port.evidence_type`, `good.kid_line`, `good.direction`, `fact.text`,
`fact.related_ids`, `route.from`, `route.to`, `route.goods`, and each
entity's own `EvidenceBadge`/`SourcePopover`. Nothing here writes to
`src/data/`; all state (intro dismissed, stamps collected, quest
progress) lives in the visitor's own `localStorage`, never sent anywhere
(no analytics, per `CLAUDE.md`).

### B1. "Start your voyage" intro (should)

**Purpose.** Thirty seconds to understand the screen (master prompt §2,
objective 2), skippable, never nags a returning visitor.

**Anatomy.** A focus-trapped dialog, 3–4 short steps, shown once:

```
Step 1/4
┌───────────────────────────────┐
│                            skip│
│        ⛵ (compass-hint icon)   │
│                                 │
│  Ahoy! You're about to sail    │
│  Kalinga's ancient trade       │
│  routes.                       │
│                                 │
│   ● ○ ○ ○         [ Next → ]   │
└───────────────────────────────┘
```

Step content (all UI copy, not historical claims, so no citation is
needed — these steps describe the interface, never a historical fact):

1. "Ahoy! You're about to sail Kalinga's ancient trade routes."
2. "Tap a glowing dot to find out what happened there." (shows a still of
   a port marker with its ring)
3. "Drag the timeline to jump between centuries." (shows a still of the
   timeline)
4. "Collect a stamp in your logbook every time you explore something new."
   (shows the logbook icon, see B3) — omit this step entirely if B3 ships
   later than this intro; 3 steps is a fine minimum.

**States.** Step 1–4 (progress dots, filled = seen) · skipped ·
completed. Both "Skip" (top-right, text button, always available) and
finishing step 4 set `localStorage.kalinga-intro-dismissed = "1"`; the
dialog never renders again once that key is set, on any device sharing
that browser storage.

**360 px layout:** full-width sheet, image/icon on top, text below,
`[Next →]` full-width 48px button, dots row centred beneath.

**Desktop layout:** centred modal, `max-width: 28rem`, same content,
`[← Back]`/`[Next →]` pair once past step 1, `--scrim` behind it.

**Keyboard / screen reader.** Standard dialog pattern: focus to the
dialog (or its heading) on open, `Esc` = Skip, `Tab` cycles Back/Next/Skip
only (trapped), each step announced via a `<h2>` per step content so a
screen reader hears "Step 1 of 4, Ahoy!..." Progress dots are decorative
(`aria-hidden`); the real progress is in the visible "Step 1/4" text and
the dialog's `aria-label`.

**Tokens.** `--bg-elevated`, `--fg`, `--font-heading`, `--text-md`,
`--space-4/6`, `--radius-md`, `--shadow-card`, `--scrim`, `--focus-ring`,
`--hit-min`, `--dur-base`, `--z-popover`.

---

### B2. Treasure-hunt quest mode (could)

**Purpose.** Master prompt §10.6. Turns already-published data into a
findable puzzle instead of a passive browse, without ever inventing a
question the data can't answer.

**Question templates (exhaustive list — no others are generated):**

| Template | Built from | Correct answer set |
|---|---|---|
| "Find a port where people found {good.name}." | `port.goods` contains `good.id`, both visible in current period | Any visible port whose `goods[]` includes that good id |
| "Find a good that left Kalinga on this route." (asked with a route selected) | `route.goods` filtered to `good.direction === "export"` | Any good in that route's `goods[]` with `direction: "export"` |
| "Find a good that arrived from far away on this route." | `route.goods` filtered to `good.direction === "import"` | Any good in that route's `goods[]` with `direction: "import"` |
| "Find the port at the other end of this route." (route selected) | `route.from` / `route.to` | The port matching whichever end isn't already selected |
| "Find a port whose story comes from archaeology." (◆ glyph) | `port.evidence_type === "archaeological"` | Any visible port with that evidence type |
| "Find a port that was here in the {period.label}." | `port.periods` includes the active period id | Any visible port active in the current period |

**Generation rule.** A question is only offered if, in the visitor's
*current* view (period + view mode), at least one entity satisfies it —
computed client-side from the same `load.ts` arrays the map already
renders, never a hardcoded question bank. If the visitor changes the
period or view mode mid-quest such that the answer set becomes empty, the
quest silently retires that question and offers a new one rather than
leaving an unsolvable prompt on screen.

**Anatomy — quest card (docked, not modal, so the map stays fully usable):**

```
360 px, docked above the timeline:
┌───────────────────────────────┐
│ 🗺 Find a port where people    │
│    found Chinese pottery.   [x]│
│              [ Skip this one ] │
└───────────────────────────────┘

On correct tap (of any valid marker):
┌───────────────────────────────┐
│ ✓ Well spotted! That's         │
│   Manikapatna.                 │
│              [ Next quest → ]  │
└───────────────────────────────┘

On a wrong tap (kind, never scolding):
┌───────────────────────────────┐
│ Not quite that one — try       │
│ looking further down the coast.│
│              [ Give me a hint ]│
└───────────────────────────────┘
```

- Wrong-answer copy is generated from a small fixed set of gentle,
  direction-only hints (never "wrong", never a streak/points penalty):
  "try looking further down the coast" / "try looking further out to
  sea" / "try a different century on the timeline" — chosen by comparing
  the tapped marker's position/period to the answer's, so the hint is
  always true, not random flavour text.
- "Give me a hint" (after one wrong try) has the guide character (B5)
  point — literally, an animated compass-hint icon — toward the correct
  marker's general direction without naming it, so the child still has to
  look.
- Skipping or solving loads the next available template; the quest card
  can be dismissed entirely with `[x]` and re-opened from a "🗺 Quest"
  button near the view-toggle buttons (A1).

**Desktop layout:** same card, docked bottom-right above the legend rail,
`max-width: 22rem`.

**States.** Offered (question shown) · correct (brief celebration, see
B4) · incorrect (hint offered) · retired (answer set became empty,
silently replaced) · dismissed (visitor closed quest mode).

**Keyboard / screen reader.** The quest card is `role="status"
aria-live="polite"` for its question and feedback text (never `alert` —
nothing here is urgent); "answering" is just selecting a marker exactly as
normal (Tab to a marker, Enter/Space to select), so the quest never
introduces a second, competing selection mechanism. Correctness feedback
is announced via the same live region, not a colour change alone.

**Tokens.** `--bg-elevated`, `--fg`, `--tier-confirmed`/verdigris for the
"Well spotted" checkmark (matches the Confirmed-tier glyph colour, so
"correct" borrows the same "this is solid" visual language the site
already teaches), `--space-3/4`, `--radius-md`, `--shadow-card`,
`--focus-ring`, `--z-toast` (sits above the map, below any open card),
`--dur-base`.

**Priority.** Could — ships after the map fixes (Part A) and the logbook
(B3), since it depends on selection working smoothly and benefits from
stamps already existing to reward a solve.

---

### B3. Ship's logbook / passport (should)

**Purpose.** A persistent, low-stakes progress record: "how much of
Kalinga's story have I opened?" Answers the child's own question, not a
historical one — no citation needed, it's a tally of *the visitor's own
actions*.

**What earns a stamp.** Opening any port, good, route, site or
inscription's card for the first time (the same "select a marker" or
"tap a goods chip" action that already opens `port-card.md` /
`cargo-manifest.md` content — B3 adds a side-effect to an event that
already fires, not a new interaction). Stamp key = `{kind}:{id}`, stored
as a set in `localStorage.kalinga-logbook`. Re-opening something already
stamped never re-triggers the celebration (B4) or double-counts.

**Anatomy — passport trigger (persistent, top bar near the view buttons):**

```
[ 📖 Logbook · 4/38 ]
```

Count = stamps collected / total *published, currently reachable* entities
(ports+goods+routes+sites+inscriptions across all periods) — a simple
fraction, recalculated from `load.ts` counts at build time so it never
needs a server.

**Anatomy — open logbook sheet:**

```
┌───────────────────────────────┐
│  Your logbook               [x]│
│  4 of 38 stamped                │
│  ▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░  │ <- progress bar, verdigris fill
│ ───────────────────────────── │
│  Ports (2/12)                  │
│  [●img][●img][ ? ][ ? ]…       │ <- stamped = full-colour stamp,
│                                 │    unstamped = grey stamp-frame
│                                 │    outline only, tapping an
│                                 │    unstamped slot does nothing
│                                 │    (no spoiler — it's blank, not
│                                 │    labelled with the answer)
│  Goods (1/14)                  │
│  [●img][ ? ][ ? ]…              │
│  Routes (1/9)  Sites (0/2)      │
│  Inscriptions (0/1)             │
└───────────────────────────────┘
```

- Each stamped slot is a real `<button>`: tapping it re-opens that
  entity's card (so the logbook doubles as a "jump back to things I
  liked" index) — same chip pattern as `port-panel.md`'s goods chips.
- Unstamped slots are inert (no `<button>`, just an `<img>`/`<svg>` with
  `aria-hidden="true"`, grouped under a heading whose accessible count
  already conveys "10 more to find") — never a `<button>` that does
  nothing, per WCAG "every control does something."
- Grouped by kind, in the same five categories as the stamp SVGs
  (`src/assets/kids/stamp-{port,good,route,site,inscription}.svg`).

**States.** Empty (0 stamps: sheet shows an encouraging line, "Tap a dot
on the map to get your first stamp!" instead of an empty grid) · partial
(as sketched) · complete per category (a small `--gold-400` flourish on
that category's heading, no fireworks — see B4 for what does celebrate).

**360 px layout.** Full-width bottom sheet, grid `repeat(4, 1fr)` per
category, `gap: var(--space-2)`, category headings sticky as the sheet
scrolls.

**Desktop layout.** Centred modal, `max-width: 32rem`, `repeat(6, 1fr)`
grid, otherwise identical.

**Keyboard / screen reader.** `role="dialog" aria-labelledby="logbook-title"`,
focus to `[x]` on open, focus returns to the `[ 📖 Logbook ]` trigger on
close. The trigger's accessible name always includes the live count:
`aria-label="Open your logbook. 4 of 38 stamped."` Stamped-slot buttons:
`aria-label="Manikapatna, stamped. Open again."` Unstamped slots:
`aria-hidden`, contributing only to the group's visible/announced count
(e.g. a heading of `<h3>Ports (2 of 12)</h3>` already tells a screen-reader
user how many remain, without describing what they are).

**Tokens.** `--bg-elevated`, `--fg`, `--fg-muted`, `--font-heading`,
`--progress-track` / `--progress-fill` (new, see below), `--radius-md`,
`--radius-pill`, `--shadow-card`, `--space-2/4/6`, `--focus-ring`,
`--hit-min`, `--z-panel`.

---

### B4. Stamp visuals and celebrations (should / could)

**Stamp visual.** Every stamp is `stamp-frame.svg` (a hand-inked circular
border) as the base, with the matching kind glyph
(`stamp-port.svg`/`stamp-good.svg`/`stamp-route.svg`/`stamp-site.svg`/
`stamp-inscription.svg`) centred inside it, both rendered in
`--laterite-700` (an "ink stamp" red-brown, 7.75:1 on `--parchment-200` —
see token table) to read as a wax/ink stamp against the parchment logbook
page. Unstamped state: same frame + glyph pair rendered at 25% opacity in
`--fg-muted`, "not yet inked."

**Earning a stamp — celebration (must be fully inert under
`prefers-reduced-motion`, priority: could).**

- The stamp "thumps" into place: scale 0.6→1.08→1.0 over `--dur-base`,
  `--ease-page`, plus 6–8 small dots in `--map-route`,
  `--map-route-coastal`, `--map-route-land` (reuse the existing route-mode
  colours — no new palette for confetti) drifting upward and fading over
  the same duration, capped at one celebration on screen at a time exactly
  like the "Did you know?" toast's one-at-a-time rule.
- A one-line toast, reusing `did-you-know.md`'s toast shell:
  `role="status" aria-live="polite"`, text "New stamp: Manikapatna! ✦",
  auto-dismiss 4 s, pausable on hover/focus.
- Under `prefers-reduced-motion`: the stamp simply appears in its final
  state and the toast still shows (text, no motion) — the *information*
  ("you got a stamp") is never motion-only.
- Quest solves (B2) reuse the identical celebration, so "correct" and
  "new stamp" feel like the same reward language throughout the app.

**Tokens (new).**

| Token | Value | Used for | Contrast |
|---|---|---|---|
| `--progress-track` | `var(--parchment-400)` | Logbook/quest progress bar track | n/a (non-text background) |
| `--progress-fill` | `var(--verdigris-700)` | Progress bar fill | 3.59 : 1 vs `--progress-track` — meets WCAG 2.1 AA's 3 : 1 non-text/UI-component minimum |
| `--stamp-ink` | `var(--laterite-700)` | Stamp glyph + frame, "inked" state | 7.75 : 1 vs `--parchment-200` (stamp card background) — exceeds the 4.5 : 1 small-text minimum, comfortable for a decorative-but-legible glyph |
| `--stamp-glow` | `rgba(168, 134, 27, 0.35)` (derived from `--gold-600`) | Soft glow behind a freshly-earned stamp during the celebration only | Decorative underlay, not text — no ratio required, same treatment class as `--scrim`/`--map-port-glow` |

All four alias or derive from colours already in the palette — no new
hues are introduced, per the "propose tokens, not one-off hex" rule.

---

### B5. Guide character — "Disha the Compass" (could)

**What it is and, importantly, is not.** A small mascot drawn from the
compass-rose motif already in the design system (`ornament/compass-rose.svg`),
given two dot eyes and a simple curved-line smile, so it reads as "the
chart's compass come to life" rather than an unrelated cartoon dropped
onto a nautical chart. **It never states a historical fact.** Every line
of its dialogue is either app-interface guidance ("Try tapping a glowing
dot!") or a *pointer* toward existing, already-badged content ("There's a
stamp waiting near the coast!") — never a claim, date or name that isn't
already rendered elsewhere with its own citation. This rule is the reason
B5 is safe to ship without researcher/editor review: it carries zero
historical content of its own.

**Where it appears.** Only in two places, both optional and dismissible:
the intro (B1, as the icon in each step) and quest hints (B2, "Give me a
hint"). It does not float persistently over the map — a constantly-visible
mascot would compete with the map itself, which is the actual centrepiece.

**Anatomy (hint bubble, e.g. from B2):**

```
  (compass-hint icon, animated to "point" toward
   the correct general direction — see below)
┌───────────────────────────────┐
│ "Try looking further down      │
│  the coast!"                   │
└───────────────────────────────┘
```

**States.** Idle (intro icon, static) · pointing (quest hint, a subtle
2 px rotation toward the target's bearing, `--dur-base`, looping once,
not continuously — a continuous loop would violate "no JS animation loop
under reduced motion" trivially, so it's a single settle-and-stop
animation by design, not just by media query) · reduced-motion (renders
already rotated to the final bearing, no animation).

**Keyboard / screen reader.** The character graphic is `aria-hidden="true"`
in all cases (decorative); its speech is real text in the surrounding
dialog/toast, already covered by B1's and B2's own accessibility notes —
Disha is never itself a separate focusable element or a second source of
truth for anything a screen reader needs.

**Tokens.** `--laterite-700`/`--gold-400` (character line colour on
parchment vs navy contexts respectively, matching whichever surface it
sits on), `--dur-base`.

**Open decision for the human:** whether a mascot is wanted at all, versus
keeping the guide purely textual ("Hint:" prefix, no character art).
Recommend keeping Disha — it costs one small SVG, appears in exactly two
low-frequency places, and gives the hint UI a face without adding any
historical content risk. If rejected, delete `guide-disha.svg` and
replace its two usages with a plain "Hint:" label; nothing else in this
doc depends on it.

---

### B6. Friendlier copy (must)

Grade ≤ 5 rewrites for controls and states already specced elsewhere
(engineer applies these strings verbatim; they do not change any
component's structure):

| Context | Old / generic | New |
|---|---|---|
| Map empty state (side panel, ≥900 px) | "Select a port, route or site to learn more." | "Tap a dot on the map to find out its story." |
| Zoom reset button | "Reset view" | "Reset view" (kept — already plain) |
| Legend summary (360 px) | "▸ Map key" | "▸ What do the colours mean?" |
| Cargo manifest trigger | "What's in the ship?" | (kept — already excellent, master prompt §10.2) |
| Loading (should not normally occur, per `port-card.md`, but keep copy ready) | "Loading…" | "Getting your map ready…" |
| Keyboard-keys popover title | "Map keyboard shortcuts" | "How to move around the map" |
| Logbook empty state | — | "Tap a dot on the map to get your first stamp!" |
| Quest skip | "Skip" | "Skip this one" |
| View toggle (A1) | — | "Show the Odisha coast" / "Show the whole ocean" (already specced above, listed here for completeness) |

---

## Build order (for the engineer)

1. **Must, in this order:** A2 (wheel-zoom fix) → A1 (default view + toggle
   buttons) → A4 (labels/clusters/marker size) → A3 (phone full-screen
   mode) → B6 (copy pass, can happen anytime, cheap).
2. **Should, after Must is stable:** B1 (intro) → B3 (logbook) → B4
   (stamp visuals/celebration, since B3 needs somewhere to render them).
3. **Could, last:** B2 (quest mode, depends on smooth selection from Part
   A and benefits from B3/B4 existing) → B5 (guide character, smallest
   and most skippable piece).

## Files touched by this spec

- `docs/design/kid-experience.md` (this file).
- `src/assets/kids/logbook.svg`, `stamp-frame.svg`,
  `stamp-port.svg`, `stamp-good.svg`, `stamp-route.svg`, `stamp-site.svg`,
  `stamp-inscription.svg`, `quest-map.svg`, `compass-hint.svg`,
  `guide-disha.svg`.
- `src/styles/tokens.css`: adds `--progress-track`, `--progress-fill`,
  `--stamp-ink`, `--stamp-glow` (see B4 table for values and ratios).
- `docs/attribution.md`: one row per new SVG above.

No file under `src/islands/`, `src/pages/`, `src/components/`,
`src/data/` or `scripts/` is touched by this spec — an engineer implements
against it.
