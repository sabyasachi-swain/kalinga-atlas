# Inscriptions, and the period ranges — research note

Session date: 2026-09-14 · Agent: `researcher` · Scope: (A) populate `src/data/inscriptions.json`;
(B) confirm the eleven ranges in `src/data/periods.json`.

Everything below records what I actually opened. Where I could not open a page I say so and the
phrase **page not verified** appears in the data as well.

---

## A. Inscriptions — outcome

Five entries created in `src/data/inscriptions.json`, all `status: "draft"`.

| id | tier | evidence_type | distinct sources in `source_refs` |
|---|---|---|---|
| `hathigumpha-kharavela` | Probable | archaeological | 2 |
| `dhauli-separate-rock-edicts` | Strongly Supported | archaeological | 3 |
| `jaugada-separate-rock-edicts` | Strongly Supported | archaeological | 2 |
| `nagarjunakonda-bodhisiri-inscription` | Strongly Supported | archaeological | 2 |
| `manikapatna-kharoshthi-potsherd` | Probable | archaeological | 1 |

The id `hathigumpha-inscription` is already taken by a **source** in `sources.json`, and H3 requires
ids to be unique across every file, so the inscription entry is `hathigumpha-kharavela`.

No `coordinates` are given for any of the five. None of the editions I read prints a latitude or
longitude, and the one set of figures I did find (OHRJ XLVII.2, p. 109, "Jaugada ... Lat. 10° 31′ N")
is plainly wrong — 10° 31′ N is in Tamil Nadu. Better no coordinate than a wrong one. `Inscription`
in `schema.ts` makes `coordinates` optional and has no `coordinate_source` field, so nothing breaks.

### Why Hathigumpha is only `Probable`

Two distinct editions were read in full, which would normally allow `Strongly Supported`. They
disagree on precisely the points that make the inscription interesting for trade, so the lower tier
applies:

- **Date.** Jayaswal & Banerji, *EI* XX p. 74: the script "cannot be earlier than the beginning of
  the 2nd century B.C. or later than that of the 1st century B.C."; p. 77: Kharavela "must have
  flourished in the first half of the 2nd century B.C." Sircar, *Select Inscriptions* I p. 213:
  "Brahmi of about the end of the 1st century B.C.", with a footnote arguing the record is later
  than the Nanaghat inscriptions and "certainly than the Besnagar inscription of Heliodoros", and
  that the letter forms "suggest a date not much earlier than the beginning of the 1st century A.D."
- **Pithumda.** Jayaswal & Banerji print `Pithuṃḍaṃ` in line 11 and gloss it at p. 78 as "Ptolemy's
  Pitundra, a city which no longer exists, but which was an important port even in the first
  century"; their note 34 (p. 85) adds "According to Ptolemy, a city in the upper part of the
  Coromandel coast." Sircar's text of the same line prints `pothaṃ`, and his note 1 on p. 217 gives
  Barua's completely different reading and translation ("caused the grassy overgrowth of Pithudaka
  (city), founded by a former king, to be let out in the Langala [river]").
- **The Greek king.** Sircar's note (facing p. 217, in the apparatus to lines 8–10) says the reading
  `Dimita` is "doubtful" and that even if correct it "cannot be identified with Demetrios (son of
  Euthydemos)". Jayaswal & Banerji (pp. 76–77) build a whole chronology on that identification.
- **Bahasatimita.** Jayaswal & Banerji, note 37 (p. 85): "The reading is absolutely certain," and
  they identify him with a contemporary of Pushyamitra. Sircar, p. 217 n. 6, calls the identification
  with Pushyamitra "fantastic".
- **Magadha vs Mathura.** Jayaswal & Banerji, note 36 (p. 85), record and reject F. W. Thomas's
  reading `Mathura` for `Magadham` in line 12.

The trade-bearing translations I relied on (*EI* XX, pp. 87–88, printed with long ellipses for the
lost text):

- L. 11 — "And the market-town (?) Pithumda … founded by the Ava King he ploughs down with a plough
  of asses; and (he) thoroughly breaks up the confederacy of the T[r]amira (Dramira) countries of one
  hundred and thirteen years, which has been a source of danger to (his) Country."
