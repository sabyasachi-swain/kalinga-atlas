# Ports and sites — research note

Session date: 2026-09-14 · Agent: `researcher` · Scope: `src/data/ports.json` and `src/data/sites.json`

## Outcome

**19 ports** (12 on the Kalinga coast including the pre-existing `manikapatna`, 7 foreign
destinations) and **7 sites**, all `status: "draft"`. Seven new sources are defined in
`docs/research/new-sources-ports.json` and listed in `docs/research/flagged-sources.md`; an eighth
(`patra-2014-odisha-review-ports`) was already flagged by the goods session and is **not**
redefined here.

`npm run validate:data`: **0 errors, 68 draft warnings** — all warnings are `H6-source-resolves`
and `ref-coordinate-source` for the seven ids that are not yet merged into `src/data/sources.json`.

### Ports (`region: "kalinga"`)

| id | tier | distinct sources | note |
|---|---|---|---|
| `manikapatna` | Strongly Supported | 6 (was 4) | Existing entry **enriched**, not duplicated — see "Changes to manikapatna" below |
| `palur` | Strongly Supported | 3 | Ptolemy's Paloura and Dantapura recorded as *proposals* only |
| `khalkatapatna` | Strongly Supported | 4 | Excavation season disputed (1984-85 vs 1987) |
| `kalingapatnam` | Strongly Supported | 4 | Srikakulam district, Andhra Pradesh (north-Andhra Kalinga coast) |
| `pithunda` | Hypothetical | 3 | **Never located.** Coordinates are a region marker, not a site |
| `puri` | Probable | 3 | Sources contradict each other on whether Puri traded at all |
| `cuttack` | Strongly Supported | 3 | River and canal port, ~100 km inland |
| `balasore` | Strongly Supported | 4 | Founding date disputed (1633 vs 1642) |
| `pipli` | Strongly Supported | 3 | Site destroyed; two separate source disagreements |
| `hariharpur` | Probable | 2 | Hariharpur vs Harishpur may be two places |
| `chandbali` | Strongly Supported | 4 | A 19th-century creation |
| `gopalpur` | Strongly Supported | 3 | Colonial port firm; the Ptolemy link is conjecture |

### Ports (trading destinations, other regions)

| id | region | tier | distinct sources |
|---|---|---|---|
| `tamralipti` | bengal | Strongly Supported | 3 |
| `calcutta` | bengal | Strongly Supported | 3 |
| `arikamedu` | south-india | Probable | 2 |
| `kaveripattinam` | south-india | Probable | 3 |
| `anuradhapura` | sri-lanka | Probable | 3 |
| `sembiran` | southeast-asia | Probable | 2 |
| `rangoon` | southeast-asia | Probable | 2 |

### Sites

| id | tier | distinct sources | finds recorded |
|---|---|---|---|
| `sisupalgarh` | Strongly Supported | 2 | 5 |
| `jaugada` | Strongly Supported | 3 | 4 |
| `dhauli` | Strongly Supported | 3 | 2 |
| `udayagiri-khandagiri` | Strongly Supported | 3 | 3 |
| `ratnagiri-lalitgiri-udayagiri-buddhist-complex` | Strongly Supported | 3 | 4 |
| `radhanagar` | Strongly Supported | 2 | 5 |
| `golbai-sasan` | Strongly Supported | 2 | 3 |

Every `finds[]` entry carries its own `source_refs`, as required.

## What I searched

1. **Registry first.** `hunter-1872`, `stirling-1825`, `imperial-gazetteer-orissa`,
   `district-gazetteers-odisha` and `hathigumpha-inscription` were pursued as scans before any web
   source was considered.
