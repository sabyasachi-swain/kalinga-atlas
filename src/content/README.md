# Narrative content

Markdown written by the **editor** agent, one file per entity, mirroring `src/data/`:

```
src/content/ports/<id>.md
src/content/routes/<id>.md
src/content/goods/<id>.md
src/content/sites/<id>.md
src/content/inscriptions/<id>.md
src/content/sections/<section>.md   (intro copy for each site section)
```

Rules (enforced by `.claude/rules/content.md` and `npm run readability`):

- Frontmatter: `entity_id`, `title`, optional `scholar: true` for Scholar-mode-only text.
- Every paragraph ends with an inline citation in the form `[Author, Year, p.XX]` whose source exists in `src/data/sources.json`.
- Unsupported claims are marked `[NEEDS VERIFICATION]` and cannot ship.
- Flesch-Kincaid grade <= 7 unless `scholar: true`.