- L. 12 — "(he) causes to be brought home the riches of Amga and Magadha along with the keepers of
  the family jewels of …".
- L. 13 — "elephants, jewels and rubies as well as numerous pearls in hundreds (he) causes to be
  brought here from the Pandya King."
- L. 14 — "China clothes (silks) and white clothes" given to monks.
- L. 6 — the canal "excavated in the year one hundred-and-three of King Nanda" brought into the
  capital "from the road of Tanasuliya"; Jayaswal & Banerji, p. 78: "The Tanasuliya or Tanasuliya-vata
  cannot be identified by us."

### Why the two Ashokan entries are `Strongly Supported`

Hultzsch's 1925 edition is a full critical edition read directly, and two further distinct works
(Vogel in *EI* XX, and Patra & Patra in *OHRJ*) independently locate Tosali and Samapa in Kalinga.
The edicts' readings are not in dispute. Their trade content, however, is *indirect*, and the
entries say so: they are about the administration of justice, and their value to this atlas is that
they fix two Mauryan administrative towns on this coast and record officials touring in from
Ujjayini and Takshasila.

---

## What I searched, and what I actually opened

1. **Hultzsch, *Inscriptions of Asoka*, Corpus Inscriptionum Indicarum I, new edn (Oxford: Clarendon
   Press, 1925).** Downloaded the full searchable text of archive.org item
   `InscriptionsOfAsoka.NewEditionByE.Hultzsch`. Running headers carry page numbers, so page
   references below are read off the scan, not inferred.
   - pp. xiii–xiv — description of the Dhauli rock; Dhauli is "a village in the Khurda subdivision of
     the Purl district, Orissa, about seven miles south of Bhuvanesvar", the rock "on the south bank
     of the Dyah river"; the rock "omits edicts XI to XIII of the Girnar version, but compensates for
     them by two separate edicts"; Cunningham's demonstration that "first" and "second" are reversed.
   - pp. xiv–xv — the Jaugada rock: "a ruined fort in the Berhampur taluka of the Ganjam district,
     Madras, about eighteen miles north-west of Ganjam town, on the northern bank of the Rishikulya
     river"; three tablets, "about one-half" of the first and "about one-third" of the second lost to
     peeling.
   - pp. xxxvii–xxxviii — "At the beginning of the rock-edict XIII, Asoka informs us that, when he had
     been anointed eight years, he conquered the country of Kalinga on the eastern coast. To this
     province we have to allot Dhauli and Jaugada … The two separate edicts at Dhauli were addressed
     to the Mahamatras at Tosali, who were headed by a royal prince … The head-quarters of the
     district to which the modern Jaugada belonged was called Samapa, and the Jaugada rock had then
     the name Khepingala." Also pp. xxxvii–xxxviii on Ujjayini and Takshasila as provincial capitals,
     cited from Dhauli separate edict I, AA and BB.
   - Texts and translations: Dhauli rock pp. 84–100 (separate edict I, pp. 92–97; separate edict II,
     pp. 97–100); Jaugada rock pp. 101–118 (separate edict I, pp. 111–116; separate edict II,
     pp. 116–118). Translation of Jaugada separate edict II at pp. 117–118, section B: "The Mahamatras
     at Samapa have to be told (this) at the word of the king."
   - Dhauli separate edict I, translation p. 97, sections Z–CC: a Mahamatra sent out "every five
     years"; "from Ujjayini also the prince (governor) will send out for the same purpose a person of
     the same description, and he will not allow (more than) three years to pass"; "In the same way
     (an officer will be deputed) from Takshasila also."