2. **archive.org public-domain scans, downloaded and grepped in full:**
   - Hunter, *Orissa* (1872), vols 1 and 2 — `OrissaHunter1872`, both `_djvu.txt`.
   - O'Malley, *Bengal District Gazetteers: Balasore* (1907) — `PARI.bengal-district-gazetteers-balasore`.
   - O'Malley, *Bengal District Gazetteers: Puri* (1908) — `dli.ministry.07423` (`GR289_djvu.txt`).
   - *Imperial Gazetteer of India*, vols 6, 9, 11, 12, 14, 15, 20, 21 — `imperialgazetteeNNgreauoft`.
   - *Epigraphia Indica* vol. XX (1929-30) — `in.ernet.dli.2015.56671`.
   - *Asiatic Researches* vol. XV (1825, Stirling) — `asiaticresearche151825cal`. **Not usable.**
3. **Publisher / repository PDFs read in full:** *Odisha Review* Nov 2014 pp. 118-125 (Patra,
   ports), Nov 2014 pp. 107-113 (Pradhan, Viraja Kshetra), Dec 2014 pp. 88-98 (Patnaik,
   Radhanagar); OHRJ XLVII(2) pp. 107-118 (Patra & Patra); Dayalan 2019 offprint; Mohanty & Smith
   2009 (*Man and Environment*); Kingwell-Banham et al. 2018 (*Ancient Asia*); Ardika & Bellwood
   1991 (*Antiquity*).
4. **Coordinate hunt.** Every coordinate in these two files is traced to a printed figure except
   five that are explicitly flagged as approximations (see below).

## Scans that failed, and why

- **`stirling-1825`** — *Asiatic Researches* XV is on archive.org (`asiaticresearche151825cal`,
  `in.ernet.dli.2015.195559`), but the OCR of the copy I pulled is unusable noise. Stirling's
  account of Orissa Proper (pp. 163-338) therefore contributes **nothing** to these entries, even
  though it is the obvious source for early-19th-century Cuttack and the Odisha ports. Worth a
  second attempt against a legible scan or the Biodiversity Heritage Library item 133014.
- **`dli.ernet.243792`** (an alternative Puri gazetteer scan) — OCR was run with an Arabic-script
  model; the text is gibberish. The `dli.ministry.07423` copy was legible and was used instead.
- **`asi-annual-reports` (IAR)** — *not cited anywhere in this session.* Several of my sources cite
  IAR 1956-57 (Jaugada), IAR 1978-79 p. 53 (Kalingapatnam) and IAR 1985-86 p. 56 (Khalkatapatna),
  but I did not open any IAR volume, so the registry source is deliberately absent from every
  entry. The same decision the `manikapatna` note recorded.
- **`ashoka-separate-edicts`** — deliberately **not** cited on `dhauli` or `jaugada`. Hultzsch,
  *Corpus Inscriptionum Indicarum* I (1925) was not read, and the two gazetteers disagree about
  which edicts are present at Dhauli, so the primary edition must settle it first.

## Exact references, by claim

### Hathigumpha inscription — the Pithunda line (read directly)

Jayaswal & Banerji, "The Hathigumpha Inscription of Kharavela", *Epigraphia Indica* XX (1929-30),
No. 7, pp. 71-89.

- Translation, **p. 88, line 11**: "And the market-town (?) Pithumda founded by the Ava King he
  ploughs down with a plough of asses ; and (he) thoroughly breaks up the confederacy of the
  T[r]amira (Dramira) countries of one hundred and thirteen years".
- Editors' **note 34, p. 85**: "Pithumda. — According to Ptolemy, a city in the upper part of the
  Coromandal coast; This city has perhaps to be taken as the capital of the Ava or Avarni."
- **p. 85** also: "It is quite possible that the city of Pithumda mentioned by Ptolemy as Pitundra
  (*Ind. Ant.*, Vol. LV, p. 145), was founded by these people".
- Line 13 (translation p. 88) records "elephants, jewels and rubies as well as numerous pearls in
  hundreds (he) causes to be brought here from the Pandya King" — a trade-relevant line worth an
  `inscriptions.json` entry, but that file is out of scope for me.

