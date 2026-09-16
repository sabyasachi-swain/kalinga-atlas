# Routes expansion, 16 September 2026

## Scope

Expand `src/data/routes.json` beyond the 12 published entries, spreading new
entries across periods rather than clustering in the colonial centuries. This
session restarted after an earlier run was killed mid-task with no surviving
output; per the coordinator's revised method, entries were written to disk in
two batches with `npm run validate:data` run after each.

## What was read first

- `CLAUDE.md`, `.claude/rules/data.md`, `src/data/schema.ts`, `scripts/validate-data.ts`.
- The full existing `src/data/routes.json` (12 entries), `ports.json`,
  `sites.json`, `sources.json`, `periods.json`, `goods.json`, `inscriptions.json`.
- The `historical-sourcing` skill's `registry.md` and `examples.md`.
- `docs/research/flagged-sources.md` and `docs/research/README.md` for
  established conventions on flagging new sources.

## Key discovery: new ports already open several endpoints

A parallel ports-researcher session had added 12 new port entries since this
task was last scoped, several already `published`: `false-point`, `dhamra`,
`sonapur`, `barua`, `balugaon` on the Odisha/Andhra coast, and `mahatittha`
(Mantai, Sri Lanka), `maliwan` (Myanmar, draft), `palembang`, `kedah`,
`alagankulam`, `nagapattinam` and `guangzhou` further afield. Their full JSON
(coordinates, source_refs, caveats) was dumped and read in full before any
route was drafted, so every new route reuses citations already vetted by that
session — no new source text needed to be read or added.

Two finds there were unusually valuable:

