# Fact-check log

Log of editorial passes over `src/content/`. One row per file: date, file, sentences checked, flags.
Sentence counts exclude frontmatter and inline citation brackets.

| Date | File | Sentences | Flags |
|---|---|---|---|
| 2026-09-14 | src/content/goods/ivory.md | 16 | none |
| 2026-09-14 | src/content/goods/elephants.md | 14 | none |
| 2026-09-14 | src/content/goods/cotton-textiles.md | 12 | none |
| 2026-09-14 | src/content/goods/salt.md | 17 | none |
| 2026-09-14 | src/content/goods/rice.md | 16 | none |
| 2026-09-14 | src/content/goods/cowrie-shells.md | 14 | none |
| 2026-09-14 | src/content/goods/chinese-ceramics.md | 13 | cites tripati-2021-current-science, which has `approved_by_human: false` in sources.json; claim itself is well supported by three other sources |
| 2026-09-14 | src/content/goods/roman-amphorae.md | 16 | tier held at Probable; both cited works share an author (Benudhar Patra), noted in the scholars section; prose avoids implying Roman ships called here |
| 2026-09-14 | src/content/goods/diamonds.md | 24 | tier held at Probable; ancient link (Ptolemy/Sambalaka) is a chain of two conjectures, flagged in the scholars section |
| 2026-09-14 | src/content/goods/sal-timber.md | 14 | none |
| 2026-09-14 | src/content/goods/iron.md | 14 | none |
| 2026-09-14 | src/content/goods/tasar-silk.md | 14 | none |
| 2026-09-14 | src/content/goods/lac-and-beeswax.md | 12 | none |
| 2026-09-14 | src/content/sites/sisupalgarh.md | 18 | Sisupalgarh = Tosali/Kalinganagari identification presented as a scholarly proposal, not fact |
| 2026-09-14 | src/content/sites/jaugada.md | 14 | none |
| 2026-09-14 | src/content/sites/dhauli.md | 18 | two colonial sources disagree on which edicts are present; Dhauli = Tosali presented as a long-standing proposal, not fact |
| 2026-09-14 | src/content/sites/udayagiri-khandagiri.md | 16 | Hathigumpha inscription's date is disputed among scholars; presented as such |
| 2026-09-14 | src/content/sites/ratnagiri-lalitgiri-udayagiri-buddhist-complex.md | 15 | one entry covers three separate hills; scholars section notes this explicitly |
| 2026-09-14 | src/content/sites/radhanagar.md | 17 | rouletted ware sherds not yet chemically tested; prose does not call them imports, per excavator's own caveat |
| 2026-09-14 | src/content/sites/golbai-sasan.md | 14 | boat-building claim is an inference from woodworking tools, not a found boat; flagged in scholars section |

## Notes

- No file in this batch contains `[NEEDS VERIFICATION]`. Anything not supported by `src/data/goods.json`, `src/data/sites.json` or their cited sources was left out rather than asserted.
- All 20 files pass `npm run readability` at or under grade 7 (see report). No file uses `scholar: true`; the "For scholars" sections are written in plain language and count toward each file's reading-level score.
- Citation surnames follow `src/data/cite.ts` exactly, including three long, awkward renderings for sources with no author/editor/translator field (`imperial-gazetteer-orissa`, `imperial-gazetteer-india-1908`, `district-gazetteers-odisha`) and one classical work rendered as `[Anonymous, 1989, ...]` because its `author` field is the literal string "Anonymous" (`periplus-casson-1989`).
- `patnaik-2014-odisha-review` and `patnaik-2014-radhanagar` both render as `[Patnaik, 2014, ...]` under `cite.ts` (same author surname and year, different papers). Not fixable from `src/content/`; noted here for a human to consider disambiguating in `sources.json`.