### Hunter 1872, vol. ii — the English factories

- **p. 37**: "about 1514 A.D. pushed them northward to the mouth of the Subanrekhá in Orissa. Here
  they founded a fugitive colony at the town of Pippli, now a ruined and silt-locked village, about
  ten [miles] up the river, but then a fine harbour commanding a free approach from the sea."
- **p. 39**: "These two Orissa harbours — Pippli, founded in 1635, and Balasor, founded in 1642 —
  formed the basis of our future greatness in Bengal."
- **p. 40**: "the silting up of the Subanrekhá led to the transfer of the original factory at Pippli
  to the head establishment at Balasor"; "the Orissa factors bought up at the lowest prices for
  ready money the fine muslins of Cattack."
- **p. 196** (chronology, 1634): Azim Khan "restricted their vessels from entering any other port
  than Pippli, near Balasor, and the English established their first factory in Bengal at that
  place." **p. 197** (1688): Captain Heath attacks and plunders Balasore.
- **Appendix IV, pp. 107-108**: the Dhamra "was declared a port by Government Notification, No. 877,
  of the 18th May 1858 … As a port for native shippers, it ranks next to that of Balasor among the
  Orissa harbours." Hunter does not yet name Chandbali.

### O'Malley, *Balasore* (1907)

- **p. 8**: "In the year 1871 there were seven ports, Subarnarekha, Saratha, Chànuyà (Chhaunà),
  Balasore, Laichanpur, Churaman, and the Dhamra, including Chandbali."
- **p. 9**: the Portuguese established themselves at Pipli "at the close of the 16th century"; "By
  the beginning of the 18th century the silting up of its mouth had ruined Pipli, and the
  settlement was abandoned … no trace of it now remains."
- **p. 10**: "Chandbali, 20 miles from the mouth, is the most important port in Orissa."
- **p. 34**: Ralph Cartwright's licence; "They built a house of business at Hariharpur, on a channel
  half way down the delta". **p. 34 n.**: "Exhaustive enquiry renders it doubtful whether such a
  farman was ever issued; and whether any English factory was built at Pipli under its
  authorisation."
- **p. 35**: "on July 22, 1633, she anchored off the Mughal customs-station of Harishpur."
- **pp. 36-37**: the Portuguese "had effected a settlement at Pipli as early as 1[5]99, and that
  place was their chief port on the seaboard … a great slave market." The Dutch stepped into their
  place; the Danes came to Balasore about 1676 and the French about the same time.
- **p. 144**: "At the commencement of the 19th century Balasore was the only port of which Orissa
  could boast, and it was frequented chiefly by vessels from Madras … and by the Laccadive and
  Maldive islanders, from whom the cowries then used extensively for currency were obtained." Trade
  partners: "Calcutta, the coast ports from Bombay on the west to Arakan on the east, and foreign
  ports, such as the Maldive islands, Ceylon, and occasionally Mauritius."
- **p. 197**: Chandbali at 20° 47′ N, 86° 45′ E, 20 miles from the mouth of the Baitarani; founded
  by Captain McNeill with Commissioner Ravenshaw; leases to the India General Steam Navigation
  Company and McNeill & Co. in 1877.
- **p. 204**: "Pipli was once the most important port on the Orissa coast … The Portuguese settled
  there in 1599 … Bernier (1660) mentions it as the port from which he went in a seven-oared scallop
  to Ogouli (Hooghly) … in Hamilton's Hindostan (1820) it is said that they ship 9,000 tons of salt
  annually from the port … Wilson in the *Early Annals of the English in Bengal* says that 'the
  English never had any factory at Pipli except in the imagination of the historians.'"

### O'Malley, *Puri* (1908)

- **p. 15**: "The only port in the district is Puri, and this is nothing but an unprotected
  roadstead."
