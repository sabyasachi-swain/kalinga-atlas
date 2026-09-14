---
paths:
  - "src/data/**"
---

# Rules for historical data (`src/data/`)

- Every entity conforms to `schema.ts`. Run `npm run validate:data` after any edit.
- `source_refs` is never empty except on an `UNVERIFIED` draft. Each ref names a `source_id` from `sources.json` and a `page` or section.
- `Confirmed` and `Strongly Supported` need two or more distinct `source_id`s. One source is `Probable` at most.
- `UNVERIFIED` entries stay `draft`. Only a human moves any entry to `reviewed` or `published`; agents always write `draft`.
- Ids are kebab-case, unique across all files, and never renamed once published.
- Never edit `schema.ts` inside a research task; propose the change in the report.
- `sources.json` entries added by an agent carry `approved_by_human: false` and a line in `docs/research/flagged-sources.md`.
- Coordinates come from a gazetteer or site report named in `coordinate_source`.
- `summary` and `kid_line` are for a 10-year-old: two short sentences, no jargon.
