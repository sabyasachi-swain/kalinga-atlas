# Ports expansion session — 2026-09-16

Scope: add well-sourced ports to `src/data/ports.json`, targeting 12-20 new entries,
without duplicating the 19 already present. This session's work survived two restarts
after Claude session limits (see status-log convention in this directory); entries were
written to disk in batches of 2-4 and validated after each batch, per the orchestrator's
instruction.

## What was added (12 entries, all `status: "draft"`)

| id | tier | distinct sources | region |
|---|---|---|---|
| `false-point` | Strongly Supported | 2 | kalinga (Odisha coast) |
| `dhamra` | Strongly Supported | 2 | kalinga |
| `sonapur` | Probable | 1 | kalinga |
| `barua` | Probable | 1 | kalinga (now Andhra Pradesh) |
| `balugaon` | Probable | 1 | kalinga (Chilika) |
| `mahatittha` (Mantai) | Strongly Supported | 2 | sri-lanka |
| `maliwan` | Strongly Supported | 2 | southeast-asia (Myanmar) |
| `palembang` (Fo-che) | Probable | 1 | southeast-asia |
| `kedah` (Kataha) | Probable | 1 | southeast-asia |
| `alagankulam` | Probable | 1 | south-india |
| `nagapattinam` | Probable | 1 | south-india |
| `guangzhou` | Probable | 1 | east-asia |

## What was searched and found

**False Point and Dhamra** (Odisha coast, colonial). Located and fetched the OCR text
of two archive.org scans already covered by the registry id `district-gazetteers-odisha`:
- `PARI.bihar-and-orissa-district-gazetteers-cuttack` (O'Malley & Cousins, Cuttack
  Gazetteer, 2nd edn, 1933) — pp. 7-8 describe False Point as an exposed, silting
  anchorage, name the Jambu river and Bakud creek as its inland channels, and describe
  the Dhamra estuary and its bar.