- **p. 28**: on Kalinga — "cloth was manufactured and exported in such quantities that Kalinga
  became the word for cloth in old Tamil; and frequent sea voyages were made to countries outside
  India, on account of which the Indians came to be called Klings in the Malay Peninsula." (Not used
  in a port entry; a good candidate for `goods` or `facts`.)
- **pp. 28-29**: Ashoka inscribed at Dhauli "rock-edicts I—X and XIII" plus the two Kalinga edicts.

### Imperial Gazetteer of India (printed pages verified in the scans)

| Place | Vol. | Page | Coordinate |
|---|---|---|---|
| Balasore Town | VI | 245-246 | 21° 30′ N, 86° 56′ E |
| Calingapatam | IX | 291-292 | 18° 20′ N, 84° 8′ E |
| Calcutta | IX | 260 | 22° 34′ N, 88° 22′ E |
| Cuttack City | XI | 98 (trade p. 92) | 20° 29′ N, 85° 52′ E |
| Dhauli | XI | 317-318 | 20° 15′ N, 85° 50′ E |
| Ganjam Town | XII | 158-159 | 19° 23′ N, 85° 5′ E |
| Gopalpur | XII | 329-330 | 19° 16′ N, 84° 53′ E |
| Jaugada | XIV | 72-73 | 19° 31′ N, 84° 50′ E |
| Kalinga (article) | XIV | 310 | — |
| Khandgiri | XV | 239-240 | 20° 16′ N, 85° 47′ E |
| Konarak | XV | 391-392 | 19° 53′ N, 86° 6′ E |
| Puri Town | XX | 411 | 19° 48′ N, 85° 49′ E |
| Rangoon City | XXI | 213-214 | 16° 46′ N, 96° 11′ E |

Two useful lines not yet used in an entry: IG XIV p. 310 on the Kalingas — "They appear to have
been adventurous traders by sea to different countries"; and IG XII p. 158-159, Ganjam Town "was
once a port, but this was closed in 1887 owing to the decay in its trade. It was reopened in 1893 …
but was closed again in 1897."

### Coordinates from the modern literature

| Place | Source | Figure |
|---|---|---|
| Manikapatna | Patra 2014 p. 120 | 19° 43′ 54″ N, 85° 33′ 14″ E (Dayalan: 19° 43′ N, 85° 34′ E) |
| Palur | Patra 2014 p. 121 / Dayalan | 19° 27′ N, 85° 11′ E |
| Khalkatapatna | Patra 2014 p. 119 / OHRJ p. 112 | 19° 51′ 13″ N, 86° 02′ 40″ E |
| Sisupalgarh | OHRJ p. 110 | 20° 13′ 30″ N, 85° 51′ 30″ E |
| Radhanagar (Kankia) | Patnaik Dec 2014 p. 88 | 20° 41′ N, 86° 11′ E |
| Ratnagiri | Pradhan 2014 p. 109 / OHRJ p. 111 | 20° 38′ N, 86° 20′ E |
| Lalitgiri | OHRJ p. 111 | 20° 35′ N, 86° 15′ E |
| Udayagiri (Jajpur) | OHRJ p. 111 | 20° 38′ 45″ N, 86° 16′ 25″ E |
| Tamralipti / Tamluk | Patra 2014 p. 119 / Dayalan | 22° 17′ N, 87° 57′ E |
| Arikamedu | Dayalan | 11° 53′ N, 79° 48′ E |
| Kaveripumpattinam | Dayalan | 10° 46′ N, 79° 51′ E |

### Five coordinates that are approximations (all stated in the entry's `caveats`)

1. `pithunda` — no site known; the dot marks the Chicacole/Srikakulam **region** named by Patra and
   Dayalan.
2. `pipli` — the gazetteer says "no trace of it now remains"; placed at the Subarnarekha mouth.
3. `hariharpur` — no printed coordinate found; placed in the delta near Jagatsinghpur.
4. `anuradhapura` and `sembiran` — no coordinate in the papers read; taken from a modern map,
   `coordinate_source: natural-earth`.
