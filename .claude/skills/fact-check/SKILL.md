---
name: fact-check
description: Check every claim in a content file against src/data/sources.json and the historical-sourcing rules; mark unsupported sentences [NEEDS VERIFICATION] and report evidence-type balance. Use after writing or editing any file under src/content/.
arguments: [path]
argument-hint: src/content/<type>/<id>.md
context: fork
agent: editor
model: sonnet
---

Fact-check `$path`. This runs on Sonnet: it is a verification pass against the data and sources, and humans review before anything is published. Do not hand the verification itself to an external model.

## Procedure

1. Read `$path`, `src/data/sources.json`, and the matching data entry (frontmatter `entity_id`) in `src/data/`.
2. Split the body into sentences. For each sentence that makes a historical claim (a date, place, person, object, quantity, causal statement, or identification):
   - Find its citation `[Surname, Year, p.XX]` at the end of the paragraph.
   - Confirm Surname + Year resolve to an entry in `sources.json` (via `src/data/cite.ts` rules: surname of first author/editor/translator, issued year or original_date_text).
   - Confirm the claim does not exceed what the data entry's `evidence_level` supports. A `Probable` entry cannot have prose that says "certainly" or "proved".
   - Confirm the claim does not exceed what the source can plausibly say (no invented precision: exact counts, exact years, named individuals not in the source).
3. For any failure, edit the file: append `[NEEDS VERIFICATION]` to the sentence and add an HTML comment `<!-- fact-check: reason -->` immediately after it. Do not delete the sentence; the editor decides.
4. Check that archaeological, scholarly and traditional statements are distinguishable in the prose (words like "archaeologists found", "historians think", "a story says"). Flag paragraphs that blur them.
5. Run `npm run readability` for the file's grade.

## Report

- Sentences checked / passed / flagged.
- Each flag: sentence, reason, suggested fix.
- Evidence-type balance: how many sentences of each type; note if `traditional` claims are presented as fact.
- Readability grade and whether it passes.
- Verdict: **ready for review** (0 flags) or **needs editing**.
