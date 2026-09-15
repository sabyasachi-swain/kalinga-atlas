# Kalinga: Ancient Trade Routes

An interactive historical atlas of how Kalinga (modern Odisha) traded with India and the Indian Ocean world, c. 300 BCE to 1900 CE. Built as a static digital museum: a map and timeline you can explore, with every claim tied to a published source and tagged with its level of evidence.

## Principles

- **No source, no render.** Every port, route, good, site, inscription and fact carries `source_refs`. The build fails if a published entry lacks one.
- **Evidence is graded and typed.** `Confirmed` · `Strongly Supported` · `Probable` · `Hypothetical`, and `archaeological` · `scholarly` · `traditional`. The UI never shows a claim without both.
- **Open licence only.** Natural Earth map data, SIL OFL fonts, original CC BY-SA illustrations, MIT code.
- **A 10-year-old first, a scholar second.** Simple map and glowing dots first, citations one tap away.

## Quick start

```bash
npm install
npm run fetch:geo      # downloads Natural Earth 50m land + coastline into public/geo/
npm run dev            # http://localhost:4321
```

Other commands:

| Command | What it does |
|---|---|
| `npm run validate:data` | Validates every file in `src/data/` against the schema and the evidence rules. Runs automatically before `build`. |
| `npm run readability` | Flesch-Kincaid check on `src/content/`; fails above grade 7. |
| `npm run build` | Static build to `dist/`. |
| `npm run preview` | Serve the build locally. |
| `npm run serve:dist` | Serve `dist/` with gzip and cache headers, for local Lighthouse runs. |
| `npm run audit:a11y` | Accessibility-only Lighthouse run (axe-core rules) into `docs/audits/`. |
| `npm run audit:lighthouse` | Lighthouse report into `docs/audits/`. |

Local Lighthouse runs must target `npm run serve:dist` (port 4173), not `astro dev` or `astro preview`: both of those serve uncompressed and without cache headers, which alone can cost 40+ performance points that a real static host never charges. `audit:lighthouse` and `audit:a11y` also block requests to `*kaspersky-labs.com*`, because on a machine running Kaspersky the antivirus injects its own script and stylesheet into every plain-HTTP `localhost` page — several hundred KiB of render-blocking, third-party weight that has nothing to do with this site and does not exist for a real visitor over HTTPS. If you don't run Kaspersky, that flag is a harmless no-op.

## Working with Claude Code

This repo is set up for Claude Code. Open it and use:

- `/phase research` · `/phase design` · `/phase build` · `/phase content` · `/phase launch`
- `/add-entry port Manikapatna` to research and add one data entry
- `/validate-data`, `/fact-check src/content/ports/palur.md`, `/audit`

See [CLAUDE.md](CLAUDE.md) for the rules and [kalinga-website-master-prompt.md](kalinga-website-master-prompt.md) for the full brief.

## Layout

```
src/data/        historical data (JSON) + Zod schema
src/content/     narrative copy (Markdown), written by the editor agent
src/islands/     React islands: AtlasMap, Timeline (the only client JS)
src/components/  Astro components (static UI)
src/styles/      design tokens
scripts/         validators and data fetchers
docs/            architecture, research notes, audit reports
public/geo/      Natural Earth TopoJSON (generated)
```

## Licence

Code: MIT. Original artwork: CC BY-SA 4.0. Data: CC BY 4.0. See [LICENSE](LICENSE).