5. `golbai-sasan` — OHRJ p. 108 prints "Lat. 20° 01′ N. and Long. 88° 05′ E"; 88° 05′ E falls in the
   Bay of Bengal and is an obvious misprint, so only the latitude is used and the longitude is
   approximated.

## Changes to the pre-existing `manikapatna` entry

Kept and extended, not duplicated. Four changes, all documented in its `caveats`:

1. Two source_refs added: `patra-2014-odisha-review-ports` p. 120 and `dayalan-2019-acta-via-serica`
   offprint p. 23.
2. `coordinates` replaced, 19.68 / 85.47 → **19.7317 / 85.5539**, from the printed figure in Patra
   2014 p. 120 and corroborated to the arc-minute by Dayalan 2019. The previous entry's own note
   asked a reviewer to do exactly this.
3. `coordinate_source` changed from `tripati-2021-current-science` (which prints no coordinate) to
   `patra-2014-odisha-review-ports`.
4. `early-historic` added to `periods`. The manikapatna note flagged a gap at 1-300 CE — the period
   now exists, and it is where the Puri-Kushan coin and the Kharoshthi potsherd sit.

If another agent owns this entry, items 2-4 are the ones to review.

## Deliberate exclusions

- **Dosarene** — an unidentified region, not a port. Patra 2014 p. 122 canvasses three rival
  identifications (Toshali, a janapada with Palur as capital, the Chilika coast) and rejects all;
  Dayalan glosses "Dhamarra (Dosarene)" in passing. No entry, and Dayalan's gloss is contradicted in
  the `chandbali` caveats.
- **Dantapura** — no separate entry. Sylvain Levi's argument makes it the same place as Palur, so it
  is recorded in `palur.also_known_as` as a proposal, following the `manikapatna` / Che-li-ta-lo
  pattern already in the file. Creating a second dot would risk asserting two places where the
  sources describe one contested name.
- **Che-li-ta-lo** — no separate entry, for the same reason; already in `manikapatna.also_known_as`.
- **Konark** — the temple is documented (IG XV pp. 391-392) but nothing read describes a *port* at
  Konark. The Kushabhadra-mouth port the brief asked about is `khalkatapatna`, 11 km east of Konark.
- **Ganjam Town, Dhamra, Sonapur, Barua, False Point** — all documented in the sources above and all
  viable, but the brief capped the Kalinga list at 12. References are in this note if a reviewer
  wants them (Barua: Patra 2014 p. 121, 18° 51′ N, 84° 35′ E; Sonapur: Patra 2014 p. 122, 19° 6′ N,
  84° 47′ E; False Point: Hunter vol. ii pp. 193-194 and App. IV pp. 101-106, with nine years of
  tonnage figures).

## Open questions for the human reviewer

1. **Merge the source definitions.** Seven objects in `docs/research/new-sources-ports.json` need to
   go into `src/data/sources.json` before any of this can leave `draft`. 68 validator warnings
   disappear when they do.
2. **`imperial-gazetteer-india-1908` vs `imperial-gazetteer-orissa`.** I split them because the
   registry entry is titled "Orissa entries" and six of my citations are to Madras Presidency,
   Calcutta and Rangoon volumes. Widening the existing entry and dropping mine is a reasonable
   alternative — but then Jaugada, Gopalpur, Calingapatam, Calcutta and Rangoon are being cited to a
   source whose title says Orissa.
3. **Balasore's founding date.** Hunter 1872 p. 39 says 1642; IG VI p. 245 and the Balasore
   gazetteer pp. 34-35 say 1633 under Ralph Cartwright. Both are in the entry's caveats; a
   specialist should pick one.