2. **Epigraphia Indica XX (1929–30).** Three archive.org scans tried.
   - `epigraphia-indica` (`epigraphia-indica-vol-20`) — legible OCR but truncated: it contains only
     the front matter and Vogel's article up to about p. 20. Used for Vogel.
   - `epigraphiaindicavol20_588_y` — 1 MB of text, but OCR'd with a Devanagari model; the Latin text
     is unreadable garbage. Unusable. (Same failure mode the `manikapatna.md` note recorded for the
     IAR volumes.)
   - `in.ernet.dli.2015.56671` — legible OCR of the whole volume. Used for Jayaswal & Banerji.
   - Contents page confirms: No. 1, Vogel, "Prakrit Inscriptions from a Buddhist site at
     Nagarjunikonda", p. 1 (running to p. 37, since No. 2 begins at p. 37); No. 7, Jayaswal & Banerji,
     "The Hathigumpha Inscription of Kharavela", p. 71 (running to p. 89, since No. 8 begins at p. 89).
   - **Vogel, p. 7** — inscription F "dedicated to the fraternities of Ceylonese monks who had
     converted Kasmira (Kashmir), Gandhara, China, Chilata (=Skt. Kirata), Tosali, Avaramta (=Skt.
     Aparanta), Vamga (i.e., Bengal), Vanavasi (i.e., North Kanara), Yavana (?), Damila (?), ..luia and
     the Isle of Tambapamni (i.e., Ceylon)."
   - **Vogel, p. 8** — "It is very interesting to meet here with the name Tosali … Asoka's two separate
     Rock-Edicts of Dhauli are addressed to the Governor and the magistrates (Mahamatras) of Tosali.
     This enables us to locate Tosali in Kalinga." He then argues Tosali may connect with Ptolemy's
     Dosara and the Periplus's Dosarene against the usual derivation from Dasarna, and concludes of
     the damaged third name: "It is tempting to restore the name as Palura the town mentioned by
     Ptolemy and identified by Professor Sylvain Lévi with Dantapura."
   - **Vogel, p. 6** — "Dr. Bühler's assumption, based on palaeographical evidence, that
     Siri-Virapurisadata flourished in the third century of our era, may be accepted as probably
     correct."
   - **Vogel, p. 14** — physical description of inscription F: apsidal shrine No. II on the mound
     Naharallabodu, three long lines of 18 ft 4 in to 19 ft plus a short fourth line, "fairly well
     preserved", dated in the fourteenth year of King Mathariputa.
   - **Vogel, p. 1** — Nagarjunikonda "belongs to the Palnad taluk of the Guntur district of the
     Madras Presidency", overhanging the right bank of the Krishna.
   - I could **not** reach Vogel's transcript and translation of inscription F: that scan stops at
     about p. 20 of the article. Recorded in the entry's `caveats`.

3. **Sircar, *Select Inscriptions*, Vol. I, 2nd edn (University of Calcutta, 1965).** Four archive.org
   items checked; `selectinscriptionsvol1dcsircar_450_u` and the two `in.ernet.dli` copies are
   Devanagari-model OCR and unusable. `dli.calcutta.11040` (`cu_pub478`) is legible and was used.
   No. 91 runs pp. 213–221 (No. 92, Manchapuri, begins p. 221). Details quoted above.

4. **Patra & Patra, "Archaeology and the Maritime History of Ancient Orissa", *OHRJ* XLVII(2),
   pp. 107–118.** The Odisha government portal's TLS certificate has expired; fetched with
   certificate checking disabled and read the whole 12-page PDF.
   - p. 109 — "urban settlements like Tosali (Dhauli), Samapa (Jaugada) and others came into
     prominence"; Jaugada excavation finds and the (wrong) coordinates.
   - p. 110 — "strategically the location of Asokan Edicts on the coastal districts of Orissa
     established the maritime activities at least of two ports, i.e., Che-li-ta-lo/Manikpatna and
     Palur."
   - p. 112 — "The two lined Kharosthi inscription on a pot shred discovered from here has been
     deciphered as 'Dasatradeva' and 'Khida' of 2nd century A.D (by B.N Mukherjee). This infact, is
     the only instance of a Kharosthi inscription in the whole of Kalinga or even in eastern and
     southeastern India."
   - p. 113 — "The Hatigumpha inscription (cir. 1st century B.C) of Kharavela"; and the argument that
     the Jaugada edicts are "an indication of its association with the port of Palur". Also: "An
     inscription of the Bhaumakara period refers to an ocean related tax called Samudrakarabandha" —
     **no citation is given for this**; see open questions.
   - p. 118, n. 28 — the source of the Kharoshthi reading: "*Ibid*, p.486" (i.e. Pradhan, Mohanty &
     Mishra 2000) "; D Pradhan, 'Manikapatna, Ancient port city on Chilika,' in: N.P. Das (eds)
     Souvenir-Chilika Boita Bandana Utsav, 1991, p. 9."

