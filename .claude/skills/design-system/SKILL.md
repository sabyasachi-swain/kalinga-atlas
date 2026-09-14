---
name: design-system
description: Visual language for the Kalinga Atlas — palette, type, evidence-badge spec, SVG illustration rules, motion. Preloaded into the designer agent. Use when creating tokens, components, icons, illustrations or any visual spec.
user-invocable: false
---

# Kalinga Atlas design system

**Feeling:** walking through a museum of ancient nautical charts and palm-leaf manuscripts, lit for exhibition. Reverential, luminous, inviting to a ten-year-old. Never a textbook, never the generic "warm cream + terracotta" template.

## Sources of the look (all open or original)

- Nautical charts: rhumb lines, compass roses, hand-lettered place names.
- Odisha palm-leaf manuscripts (pothi) and pattachitra line work: fine incised outlines, restrained flat colour.
- Inscription rubbings: low-contrast texture, letterforms as ornament.
- Temple frieze line art: ships, elephants, merchants as simplified silhouettes.

Reference real artefacts by name in your notes, but every drawing is **original**. Do not trace or reproduce a museum photograph.

## Tokens

The canonical values live in `src/styles/tokens.css`. Summary in `${CLAUDE_SKILL_DIR}/tokens.md`. Rules:

- Use tokens, never raw hex, in components.
- Page surfaces are parchment; the map surface is always navy, whatever the page.
- Gold is an accent for focus, highlights and port glows. It is never a background for body text.
- Every text/background pair must reach WCAG 2.1 AA (4.5:1 body, 3:1 large). Check before proposing a new pair.

## Typography

| Role | Face | Notes |
|---|---|---|
| Headings, place names on map | EB Garamond (OFL) | Historicity without pastiche. Weight 500–600. |
| Body, UI | Source Sans 3 (OFL) | Humanist, highly legible at 16 px on mobile. |
| Odia (Phase 2) | Noto Sans Oriya (OFL) | Reserved; do not use Latin fallback for Odia. |

Minimum body size 16 px. Kid-facing copy at `--text-md` or larger, line length 45–70 characters.

## Evidence badges (the one component that must never be simplified away)

Every historical claim shows **tier** and **type**, each as colour + glyph + text label:

| Tier | Glyph | Token |
|---|---|---|
| Confirmed | ✓✓ | `--tier-confirmed` |
| Strongly Supported | ✓ | `--tier-strong` |
| Probable | ~ | `--tier-probable` |
| Hypothetical | ? | `--tier-hypothetical` |
| UNVERIFIED | ! | `--tier-unverified` (should never render publicly) |

| Type | Glyph | Token |
|---|---|---|
| archaeological | ◆ | `--type-archaeological` |
| scholarly | ■ | `--type-scholarly` |
| traditional | ● | `--type-traditional` |

Compact mode hides the label visually but keeps it for screen readers. Implementation: `src/components/EvidenceBadge.astro`.

## Illustrations (SVG)

Location: `src/assets/{ships,goods,ports,ornament}/<kebab-name>.svg`.

Every file must contain, in this order:
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-labelledby="title desc">
  <!-- Original illustration for Kalinga: Ancient Trade Routes. CC BY-SA 4.0. Artistic reconstruction — not a historical document. -->
  <title id="title">Pepper</title>
  <desc id="desc">A cluster of black peppercorns on a stem, drawn as a simple line icon.</desc>
  ...
</svg>
```

Rules:
- Line icons for goods and UI; filled silhouettes for ships and ports. Stroke 2 px at 64 px viewBox, `stroke-linecap: round`, `currentColor` so they inherit tokens.
- Ships: generic Bay of Bengal sailing craft silhouettes. Do not label a drawing as a specific historical vessel type unless a cited source describes it.
- Any reconstruction shown at illustration scale (not icon scale) carries a visible caption: "Artistic reconstruction — not a historical document."
- No AI-generated raster images of "ancient" scenes. If a raster is unavoidable, it is labelled the same way and its origin recorded in `docs/attribution.md`.

## Map style

- Sea `--map-sea`, land `--map-land` with a thin `--map-land-edge`, rivers `--map-river`.
- Routes: `--map-route` 2 px with a wider `--map-route-glow` underlay; dashed for `Hypothetical`, solid otherwise; animated dash offset gives "flow".
- Ports: `--map-port` 6 px dot with a pulsing `--map-port-glow` halo when active in the period; muted to 40 % when not.
- Labels in EB Garamond, `--map-label`, halo stroke of `--map-sea` for legibility.
- Period switch: old layer fades out and new fades in over `--dur-page` with `--ease-page`; respect `prefers-reduced-motion` (tokens already zero the durations).

## Interaction patterns

- Progressive disclosure: dot → card → panel. Each step adds detail, none removes the badge or source.
- Touch targets ≥ 44 px. Map markers get an invisible 44 px hit area.
- Focus ring: `--focus-ring` everywhere; never remove outlines without a replacement.
- "Did you know?" tooltips are dismissible, keyboard-reachable and never auto-open more than one at a time.

## Deliverables for a design task

1. Token changes in `src/styles/tokens.css` (with contrast ratios noted in the commit or report).
2. Component spec as a short Markdown file in `docs/design/<component>.md`: purpose, anatomy, states, a11y notes, tokens used.
3. SVGs in `src/assets/...` following the template above.
4. A line in `docs/attribution.md` for anything not drawn from scratch.
