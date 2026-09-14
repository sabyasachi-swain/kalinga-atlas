---
paths:
  - "src/content/**"
---

# Rules for narrative content

- Frontmatter: `entity_id` (matches an id in `src/data/`), `title`, optional `scholar: true`.
- Every paragraph ends with an inline citation `[Surname, Year, p.XX]` whose Surname and Year resolve to `src/data/sources.json` (see `src/data/cite.ts`). Several: `[Ray, 2003, p.112; Behera, 2000, p.45]`.
- Prose never exceeds the entry's `evidence_level`: "found" for Confirmed, "agree" for Strongly Supported, "think/probably" for Probable, "one idea is / a story says" for Hypothetical.
- Say who is speaking: archaeology, scholars, or tradition.
- Flesch-Kincaid grade ≤ 7 (`npm run readability`) unless `scholar: true`.
- Unsupported claims get `[NEEDS VERIFICATION]` plus an HTML comment explaining what is missing. Files containing it are not published.
- Run `/fact-check <path>` after writing or editing a file.