5. **Searched for and did not use:** a Bhauma-Kara or Somavamshi copper-plate grant naming merchants,
   guilds or ports. The one lead — the *samudrakarabandha* tax at OHRJ p. 113 — carries no reference,
   and web results attributing it to the Neulpur grant of Subhakaradeva (*EI* XV, pp. 1–8, ed. R. D.
   Banerji) are unsourced summaries. I did not open *EI* XV and will not create an entry on a claim I
   cannot anchor to a page I have read. This stays an open question rather than a sixth entry.

---

## B. Period ranges — outcome

Edition used throughout: **Hermann Kulke and Dietmar Rothermund, *A History of India*, Third Edition,
Routledge, London and New York, 1998** (first published 1986; second edition 1990). Read from the
archive.org item `a-history-of-india_202106`, whose OCR preserves the printed page numbers, so every
page reference below was read off the page it names. Where Kulke & Rothermund are silent about
Odisha — the 1803 transfer, in particular — I used **W. W. Hunter, *Orissa* (Smith, Elder, 1872)**,
already a registry source, from the archive.org scans `orissa03huntgoog` (Vol. I) and
`in.ernet.dli.2015.43087` (Vol. II).

`Map 9, "Territorial Development of Orissa (c. 600–1400)"` is the single most useful item for this
scope. Its printed legend gives three dynastic brackets outright:

> Nuclear area and kingdom of Bhauma-Karas (736 AD – early 10th century AD)
> Nuclear area and kingdom of Somavamsha (early 10th century – 1112 AD)
> Nuclear area and kingdom of the Ganga dynasty (1112–1436 AD)

The maps are gathered in a plate section at the end of the volume and the plate pages are not legible
in the scan's OCR, so the map is cited by number and title (it is listed in the List of Maps, p. vii),
not by page.

### Changes made — three, all to end/start years, none to ids, order or labels

| period | field | from | to | why |
|---|---|---|---|---|
| `post-gupta` | `end_year` | 700 | **736** | Map 9 legend starts the Bhauma-Karas at 736 AD; p. 124 has the Shailodbhavas holding central Orissa through the 7th century and being dislodged "in the eighth century". Extended so the two periods still meet without a gap. |
| `bhauma-kara` | `start_year` | 700 | **736** | Same evidence, from the other side. |
| `somavamshi` | `end_year` | 1100 | **1112** | Map 9 legend ends the Somavamsha kingdom at 1112 AD; p. 171: Chodaganga "in c. 1112 conquered the fertile Mahanadi delta of central Orissa from the Somavamsha king". The pre-existing overlap with `eastern-ganga` (1078–) is untouched. |

Every other range was left exactly as it was, and each `note` in `periods.json` now says either
"confirmed" or exactly how the source differs and why I did not act on it.

### Ranges confirmed unchanged

- **`mauryan` (−300 … −185).** End year confirmed: p. 67, "The last ruler of the Maurya dynasty,
  Brihadratha, was assassinated by his general, Pushyamitra Shunga … in the year 185 BC." p. 61:
  "in 261 BC he conquered Kalinga", with Eggermont's reign dates 268–233 BC. Map 4 is titled "Maurya
  Empire under Ashoka (268–233 BC)". The start year −300 is the atlas's own opening bracket and is
  earlier than Chandragupta (c. 320 BC); it comes from no source and I left it alone.
- **`early-historic` (1 … 300).** Map 5 is titled "India c. 0–AD 300" — an exact match. Also p. 96
  (the Ikshvakus; the Nagarjunakonda inscription naming Toshali) and the Chronology, p. 354,
  "1st century — Intensive trade connections with the Roman empire".