- `mahatittha`'s source_refs quote Dayalan 2019 (offprint p. 24) paraphrasing
  the 5th-century *Samantapasadika* (Buddhaghosa's commentary): "ships often
  travelling between Tamralipti and Mahatittha." This is a **Gupta-period**
  sea-route attestation, the only one found this session, closing a gap where
  the atlas previously had zero Gupta routes.
- `palembang`/`kedah`/`guangzhou` all quote the same passage of Dayalan 2019
  (p. 27, paraphrasing Chavannes's 1894 translation of Yijing): Guangzhou →
  Fo-che (Palembang) → Mo-lo-yu → Sumatra → Kie-tcha (Kedah) → Nicobar Islands
  → Tamralipti, retraced on the return leg. This gave three **post-gupta**
  maritime legs from one directly quoted itinerary.

## New routes added (15), by period

| id | mode | periods | tier | distinct sources |
|---|---|---|---|---|
| `route-dhauli-jaugada-road` | land | mauryan | Probable | 2 |
| `route-udayagiri-khandagiri-pithunda-road` | land | kharavela | Probable | 3 |
| `route-sisupalgarh-manikapatna-road` | land | kharavela, early-historic | Probable | 2 |
| `route-palur-sonapur-coast` | coastal | early-historic | Probable | 1 |
| `route-sonapur-barua-coast` | coastal | early-historic | Probable | 1 |
| `route-barua-kalingapatnam-coast` | coastal | early-historic | Probable | 1 |
| `route-dhamra-chandbali-river` | river | british | Strongly Supported | 2 |
| `route-cuttack-false-point-canal` | river | british | Strongly Supported | 2 |
| `route-balugaon-puri-chilika` | river | british | Probable | 1 |
| `route-manikapatna-khalkatapatna-coast` | coastal | somavamshi, eastern-ganga | Probable | 2 |
| `route-pipli-balasore-coast` | coastal | mughal-maratha | Strongly Supported | 2 |
| `route-tamralipti-mahatittha-sea` | maritime | **gupta** | Probable | 1 |
| `route-guangzhou-palembang-sea` | maritime | post-gupta | Probable | 1 |
| `route-palembang-kedah-sea` | maritime | post-gupta | Probable | 1 |
| `route-kedah-tamralipti-sea` | maritime | post-gupta | Probable | 1 |

Every new source_id used (`ashoka-separate-edicts`, `kulke-rothermund`,
`hathigumpha-inscription`, `patra-patra-ohrj-maritime-archaeology`,
`patra-2014-odisha-review-ports`, `hunter-1872`, `district-gazetteers-odisha`,
`imperial-gazetteer-orissa`, `patnaik-2014-odisha-review`,
`dayalan-2019-acta-via-serica`) was **already present in `src/data/sources.json`**
with `approved_by_human: true`. **No new source objects were needed this
session, so `docs/research/new-sources-routes.json` was not created and
`docs/research/flagged-sources.md` needed no new line.**

## Tier reasoning worth flagging for review

- All three inland/land entries (`dhauli-jaugada`, `udayagiri-khandagiri-pithunda`,
  `sisupalgarh-manikapatna`) rest on primary or secondary sources that establish
  *relatedness* (shared administration, an inscription's own military claim,
  shared pottery) rather than a stated road or journey. Following the precedent
  already set by the published `route-manikapatna-tamralipti-coast` (3 sources,
  still `Probable`), these stay `Probable` even where 2-3 sources are cited,
  because the specific claim — that a route existed — is inferred, not
  reported.
- `route-dhamra-chandbali-river`, `route-cuttack-false-point-canal` and
  `route-pipli-balasore-coast` were set `Strongly Supported` because, unlike
  the inferred routes above, the sources directly state the trade
  relationship or connection itself (a named canal link; an explicit
  "absorbed the trade of"; a documented factory relocation) — the same
  standard already used for the published `route-cuttack-chandbali-canal`.
- The three Yijing legs and the Tamralipti-Mahatittha leg are capped at
  `Probable` because only one source (Dayalan 2019) was read, and it is
  itself a paraphrase of a secondary translation (Chavannes 1894 for Yijing;
  an unnamed secondary chain for the Samantapasadika), not an independent
  primary reading. This is stated in each `caveats` field.

## Routes considered and rejected or blocked

- **Cuttack/coastal Odisha to Sambalpur** (Mahanadi salt and grain route) —
  well documented by three sources (`stirling-1825` p. 194, `hunter-1872`
  vol. ii App. III p. 74, `imperial-gazetteer-orissa` vol. XXII pp. 12-13, all
  already cited for the `salt`/`iron`/`rice` good entries) but **blocked**:
  no `sambalpur` port or site entity exists in `ports.json` or `sites.json`.
  This would likely reach `Strongly Supported` (mughal-maratha/british) if a
  Sambalpur site were added — flagged for the ports/sites researcher.
- **Kalinga to Ujjayini and Takshashila** — the Dhauli Separate Rock Edict
  itself states inspecting Mahamatras rotated from Ujjayini and Takshashila
  (per the existing `dhauli-separate-rock-edicts` inscription entry's
  trade_relevance). A genuine Mauryan-period overland route, but **blocked**:
  neither Ujjayini nor Takshashila exists as a port or site entity.
- **Balasore/Chandbali to the Maldive Islands** (cowrie-shell trade;
  `stirling-1825` p. 194, `hunter-1872` vol. ii p. 167) and **to Arakan**
  (`district-gazetteers-odisha`, Balasore 1907 p. 144) — both **blocked**: no
  Maldives or Arakan port entity exists, and the Balasore gazetteer itself
  distinguishes Arakan from Rangoon, so Rangoon cannot stand in for it.
- **Palur to Maliwan (Myanmar)** — considered, then dropped: Maliwan's
  radiocarbon dates are 4th-2nd century BCE (mauryan/kharavela), but the only
  attested reason to link Palur to Southeast Asia is Ptolemy's 2nd-century-CE
  apheterion (early-historic), a period mismatch. Forcing the two together
  would have meant tagging a period neither source actually supports.
- **Sonapur/Barua/Palur to Arikamedu or Kaveripattinam directly** — not
  added; the existing `route-manikapatna-arikamedu-coast` already covers this
  network-style inference, and adding near-duplicate legs from every Ganjam
  port risked padding rather than adding information.
- A **Radhanagar-to-coast** river route (Radhanagar sits "30 km from the
  present shore" on the Kelua river, per `patnaik-2014-radhanagar` p. 88) was
  considered but not written: no source names which coastal port the Kelua
  actually reaches, and guessing the nearest one would have been invention.

## OpenRouter usage

- Checked `pick_model` for `draft_prose`: free candidate
  `dots-studio/dots-3-note-preview:free` (AtlasCloud), then paid
  `qwen/qwen3.8-flash` and `deepseek/deepseek-v4.1-flash`.
- Called the free model twice, to draft a `summary`/`kid_line` pair each for
  `route-tamralipti-mahatittha-sea` and
  `route-udayagiri-khandagiri-pithunda-road`, giving it only the already-
  sourced note text and instructing it not to add facts. Cost: $0.000000
  (free tier) for both calls, ~4 s total latency.
- **Both outputs were checked and rejected.** The model's summaries restated
  the underlying site/inscription facts accurately but dropped the
  route-specific framing (that people or ships actually travelled between the
  two named places), which is the entire point of a `route` entity's summary.
  The original Claude-authored summaries were kept unchanged.
- No `extract_claims` call was made: this session fetched no new long raw
  source document. Every citation was copied, page and quote intact, from
  material the parallel ports-researcher session had already extracted and
  had itself vetted into `ports.json`. Re-running extraction on text I had
  not fetched myself would not have added a check; it would have been
  redundant.

## Validator output

Run after batch 1 (7 entries):
```
Kalinga Atlas data validation
  sources: 44  periods: 11
  ports:         31 (draft 2, reviewed 0, published 29)
  routes:        19 (draft 7, reviewed 0, published 12)
  ...
OK: data valid
```

Run after batch 2 (8 more entries, 15 total new):
```
Kalinga Atlas data validation
  sources: 44  periods: 11
  ports:         31 (draft 2, reviewed 0, published 29)
  routes:        27 (draft 15, reviewed 0, published 12)
  goods:         26 (draft 13, reviewed 0, published 13)
  sites:         7 (draft 0, reviewed 0, published 7)
  inscriptions:  5 (draft 0, reviewed 0, published 5)
  facts:         14 (draft 0, reviewed 0, published 14)
OK: data valid
```

Zero errors, zero warnings, in both runs.

## Open questions for the human reviewer

1. Should `sambalpur` be added as a site so the well-documented Mahanadi
   salt/grain river route can be entered? Three sources are already in hand.
2. Should `ujjayini` and `takshashila` (or a single stand-in "north India"
   destination) be added as sites, given the Dhauli edict itself names them?
3. `route-manikapatna-khalkatapatna-coast` tags `somavamshi` because that is
   Khalkatapatna's own period list in `sites.json`... — actually `khalkatapatna`
   is a **port**, not a site, but the same reasoning applies: its own period
   tags include `somavamshi`, even though the Chinese-ceramic dating most
   sources give (12th-14th century CE) sits mostly in `eastern-ganga`/early
   `gajapati`. Left as `somavamshi, eastern-ganga` to match the port's own
   tags rather than narrowing it myself; a reviewer may prefer to drop
   `somavamshi`.
4. Three of the new inland/land routes (`dhauli-jaugada`,
   `udayagiri-khandagiri-pithunda`, `sisupalgarh-manikapatna`) are held at
   `Probable` despite 2-3 sources each, because no source states an actual
   road or journey. A reviewer who is comfortable treating "these were the
   two administrative or cultural centres of one Mauryan/Kharavela-era
   network" as sufficient for `Strongly Supported` could reasonably upgrade
   them; I judged that the existing precedent (`route-manikapatna-tamralipti-coast`)
   argued for the more conservative reading.
