# Improvement plan — 16 September 2026

Written from eight pieces of owner feedback, each checked against the code
before being planned, plus a survey of what the atlas is missing. Phases are
ordered so that the things that actively confuse a visitor are fixed before
new features are added.

Evidence for the interaction decisions:
[Map UI Patterns, Timeline slider](https://mapuipatterns.com/timeline-slider/)
and [Ideum, Strategies for Using Maps in Interactive Digital Exhibits](https://ideum.com/news/using-maps-interactive-digital-exhibits).

---

## What was verified before planning

| Feedback | Finding in the code |
|---|---|
| "Routes need middle stops" | **Already have them.** All 32 routes carry 3–6 waypoints; none is a 2-point straight line. The waypoints are unlabelled bends, so no stop is ever *named*. The fix is labelling, not geometry. |
| "Slider is confusing, I still see all routes" | **Confirmed.** `AtlasMap.tsx` renders inactive markers and routes at `--map-inactive-opacity: 0.4`. Every route stays on screen in every period. |
| "Timeline page and homepage feel the same" | **They are the same page.** `Base.astro` links "Timeline" to `#timeline`, an anchor on the home page. No `/timeline` route exists. |
| "Fact popup overlaps the map" | **Confirmed.** `.atlas-fact` is `position: absolute` inside the map figure, by design from the last layout pass. |
| "No regions or country demarcation" | Borders exist but load **only** when the ocean view is first shown, and are a faint hairline with no country or sea labels. |

---

## Phase 1 — Stop confusing the visitor (engineer)

### 1.1 Move the fact card off the map
It currently covers the map centre on desktop and mobile. Anchor it **below**
the map on narrow screens and in the **right-hand details column** on wide ones.
It must never overlap the canvas, the controls or the timeline. Keep the
500 ms settle debounce, the evidence badge and the citation.

### 1.2 Make the slider actually filter
Per the timeline-slider pattern, the current "keep everything at 40% opacity"
is the documented failure mode: filtered data must not compete with current
data.
- **Hide** non-current routes and markers by default.
- Add one explicit control: "Show other centuries faintly" (off by default).
- Add **step controls** either side of the slider (‹ ›) and a **Play** button
  that walks the periods in sequence — the pattern's recommended way to
  guarantee a legible progression.
- Show a live count next to the period name: "Chola Age · 900–1200 CE ·
  **6 routes, 11 ports**". This answers "which routes are related" directly.
- Snap the slider to period boundaries; never to arbitrary years.

### 1.3 Name the stops on every route
The waypoints exist; nothing shows them.
- Draw a small dot at each intermediate waypoint of the selected route.
- Label the ones that correspond to a known port or site.
- On selecting a route, list its stops in order in the details panel:
  "Manikapatna → Palur → Kalingapatnam → …".
- Where a waypoint is only a geometric bend rather than an attested stop, do
  **not** label it, and say so in the panel: "Course between stops is
  approximate."

### 1.4 Give the map orientation (the "no regions" complaint)
Ideum's guidance: start from a familiar reference point, label economically.
- Load the modern borders layer **always**, not only on the ocean view.
- Add economical labels: INDIA, SRI LANKA, MYANMAR, and **BAY OF BENGAL** on
  the water, in a restrained map-label style, fading in by zoom so they never
  crowd the ports.
- Add a scale bar and a north arrow.
- Keep the caption that these are modern borders shown for orientation only.

### 1.5 Make it feel interactive
- Pointer cursor and a clear hover/focus state on every marker and route.
- A one-off animated open: brief zoom from the whole Bay of Bengal down to the
  Odisha coast, so a child sees where they are before the detail appears
  (Ideum's "overview to detail"). Instant under `prefers-reduced-motion`.
- A visible nudge on first load: "Tap a glowing dot" pointing at a real marker.

**Acceptance:** 0 pin/label overlaps at 1280 and 380; ≤ 2 renders per 20-step
zoom; the fact card's rectangle never intersects the map canvas; selecting a
period changes the drawn route count; check and build clean.

---

## Phase 2 — Say less, and say it better (editor)

### 2.1 The 47 missing narratives
Published entities with no narrative: **20 routes, 14 goods, 11 ports, 2 sites**.
Every one already has verified citations to write from. Grade 7 or lower, one
citation per paragraph, evidence badge on every claim.

### 2.2 Uncertainty: mark it or drop it
Owner instruction: *if unsure, mark it; otherwise do not mention it.*
- Never hedge in body text. The tier badge carries the uncertainty.
- Anything at `Hypothetical` or `UNVERIFIED` gets a plain-language chip a child
  understands — "Scholars are not sure" — not a scholarly hedge in the prose.
- Sweep existing narratives for "may have", "possibly", "it is thought" where
  the entry is `Confirmed` or `Strongly Supported`: state it plainly instead.
- Where a claim genuinely cannot be tiered above `Probable`, keep it, badge it,
  and keep the sentence short.

---

## Phase 3 — Make it a kid magnet (engineer + designer)

The assets for all of this were drawn weeks ago and have never been used:
`logbook.svg`, `stamp-{port,route,good,site,inscription}.svg`, `stamp-frame.svg`,
`quest-map.svg`, `guide-disha.svg`, `compass-hint.svg`.

### 3.1 Sail the route (the single highest-value feature)
A **Sail this route** button on any selected route. A little ship travels the
waypoints, pausing at each named stop with one short line: *"At Palur, traders
loaded ivory."* Every line comes from existing sourced data; nothing is
invented. This turns a static line into the story the owner is asking for, and
it is the natural home for the named stops built in 1.3.

### 3.2 The logbook and stamps
Opening a port, route or good stamps the child's logbook. Progress reads
"12 of 30 ports found". Stored in `localStorage`. Stamps use the existing art.

### 3.3 Disha the Compass
A guide who only points — "Try dragging the timeline to 300 BCE" — and never
states history.

### 3.4 Icons everywhere
Goods currently render as text. Give each an icon (rice, salt, ivory, elephant,
silk, pepper). A child should recognise a cargo without reading.

### 3.5 Start your voyage
A three-step skippable intro on first visit: where Kalinga is, what the dots
mean, how to change century.

---

## Phase 4 — A real Timeline page (engineer + editor)

`/timeline` currently does not exist; the nav link is an anchor. Build a
distinct page: a vertical, scrolling story of the eleven periods, each with its
dates, what changed, the ports that mattered, one artefact or inscription, and
a link into the map at that period. The home page stays map-first; the timeline
page becomes story-first. That is the difference the owner is asking for.

---

## Phase 5 — Verify (qa-auditor)

Lighthouse in all four categories (last run 15 September, before every change
since), axe-core, keyboard-only pass over map, timeline and dialogs, 380 px and
1280 px, and the page-weight budget with the borders layer now loading.

---

## Needs a decision from the owner

1. **Approve two sources** — `kingwell-banham-2018-antiquity-mantai` and
   `bellina-2018-antiquity-myanmar-ports`. Publishes Mahatittha and Maliwan.
2. **Photographs?** The site has none. Museum/Wikimedia CC-BY artefact images
   would help enormously, but it is a licensing decision.
3. **Odia language?** Noto Sans Oriya is already bundled and reserved.
4. **The four Ashoka edict routes** draw as very long lines to Ujjain and
   Taxila. Keep, or restrict to trade routes only?

## Blocked on material the owner may be able to supply

Paywalled scholarship (JSTOR, Brill, Cambridge), physical books, Odia-language
sources, and ASI excavation reports that are not online. These set the ceiling
on how far `Probable` entries can be raised, and on filling the thin periods:
Gajapati has 0 routes and 0 sites, Bhauma-Kara 0 routes, Kharavela and Gupta
0 goods, Mughal-Maratha 0 sites.

## Worth more than any feature

Watch a ten-year-old use it for thirty minutes. Every kid-friendliness decision
so far is inference, and the Ideum guidance is explicit that map exhibits need
testing with unfamiliar users more than most.