- **`mughal-maratha` (1568 … 1803).** Hunter's Vol. II chapter VI is titled, in the Vol. I Contents,
  "Orissa under Foreign Governors, Mughul and Marhatta (1568–1803)", pp. 1–35 — the identical
  bracket. Its running heads mark the internal hinge: "Orissa a Mughul Province (1592–1751)"
  (pp. 22–23), "Orissa Ceded to Marhattas (1751)" (p. 30), "Marhatta Misrule (1751–1803)"
  (pp. 31–35). Corroborated by Kulke & Rothermund p. 173 ("Finally, in 1568, the Afghan sultan of
  Bengal swooped down upon Orissa") and p. 206 (Murshid Quli Khan "annexed Bihar and Orissa").
- **`british` (1803 … 1900).** Start year confirmed by Hunter Vol. II p. 36: "no sooner did the
  Province pass under British sway in 1803, than the materials, hitherto so abundant, suddenly
  cease"; and pp. 57–58, the storming of the Cuttack fort at 10 a.m. on 14 October 1803, "and the
  great Province of Orissa, with its 23,907 square miles and three million souls, passed under
  British Rule." The end year 1900 is the atlas's closing bracket, not a date from any source.

### Ranges left unchanged although a source differs — flagged for a human

- **`gupta` (300 … 600).** Kulke & Rothermund bracket the Gupta empire itself at **320–500**
  (Map 6, "The Gupta Empire (320–500)"; Chronology p. 354, "320 Chandragupta I establishes the Gupta
  dynasty"). Narrowing the atlas period to match would leave 500–600 with no period at all, which is
  worse than a loose label. Left at 300–600 with the difference recorded in the entry's `note`.
- **`kharavela` (−185 … −1).** p. 94: "It was initially assumed that both emerged soon after the
  decline of the Maurya empire around 185 BC, but more recent research seems to indicate that they
  arose only around the middle of the first century BC." Sircar (p. 213) agrees with the later date.
  The existing range follows the older view. I did not narrow it, because doing so would strand
  entries that other agents may already have tagged `kharavela` for 2nd-century-BCE material — the
  `manikapatna` port entry, for one, uses `kharavela` for a phase beginning in the 2nd century BCE.
- **`eastern-ganga` (1078 … 1434)** and **`gajapati` (1434 … 1541)**. Three published figures, all
  different, for the same two hinges:
  - Ganga start: **1078** (in `periods.json`, Chodaganga's accession) — I found no source for it.
    Kulke & Rothermund give **c. 1112** for the conquest of central Orissa (p. 171) and **1112** on
    Map 9.
  - Ganga end / Gajapati start: **1434** (in `periods.json`) vs **1435** in Kulke & Rothermund's text
    (p. 173, "the Suryavamsha dynasty in 1435") vs **1436** in their own Map 9 legend.
  - Gajapati end: **1541** (in `periods.json`) vs **1568** in Kulke & Rothermund p. 173 (the Afghan
    sultan of Bengal) vs **1532** in Hunter's chapter title, "Orissa under Native Rule (3101 B.C. to
    1532 A.D.)" (Vol. I, Contents; chapter at pp. 168–330).
  When the sources contradict each other and one of them contradicts itself, changing the data is
  guessing. Left unchanged, all three spreads recorded in the `note` fields.
- **`bhauma-kara` end (950).** Kulke & Rothermund say only "early 10th century" (Map 9) and "In the
  tenth century the Somavamshi kings of western Orissa conquered the coast" (p. 124). 950 is a
  rounding, not a sourced year; the `note` says so.

### Sources kept but not verified

`xuanzang-travels` (on `post-gupta`), `haque-1980` and `ray-bc-1981` (on `mughal-maratha`) and
`patra-1971` (on `british`) were in the seed data with "researcher to confirm page". I could not
reach any of them: Beal (1884) and Watters (1904–05) were not run down in this session, and the three
Punthi Pustak / Munshiram Manoharlal monographs have no scan I could open. Each now carries
`"page": "page not verified"` and a note saying why, rather than a fabricated page.

---

## Open questions for the human reviewer

1. **Merge the two new sources.** `docs/research/new-sources-inscriptions.json` holds
   `sircar-select-inscriptions-1` and `pradhan-mohanty-mishra-2000` as `Source` objects, written
   there rather than into `src/data/sources.json` because other agents were editing that file in
   parallel. Until they are merged, `npm run validate:data` emits `H6-source-resolves` **warnings**
   (not errors) for `hathigumpha-kharavela` and `manikapatna-kharoshthi-potsherd`.
2. **Get Pradhan, Mohanty & Mishra 2000, p. 486.** It is the primary publication of the Kharoshthi
   sherd and the only route to a first-hand reading. With it, `manikapatna-kharoshthi-potsherd` could
   move up a tier and the sherd's *language* could be stated instead of left open. The same volume
   (Basa & Mohanty, *Archaeology of Orissa*, Delhi, 2000) is the outstanding gap flagged in
   `manikapatna.md` too, so one library visit closes both.
3. **The Bhauma-Kara *samudrakarabandha*.** OHRJ XLVII(2), p. 113 asserts that "An inscription of the
   Bhaumakara period refers to an ocean related tax called Samudrakarabandha" and gives no reference.
   If that plate can be identified and its published edition found (the Neulpur grant of Subhakaradeva,
   *EI* XV, pp. 1–8, is the obvious first place to look, but I did not open it), it would be the best
   candidate for a sixth inscription entry — a directly sea-related fiscal term in a Kalinga grant.
4. **Which date for Kharavela?** The atlas's `kharavela` period, the `hathigumpha-kharavela` entry's
   `date_text` and any public copy must all tell the same story. My recommendation: say in public copy
   only "some time between about 200 and 1 BCE; scholars disagree", and keep the two editions' figures
   in Scholar mode.
5. **Pithumda must not become a port entry.** If anyone later proposes a `pithumda` port, note that
   the identification with Ptolemy's Pitundra is Jayaswal & Banerji's (p. 78), Sircar does not even
   read the word there, and the place "no longer exists". It belongs in `caveats`, not on the map.
6. **Vogel's transcript of inscription F.** A legible scan of *EI* XX pp. 20–37 would let someone
   check the country list against the Prakrit rather than against Vogel's English summary, and settle
   whether the ".. luia" aksharas can bear "Palura" at all.
7. **The Ganga/Gajapati hinge (see above)** needs one authoritative decision, ideally from a
   specialist work on Odisha rather than a general history of India.
8. **`eastern-ganga` start = 1078.** Someone put that year in; it is Chodaganga's accession in the
   standard dynastic lists, but no source in this project supports it yet.

---

## Validator output

`npm run validate:data`, run at the end of this session:

```
Kalinga Atlas data validation
  sources: 30  periods: 11
  ports:         1 (draft 1, reviewed 0, published 0)
  routes:        0 (draft 0, reviewed 0, published 0)
  goods:        13 (draft 13, reviewed 0, published 0)
  sites:         0 (draft 0, reviewed 0, published 0)
  inscriptions:  5 (draft 5, reviewed 0, published 0)
  facts:         0 (draft 0, reviewed 0, published 0)

WARNINGS (6) - drafts that cannot be published yet
  [H6-source-resolves] (6)
    goods.json > ivory: source_refs: source_id "patra-2014-odisha-review-ports" is not in sources.json
    goods.json > chinese-ceramics: source_refs: source_id "patra-2014-odisha-review-ports" is not in sources.json
    goods.json > roman-amphorae: source_refs: source_id "patra-2014-odisha-review-ports" is not in sources.json
    goods.json > diamonds: source_refs: source_id "mccrindle-ptolemy-1927" is not in sources.json
    inscriptions.json > hathigumpha-kharavela: source_refs: source_id "sircar-select-inscriptions-1" is not in sources.json
    inscriptions.json > manikapatna-kharoshthi-potsherd: edition_ref: source_id "pradhan-mohanty-mishra-2000" is not in sources.json

OK: data valid (6 draft warning(s))
```

**Zero errors.** The two `inscriptions.json` warnings are the expected ones: they clear as soon as
`docs/research/new-sources-inscriptions.json` is merged into `src/data/sources.json`. The four
`goods.json` warnings belong to another agent working in parallel and are not mine.

Note also: an earlier run of the validator, before I trimmed seven `note` fields, failed with
`String must contain at most 300 character(s)` — `SourceRef.note` is capped at 300 characters in
`schema.ts`. The full reasoning that had to come out of those notes is in this file instead.

One side effect worth recording: the six `H4-period-resolves` warnings that `ports.json > manikapatna`
was throwing (its `gupta`, `bhauma-kara`, `somavamshi`, `eastern-ganga`, `gajapati` and `british`
tags could not resolve) are gone. They were a symptom of `periods.json` failing schema validation
part-way through the file, not of anything wrong with that port entry.
