# Kalinga: Ancient Trade Routes

Interactive historical atlas of Kalinga (Odisha) trade, c. 300 BCE – 1900 CE, built as a static digital museum for 10-year-olds first and scholars second. Full brief: `kalinga-website-master-prompt.md`. Architecture: `docs/ARCHITECTURE.md`.

**The one rule above all others: no source, no render.** Every historical claim carries `source_refs` and an evidence tier; the build fails otherwise. Never invent a port, route, date, artefact or quotation.

## Stack and commands

Astro 5 (static) + React 19 islands + D3-geo v7 + TypeScript strict. Node 20. Map = Natural Earth vectors drawn with D3, no tile server.

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server at http://localhost:4321 |
| `npm run validate:data` | Schema + sourcing rules over `src/data/`. Runs before every build. |
| `npm run build` | Static build to `dist/` |
| `npm run check` | Astro/TypeScript type check |
| `npm run readability` | Flesch-Kincaid ≤ 7 over `src/content/` |
| `npm run fetch:geo` | Download Natural Earth TopoJSON into `public/geo/` (needed once) |
| `npm run audit:lighthouse` / `audit:a11y` | Lighthouse against a running preview |

## Layout

```
src/data/        schema.ts (Zod), *.json data, load.ts (published only), cite.ts
src/content/     narrative Markdown (editor agent)
src/islands/     React islands: Atlas, AtlasMap, Timeline — the only client JS
src/components/  EvidenceBadge.astro, SourcePopover.astro, other static UI
src/layouts/     Base.astro
src/pages/       index.astro, sources.astro
src/styles/      tokens.css (design tokens)
src/assets/      original SVG illustrations (CC BY-SA)
scripts/         validate-data.ts, readability.ts, fetch-geo.ts
docs/            ARCHITECTURE.md, design/, research/, audits/
```

## Data rules (short form; full rules in the `historical-sourcing` skill)

- Entities: `source`, `period`, `port`, `route`, `good`, `site`, `inscription`, `fact`. All but the first two extend `Claim` in `src/data/schema.ts`.
- `evidence_level`: `Confirmed` | `Strongly Supported` | `Probable` | `Hypothetical` | `UNVERIFIED`. The first two need ≥ 2 distinct sources. One source = `Probable` at most.
- `evidence_type`: `archaeological` | `scholarly` | `traditional`. Always set; always shown with a distinct glyph.
- `status`: `draft` → `reviewed` → `published`. Agents only ever write `draft`. Humans promote. Only `published` renders.
- Sources outside the registry get `approved_by_human: false` and a line in `docs/research/flagged-sources.md`.
- Ids are kebab-case, unique across all files, never renamed after publishing.

## Quality gates

WCAG 2.1 AA · keyboard-navigable map and timeline · Lighthouse ≥ 90 in all four categories · FCP < 2 s on 4G · initial page weight < 1.5 MB · public copy Flesch-Kincaid grade ≤ 7 · zero `[NEEDS VERIFICATION]` in published content.

## Design in one line

Nautical charts + palm-leaf manuscripts + inscription rubbings under museum light. Navy sea, parchment land, laterite and verdigris accents, gold highlights. EB Garamond headings, Source Sans 3 body. Tokens only, in `src/styles/tokens.css`. Badges are colour + glyph + text, never colour alone.

## Agents, skills, and which model does what

The main session is the **orchestrator**: it checks gates, delegates, verifies. It never writes historical content, assets or feature code itself.

| Agent (`.claude/agents/`) | Owns | Model |
|---|---|---|
| `researcher` | `src/data/*.json`, `docs/research/` | opus |
| `designer` | tokens, `docs/design/`, `src/assets/` | sonnet |
| `engineer` | `src/` code, build passing | sonnet (opus for `AtlasMap`/`Timeline` core) |
| `editor` | `src/content/`, readability | sonnet |
| `qa-auditor` | `docs/audits/` reports only | haiku |

| Skill | Use |
|---|---|
| `/phase research\|design\|build\|content\|launch` | Run one phase: gate check → routed delegation → verification |
| `/add-entry <type> <name>` | Research and add one data entry (researcher, opus) |
| `/validate-data` | Run and summarise the validator (haiku) |
| `/fact-check <path>` | Check a content file's claims (editor on opus) |
| `/audit` | Build, preview, Lighthouse, dated report (qa-auditor, haiku) |
| `historical-sourcing`, `design-system`, `atlas-engineering` | Reference skills, preloaded into agents; not user-invocable |

Model routing principle: **the tier follows the cost of being wrong.** Sourcing and fact-checking on Opus; bounded creative and implementation work on Sonnet; validators and audits on Haiku. Override by naming a model in the request.

Path-scoped rules load automatically: `.claude/rules/data.md`, `ui.md`, `content.md`.

## Conventions

- TypeScript strict with `noUncheckedIndexedAccess`; guard array access.
- Pages read data only via `src/data/load.ts`. Never import JSON directly.
- Any UI that shows a historical claim composes `EvidenceBadge` and `SourcePopover`.
- React only under `src/islands/`, mounted with `client:visible` or `client:idle`.
- Named exports except Astro pages and the `Atlas` island entry.
- Path aliases: `@data/*`, `@components/*`, `@islands/*`, `@layouts/*`, `@styles/*`.
- Every SVG asset: `<title>`, `<desc>`, licence comment, `currentColor`, 64 px viewBox. Reconstructions are labelled "Artistic reconstruction — not a historical document."
- `npm run build` and `npm run check` must pass before reporting code done.

## Licences

Code MIT. Original art CC BY-SA 4.0. Data CC BY 4.0. Fonts SIL OFL, self-hosted. Map data Natural Earth (public domain), credited in the footer. No tile APIs, no analytics, no cookies, no AI-generated imagery presented as historical.
