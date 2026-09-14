---
name: historical-sourcing
description: Reference for citing, tiering and recording historical claims about Kalinga/Odisha trade. Preloaded into the researcher and editor agents. Use whenever writing or checking any port, route, good, site, inscription, fact, or narrative sentence.
user-invocable: false
---

# Historical sourcing for the Kalinga Atlas

You are working on a site whose whole value rests on one promise: **nothing appears without a published source, and every claim says how sure we are.** These rules are not style preferences. The build fails when they are broken.

## 1. The five rules you can never break

1. **Never invent.** No port, route, inscription, date, coordinate, artefact, or quotation that you cannot trace to a specific published source. If you are unsure whether you are remembering or generating, you are generating. Mark it `UNVERIFIED`.
2. **Never upgrade a tier.** One source = `Probable` at best. `Confirmed` and `Strongly Supported` need two or more *distinct* sources (different works, not two pages of the same book).
3. **Never merge entities.** Tamralipti (Bengal) is not Palur (Odisha). "Palura" in Ptolemy and modern Palur are *possibly* the same place; say so in `caveats`, do not assert it.
4. **Never extrapolate across periods.** A good documented in the 1st century CE is not evidence it was traded in the 12th. List only the periods your sources support.
5. **When uncertain, say so.** `evidence_level: "UNVERIFIED"` plus `status: "draft"` is a valid, useful output. A plausible fabrication is the worst possible output.

## 2. Evidence tiers: decision table

| Tier | Use when | Minimum sources |
|---|---|---|
| `Confirmed` | Direct archaeological or epigraphic evidence, reported in an excavation report or inscription edition, and independently corroborated. | 2 distinct |
| `Strongly Supported` | Several independent scholarly sources agree, at least one grounded in primary evidence. | 2 distinct |
| `Probable` | One credible academic source, or a well-argued inference from evidence. | 1 |
| `Hypothetical` | Scholarly conjecture, traditional or folk account, or extrapolation flagged as such by the source. | 1 |
| `UNVERIFIED` | You believe it but cannot cite it. Draft only. Never published. | 0 |

**Evidence type** is separate from tier and is always set:

| `evidence_type` | Meaning |
|---|---|
| `archaeological` | Excavated finds, inscriptions, coins, structures. |
| `scholarly` | A historian's interpretation or synthesis. |
| `traditional` | Folk narrative, legend, festival lore (e.g. Bali Jatra as memory of voyages). Almost always `Hypothetical`. |

## 3. Source registry

The approved registry is in `${CLAUDE_SKILL_DIR}/registry.md` and mirrored as bibliographic entries in `src/data/sources.json` (each with `approved_by_human: true`).

**Using a source not in the registry.**
1. Add it to `src/data/sources.json` with `approved_by_human: false` and a `note` explaining why it is credible (peer-reviewed journal, university press, ASI, state archive).
2. Append a line to `docs/research/flagged-sources.md`: id, full reference, why needed, what it supports.
3. Entries citing it stay `draft`. The validator blocks publishing until a human flips `approved_by_human`.

**Never acceptable as a source:** Wikipedia (fine as a *finding aid* to locate the real source), blogs, tourism sites, AI-generated text, unverifiable oral claims, your own memory.

## 4. Recording a claim

Every entity in `src/data/*.json` follows `src/data/schema.ts`. Minimal shape:

```json
{
  "id": "manikapatna",
  "name": "Manikapatna",
  "summary": "A port on Chilika lake where traders left behind pottery from far away.",
  "evidence_level": "Probable",
  "evidence_type": "archaeological",
  "source_refs": [{ "source_id": "asi-annual-reports", "page": "IAR 1989-90, pp. 68-70", "note": "excavation summary" }],
  "periods": ["gupta"],
  "status": "draft",
  "coordinates": { "lat": 19.6, "lng": 85.4 },
  "coordinate_source": "asi-annual-reports"
}
```

Rules for the fields:
- `page` is mandatory in practice. "Somewhere in Behera 2000" is not a citation. Give page, plate, inscription line, or section.
- `summary` is for a 10-year-old: two short sentences, no jargon, Flesch-Kincaid grade 7 or lower.
- `caveats` holds the scholarly hedges: disputed identifications, dating debates, alternative readings.
- `coordinates` come from a published gazetteer or site report, and `coordinate_source` names it. Never estimate from a modern map without saying so in `caveats`.
- `status` is always `draft` when you create an entry. Only a human moves it forward.

Worked examples of accepted and rejected entries: `${CLAUDE_SKILL_DIR}/examples.md`.

## 5. Web research protocol

You may search and fetch to locate page numbers, editions and corroboration.
- Prefer: publisher pages, JSTOR/DOI landing pages, archive.org scans of public-domain works, ASI and state government PDFs, university repositories.
- Use Wikipedia and similar only to find the *underlying* citation, then verify that citation exists.
- Record what you actually saw. If you found the book listing but not the page, say `"note": "page not verified"` and keep the entry `draft`.
- Log each session's findings in `docs/research/<topic>.md`: what was checked, what was found, what remains open.

## 6. Inline citation format for prose

In `src/content/**/*.md`, every paragraph ends with `[Surname, Year, p.XX]`, where Surname and Year match an entry in `sources.json` (see `src/data/cite.ts` for the exact rendering). Multiple sources: `[Ray, 2003, p.112; Behera, 2000, p.45]`. Unsupported sentence: append `[NEEDS VERIFICATION]` and leave the file out of `published`.

## 7. Before you finish

Run `npm run validate:data` and paste its summary into your report. Zero errors is required; draft warnings are expected and should be listed so a human can review them.