4. **Did the English ever have a factory at Pipli?** Hunter says yes (1635, and the 1634 firman
   naming Pipli); the Balasore gazetteer reports Wilson's *Early Annals* saying the factory existed
   only "in the imagination of the historians", and doubts the firman itself. Unresolved.
5. **Hariharpur or Harishpur — one place or two?** The Balasore gazetteer uses both spellings two
   pages apart for what reads like one settlement, but Hunter vol. ii lists them as two separate
   fiscal divisions of Cuttack district. The Cuttack district gazetteer and the EIC factory records
   would settle it. Until then the entry is `Probable` with an unconfirmed location.
6. **Khalkatapatna's excavation season.** 1984-85 (Patra, Dayalan, both citing IAR 1985-86 p. 56) or
   1987 (Patnaik 2014 p. 105)? One IAR volume would decide it.
7. **Author overlap.** `patra-patra-ohrj-maritime-archaeology` and `patra-2014-odisha-review-ports`
   share an author (Benudhar Patra), and Dayalan 2019 cites the latter. Where an entry's tier rests
   on those three, the independence is weaker than the count of three suggests. `palur` and
   `khalkatapatna` are the cases to look at; both also have at least one genuinely independent
   source, which is why I let them stand at Strongly Supported.
8. **Dayalan's page numbers.** Cited as offprint pages plus section headings because the PDF carries
   no journal pagination. Someone with journal access should convert them to *Acta Via Serica* 4(1)
   pp. 25-69 numbering.
9. **Golbai Sasan predates every period in `periods.json`.** Its main occupation (Neolithic to
   Chalcolithic, c. 2300-800 BCE) falls entirely before `mauryan` (-300). I listed only the Iron Age
   upper levels, which Kingwell-Banham et al. bracket c. 2500-1500 BP. Either a pre-Mauryan period
   id is needed or the site should carry an explicit "outside the atlas timeline" flag. **This is a
   data-model question, not something to fix by stretching `mauryan`.**
10. **Sumatra and Burma are thin.** Java/Bali is covered by `sembiran`; Sumatra is not. The one
    Sumatra link found is the Sahassamalla-coin network reaching "Kotchina" (Kota Cina, north
    Sumatra) in Patra 2014 p. 120 and Dayalan p. 23 — too thin to place a dot on a map, so no entry
    was made. Burma is represented only by colonial-era `rangoon`; the ancient link is "Maratuan"
    brown glazed ware at Manikapatna, named after a place in Burma, which no source read here
    identified as Martaban.
11. **Sri Lanka needs a real port.** `anuradhapura` is an inland capital used as a route anchor. No
    source connecting **Mantai** to Kalinga was found; that is the entry a specialist should replace
    it with.
12. **Stirling 1825 is still unread** (see "Scans that failed"). It is the registry's obvious source
    for early-19th-century Cuttack, Balasore and the river ports, and none of these entries draws on
    it.
13. **Excavation reports still not read**, and named in the relevant caveats: B. B. Lal, *Ancient
    India* 5 (1949) for Sisupalgarh; B. K. Sinha, "Khalkattapatna: A Small Port on the Coast of
    Orissa", in Nayak & Ghosh (eds), *New Trends in Indian Art and Archaeology* II (1992), p. 428;
    B. K. Sinha, "Excavations at Golbai Sasan", *Puratattva* 23 (1992-93), p. 48; Debala Mitra's ASI
    reports on Ratnagiri (1958-61); the 2015 Radhanagar report; Hultzsch, *CII* I (1925) for the
    Ashokan edicts. Reading any of them could move an entry towards `Confirmed`.
14. **A Kharoshthi coincidence, deliberately not asserted.** Ardika & Bellwood report a Kharoshthi
    graffito at Sembiran (c. AD 1-200); OHRJ pp. 111-112 reports a Kharoshthi potsherd at
    Manikapatna, said to be the only one from Kalinga. No published work read here connects the two.
    It is noted in `sembiran.caveats` as a thing not to claim.