- `PARI.bengal-district-gazetteers-balasore` (O'Malley, Balasore Gazetteer, 1907) —
  p. 8 on the Dhamra estuary and its absorption by Chandbali.
Paired with the already-cited `imperial-gazetteer-orissa` (vol. XI) quote naming False
Point as one of Cuttack district's three chief trade centres, and the already-cited
`hunter-1872` quote on the 1858 notification declaring Dhamra a port (both quotes were
already in this file's `cuttack`/`chandbali` entries; reused here because they describe
Dhamra/False Point directly). No new sources needed for either entry.

The "Jamboo" name on the orchestrator's list turned out to be the Jambu river/channel
at False Point, not a separate settlement — folded into the `false-point` entry rather
than given its own id. "Kujang" was searched for in the same Cuttack gazetteer text and
not found; not added.

**Sonapur and Barua** (Ganjam coast). Both came from a single already-registered
source, Patra's "Ports in Ancient Odisha" (`patra-2014-odisha-review-ports`), fetched
directly via `curl -k` (its TLS cert is expired, as already noted in the registry) and
converted with `pdftotext -layout`. The article gives explicit lat/long for both and
ties Barua to Ptolemy; Sonapur is Patra's name for the Bahuda-river-mouth port the
orchestrator's brief flagged separately as "Bahuda-mouth" — one port, not two. Both
capped at Probable: only one source was read for each, and Sonapur has no textual/
inscriptional date given by Patra (unlike Barua's Ptolemy tie).

**Balugaon** (Chilika). The orchestrator's brief suggested Barkul and Rambha. The 1929
Puri District Gazetteer (`PARI.bihar-and-orissa-district-gazetteers-puri`, under the
registered id `district-gazetteers-odisha`) describes Barkul only as a scenic bungalow
spot, but documents Balugaon as the Chilika lake's actual trade point: the District
Fishery Office was moved there, it is named for its fish-and-grain export traffic, and
it is a named goods/passenger station on the Bengal-Nagpur Railway. Balugaon was used
instead of Barkul/Rambha for that reason.

**Ganjam Town** was searched for at length (Imperial Gazetteer 1907-09 new edition,
several archive.org identifiers; Madras District Gazetteers Ganjam Vol. I) and not
found in a form I could read directly — Vol. II of the Madras District Gazetteer
Ganjam (`in.ernet.dli.2015.177460`) is a statistics-only appendix with no narrative,
and I could not locate the narrative Vol. I online in this session. Population figures
for "Ganjam" town were seen in that Vol. II table but without a usable page marker, so
nothing was written. **Open for a future session**: Vol. I of the Madras District
Gazetteer for Ganjam, or the Ganjam volume of the Odisha District Gazetteers series
(Behuria, ed.), would likely give the 1768 factory/fort and 1815 epidemic story a
citable page.

**Mahatittha (Mantai), Maliwan, Palembang, Kedah, Alagankulam, Nagapattinam,
Guangzhou.** Fetched and read in full (via `curl` + `pdftotext`, since WebFetch could
not parse the encoded PDF or hit a TLS error) the already-registered offprint of
Dayalan 2019 (`dayalan-2019-acta-via-serica`), which turned out to cover many more
ports than the seven already cited in this file. Page numbers for that source are
given as "offprint p. N" using the PDF's form-feed count, since the offprint carries no
printed pagination (as already noted in the registry entry).

Two entries were strengthened to a second, independent, primary source found and
fetched directly:
- **Maliwan**: Bellina et al., "Myanmar's earliest Maritime Silk Road port-settlements
  revealed," *Antiquity* 92(366), e6 (2018) — an open-access Project Gallery report by
  the excavators themselves. Full text fetched and read.
- **Mahatittha**: Kingwell-Banham et al., "Spice and rice ... at the ancient port of
  Mantai, Sri Lanka," *Antiquity* 92(366) (2018): 1552-1570 — a peer-reviewed
  excavation/archaeobotany report. Full text fetched and read. (Same first author as
  the already-registered `kingwell-banham-2018-ancient-asia`, but a different paper in
  a different journal, so it needed its own id.)

Both new sources are in `docs/research/new-sources-ports.json`, flagged in
`docs/research/flagged-sources.md`, `approved_by_human: false`.

Palembang, Kedah, Guangzhou and Alagankulam/Nagapattinam rest on Dayalan alone
(Probable): Yijing's route (Fo-che/Palembang, Kie-tcha/Kedah, Guang-Zhou) is Dayalan's
paraphrase of Chavannes's 1894 French translation, not independently checked; the
Nagapattinam Leyden-plate epigraphy is likewise known only through Dayalan's summary of
*Epigraphia Indica* XXII (1933-34), not a direct reading of that edition.

## OpenRouter use

None of this session's extraction needed an external model: the source texts were
short enough (gazetteer excerpts a few hundred lines, the two Antiquity papers 1-19
pages) to read directly and quote by hand with page/offprint markers, which also let
every quote be checked against the fetched text before use. No `summary` sentences
were drafted externally either — each was written directly against its entry's
sourced facts and is short enough not to need a second pass. No OpenRouter spend this
session.

## Rejected or left open

- **Ganjam Town** (old Madras-Presidency port, 1768 factory, 1815 epidemic): found in
  web-search snippets only, not in a primary text I could read and quote directly in
  this session. Left out rather than cited on unverified snippets.
- **Kujang**, **Barkul**, **Rambha** as separate port entries: searched for in the
  Cuttack and Puri gazetteers; Kujang was not found at all, and Barkul/Rambha are
  documented only as scenic bungalow spots, not trade points (Balugaon was used
  instead — see above).
- **Kotchina** (Sumatra), named in the existing `manikapatna` entry's Sahasamalla-coin
  network but never itself identified or given a coordinate in anything read across
  this or the earlier session: left unadded rather than guessed.
- Further Chinese ports beyond Guangzhou, and Javanese ports specifically (as opposed
  to Sumatra/Malaya), were not found named with any specificity in the sources read
  this session.

## Validator

Final run: `sources: 42  periods: 11`, `ports: 31 (draft 12, reviewed 0, published
19)`, all other files unchanged. Two expected `H6-source-resolves` warnings for
`mahatittha` and `maliwan` (the two new source ids live in
`docs/research/new-sources-ports.json`, not yet merged into `src/data/sources.json`).
`OK: data valid (2 draft warning(s))`.
