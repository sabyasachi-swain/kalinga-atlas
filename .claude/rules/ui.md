---
paths:
  - "src/components/**"
  - "src/islands/**"
  - "src/layouts/**"
  - "src/pages/**"
  - "src/styles/**"
---

# Rules for UI code

- Data enters pages only through `src/data/load.ts`; never import JSON directly.
- Any element that shows historical text renders `EvidenceBadge` and `SourcePopover` next to it.
- React lives only in `src/islands/`; mount with `client:visible` or `client:idle`.
- Colours, spacing, type and motion come from `src/styles/tokens.css`. No raw hex in components.
- Keyboard: every interactive element focusable with a visible `--focus-ring`; map and timeline follow the keyboard model in `.claude/skills/atlas-engineering/map-architecture.md`.
- Every visual has a text alternative; decorative SVG is `aria-hidden`.
- Respect `prefers-reduced-motion`: no JS animation loop when it is set.
- Touch targets ≥ 44 px. Works at 360 px width without horizontal scroll.
- `npm run build` and `npm run check` must pass before you report done.
