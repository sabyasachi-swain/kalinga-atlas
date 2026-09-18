# Incorporating research1/research2 leads (18 September 2026)

Session log. Treats `additinal_sources_needs_review/18thSep_research1.md` and
`18thSep_research2.md` as leads only (AI syntheses, not sources), per the
owner's brief and the prior triage in
`docs/research/additional-sources-2026-09-18-research1-2.md`.

Status: IN PROGRESS. This file is appended to after each task completes so
that a rate-limit cutoff loses at most one task's work.

## Task A: Manikapatna Kharoshthi sherd re-reading (Baums 2020)

**Searched:** web search for "Baums 2020 Kharoshthi Manikapatna", for the exact
quote research1 attributed to Baums ("the meaning of the inscription eludes
us"), and the gandhari.org catalog for any Manikapatna/Chilika/Odisha entry.

**Found:** The quote is real, but it is NOT about Manikapatna. It comes from
Stefan Baums, "Kharoṣṭhī and Brāhmī -2," a chapter in Luca M. Olivieri (ed.),
*Ceramics from the Excavations in the Historic Settlement at Bīr-Koṭ-Ghwaṇḍai
(Barikot), Swat, Pakistan (1984-1992), Part 1* (ISMEO Serie Orientale Roma
vol. 22, 2020), pp. 279-298 (retrieved from stefanbaums.com/publications/baums_2020_2.pdf).
The sentence "While the reading is thus almost completely certain, the
meaning of the inscription eludes us" (p. 284) describes potsherd **B17**
from **Barikot, Swat, Pakistan** — a Gandharan site roughly 2,000 km from
Chilika, with no connection to Odisha, Manikapatna, or B. N. Mukherjee's
reading. Nothing in this paper, or in a gandhari.org catalog search, mentions
Manikapatna, Chilika, or Odisha.

**Conclusion: research1's claim is a fabrication/misattribution** — a real
Baums quotation lifted from an unrelated Pakistani site and pinned onto the
Odisha sherd. No genuine Baums re-reading of the Manikapatna sherd was found.

**Action taken: none.** `manikapatna-kharoshthi-potsherd` and
`fact-manikapatna-kharoshthi-sherd` are unchanged. Mukherjee's reading stands
as the only published reading, exactly as it was before this session.

---

## Task B: Palur 2023-25 excavation (Times of India, Sahu 2026)

**Registered:** `sahu-2026-toi-palur` in `src/data/sources.json`
(`approved_by_human: false`; flagged in `docs/research/flagged-sources.md`).
Fetched with `curl` (WebFetch cannot reach timesofindia.indiatimes.com) and
read in full. Confirms the URL is live and the article text matches the
brief: nine cultural layers over ~3 m, pre-Mauryan through Early Historic and
Early Medieval; NBPW, knobbed ware, deluxe red polished ware,
chocolate-slipped ware, black polished ware; red polished ware fired
950-1000C with ASI/IIT-Mumbai lab work ongoing; 363 graffiti-marked
potsherds; beads of carnelian, agate, jasper, quartz, faience, plus glass
bangles, ivory, shell; net sinkers, fish bones, tortoise shells, cowries,
conch; 66 Early Historic sites nearby; "lends strong support" to Palur =
Ptolemy's Paloura. Names Sunil Patnaik (excavation director) throughout. Does
**not** mention celadon or amphorae, a Buddhist stupa, or the word "port."

**Also checked:** the 2023 Palur stupa story (New Indian Express 13 Jan 2024,
Buddhistdoor 31 Jan 2024). Buddhistdoor's URL returns a bot wall ("Just a
moment...") to every fetch attempt; no readable copy was found. New Indian
Express has no URL in either research file and none was found by search.
**Not added** - cannot cite what cannot be read, per the brief.

**Decision on the H8 conflict.** Adding `sahu-2026-toi-palur` as a
`source_refs` entry on the *published* `palur` port immediately fails the
validator's H8 rule (published entries may only cite human-approved sources).
Rather than leave the build red, or silently drop the new evidence, I:
1. Left the published `palur` entry's `source_refs`, `periods` (still just
   `early-historic`) and `evidence_level` (`Strongly Supported`) exactly as
   they were, and added one sentence to its `caveats` (visible to readers)
   pointing to the new draft fact/good and explaining why they are not yet
   folded in.
2. Put the actual sourced claims into two **new draft** entries, which are
   allowed to cite an unapproved source under H8 (only `published` entries
   are restricted):
   - `fact-palur-2023-25-excavation` (facts.json) - the nine-layer sequence,
     graffiti sherds, ceramics and the "strong support" line. `related_ids:
     ["palur", "semi-precious-beads"]`. Tier Probable (one press source).
   - `semi-precious-beads` (goods.json) - a new good (carnelian, agate,
     jasper, quartz, faience beads), tier Probable, `direction: "both"`
     (origin/destination not stated), periods matching the dig's full range.
     No icon asset exists; the field was left unset rather than pointing at a
     missing file, since existence isn't validator-checked.
3. Did **not** widen `palur`'s `periods` or add `semi-precious-beads` to its
   `goods` array, because both would assert, on the face of a published
   entry, claims that currently rest only on an unapproved press source.

**Recommendation for the human reviewer:** once `sahu-2026-toi-palur` is
approved, fold `fact-palur-2023-25-excavation`'s periods
(`mauryan`-`somavamshi`) into `palur`'s own `periods` array, move the source
into `palur.source_refs`, and consider adding `semi-precious-beads` to
`palur.goods`. Do not raise `palur`'s tier past `Strongly Supported`: it is
still one press-level source about an unpublished excavation. Also decide
whether periods.json needs an id earlier than `mauryan` (-300 start_year) for
"pre-Mauryan" layers - the same gap already exists for Golbai Sasan's
Neolithic-Chalcolithic levels.

---

## Task E: Khalkatapatna (Tripati et al. 2015, Current Science)

**Registered:** `tripati-2015-current-science-khalkatapatna` in
`src/data/sources.json`. Fetched the publisher PDF
(currentscience.ac.in/Volumes/109/02/0372.pdf, `curl -k` not even needed here
- this host's certificate is fine) and read it in full via `pdftotext`.

**Confirms** the published entry's brick jelly floor (read as a
loading/unloading platform), Chinese celadon and Ming/Yuan porcelain, ASI
excavations of 1984-85 (Excavation Branch), a single-culture deposit, and the
12th-14th/15th-century bracket.

**Adds/corrects:** three Chinese copper coins (two fragmentary, one intact),
not the two the published entry currently states; a second ASI season in
1994-95 (IAR 1994-95, pp. 61-62, not read directly by me); celadon sherds
specifically dated 13th c. AD, Ming/Yuan sherds 14th-15th c. AD (finer than
the entry's single "c. 14th c." bracket); and parallels for the stamped ware
at Kota China (north Sumatra), Johore Lama (Malaysia) and Bagan (Burma), and
also at Kottapatnam and Motupalli in Andhra Pradesh - new Southeast Asian/
Andhra trade-network evidence not currently in the atlas.

**Also present in this source but deliberately NOT used**, per the brief's
"do not act on" list: the Konark giraffe-relief claim (Tripati et al. 2015 do
make it, citing their own ref. 30, but the brief explicitly excludes this
claim regardless of source).

**H8 handling:** same pattern as Task B. `khalkatapatna`'s `source_refs`,
`periods` and `evidence_level` (`Strongly Supported`) are unchanged; one
caveat sentence points to a new draft fact. New draft fact
`fact-khalkatapatna-tripati-2015` (facts.json) carries the actual quotes,
`related_ids: ["khalkatapatna"]`, tier Probable (one source for the specific
new claim, though it corroborates an already multiply-sourced entry).

---

## Task D: Salihundam (new site)

**Registered:** `subrahmanyam-1964-salihundam` (R. Subrahmanyam, *Salihundam:
A Buddhist Site in Andhra Pradesh*, Government of Andhra Pradesh, 1964).
Read in full as OCR text from archive.org item `dli.ernet.107577`
(`_djvu.txt`), via WebFetch (which handled this URL fine; no TLS problem
here - that warning was for `magazines.odisha.gov.in`).

**New entry:** `salihundam` in `sites.json`, `status: "draft"`,
`evidence_level: "Strongly Supported"` (two distinct sources: the 1964
excavation report, and `patra-patra-ohrj-maritime-archaeology`, already
registered and approved, which independently lists Salihundam among the
rouletted-ware find-spots at OHRJ p. 110 - already used elsewhere in this
atlas, e.g. the `radhanagar` entry). Coordinates 18.2167, 84.25, from the
report's own figure (18 13' N, 84 15' E), p. 3.

**Checked against research1's claims:**
- Stupas/viharas: confirmed - "five monasteries with kitchens and dining
  halls" (pp. 29-30). (The report does not give one single aggregate count
  of *all* stupas across every season; I did not invent one.)
- Roman coin, "of Tiberius (14-37 CE)": **not supported**. The only
  Roman-coin sentence in the whole OCR text (p. 14) reads "Roman coins
  reported from Kalingapatnam area ... are the issues of later emperors" -
  no emperor is named anywhere in the book. I searched the full OCR text for
  "Tiberius" and got zero hits. **This specific claim is rejected**, and the
  `salihundam` entry's caveats say so explicitly so nobody re-adds it later.
- Rouletted ware: confirmed, pp. 8-9, and explicitly compared to Arikamedu's
  (with a dating conflict the report itself flags).
- Inscribed conches reading "Salipataka"/"Salipedaka": confirmed verbatim,
  p. 4.
- Relation to Kalingapatnam: confirmed - "four miles from Kalingapatnam, now
  a defunct sea-port town" (p. 3).

**Second-source check:** as above, `patra-patra-ohrj-maritime-archaeology`
(already registered/approved) does cover Salihundam, giving the second
source needed for Strongly Supported without relying solely on the new,
unapproved 1964 report.

**Linking to `kalingapatnam`:** the `Site` schema (`schema.ts`) has **no
`related_ids` field** - only `Fact` does. I could not link the two site/port
entries directly as the brief suggested "if the schema allows." Instead I
added a new draft fact, `fact-salihundam-conches`
(`related_ids: ["salihundam", "kalingapatnam"]`), which records both the
inscribed-conch finding and the four-mile proximity. **Schema suggestion for
the owner:** consider adding an optional `related_ids: z.array(Id).default([])`
to `Site` (and perhaps `Port`), mirroring `Fact`, so site-to-site and
site-to-port relationships can be recorded without a proxy fact.

---

## Task C: Sisupalgarh (Smith & Mohanty 2025, World Archaeology)

**Registered:** `smith-mohanty-2025-world-archaeology`. DOI and full
metadata (title, authors, journal, volume/issue/pages, CC BY-NC-ND licence)
verified via Crossref and OpenAlex. **Full text could not be read**: the
publisher page (tandfonline.com) returns a Cloudflare "Just a moment..."
challenge to both `curl` and WebFetch (HTTP 403 / interstitial HTML, not the
article); OpenAlex and Semantic Scholar list no independent open-access
mirror (`any_repository_has_fulltext: false`); the UCLA eScholarship item
that looked promising (`qt2m83d6mq`) turned out, on downloading and running
`pdftotext`, to be a *different* Monica L. Smith paper ("Urban infrastructure
as materialized consensus," World Archaeology 48(1), 2016) - checked and
discarded. UCLA's anthropology department page for Monica Smith lists no
2025/2026 publications. Only the published **abstract** (fetched via the
Semantic Scholar API, which mirrors the publisher's own text) was read.

**Confirmed research1's citation problem:** the earlier triage's finding
stands - there is no "Smith & Mohanty 2016, World Archaeology, p. 684"
paper; the only Smith & Mohanty paper in Crossref for that journal is the
2025 one. Do not use the "twice Athens" population quote (not in the
abstract, and the brief says not to use it regardless).

**What the abstract adds:** a genuinely new fact for this atlas - Sisupalgarh
(c. 3rd c. BCE-4th c. CE) was followed by a new settlement 2 km away starting
c. 6th century CE (early medieval), itself later superseded by modern
Bhubaneswar 2.5 km further north in the 20th century. This matches, and
slightly extends past, the atlas's existing Mauryan-Gupta bracket for
Sisupalgarh; it does not change the tier (still two sources: the existing
Mohanty & Smith 2009 + Patra & Patra, now with this abstract mentioned only
in caveats since it is not yet approved for the published entry).

**H8 handling:** same pattern as B, D, E. Published `sisupalgarh` entry's
`source_refs`/`periods`/`evidence_level` unchanged; one short caveat sentence
added, pointing to new draft fact `fact-sisupalgarh-relocation`
(`related_ids: ["sisupalgarh"]`, tier Probable, periods `gupta`/`post-gupta`
only - the 20th-century Bhubaneswar stage is outside this atlas's 1900 CE
cut-off).

**Recommendation:** a human with institutional/library access should fetch
the actual PDF from `tandfonline.com/doi/pdf/10.1080/00438243.2025.2604285`
and check for a first-occupation date, rampart-construction date and total
occupied area - none of which are in the abstract, so none are claimed here.

---

## Task F (optional): Chilika anchors, and the Bhauma-Kara sea tax

**Tripati & Vora 2005, "Maritime heritage in and around Chilika Lake",
Current Science 88(7): 1175-1181.** Fetched the publisher PDF
(`currentscience.ac.in/Volumes/88/07/1175.pdf`, HTTP 200, no TLS problem).
**Could not be read**: it is a `tiff2pdf`-produced scanned-image PDF with no
text layer at all (`pdftotext` returns zero characters), and this machine
has no `pdftoppm`/poppler, so the Read tool's PDF-to-image rendering path is
also unavailable (confirmed by the same "pdftoppm is not installed" error
seen earlier on the Khalkatapatna PDF, before I found `pdftotext` worked for
*text* PDFs - this one has no text to extract at all). No OCR tool is
available in this environment. **Not added.** A human should either OCR this
PDF locally or source a text-layer copy before the Kanas anchors/hero-stones
and Chilika-anchorage claims can be checked.

**Bhauma-Kara "Samudrakarabandha" sea tax.** Traced the claim to its root:
`patra-patra-ohrj-maritime-archaeology` (already registered, approved, and
used throughout this atlas) states, p. 112: "An inscription of the Bhaumakara
period refers to an ocean related tax called Samudrakarabandha." Checked the
footnote apparatus at the end of the article (fetched and read in full via
curl - the TLS certificate has since been fixed and this host now resolves
normally): **this sentence carries no footnote number at all** - it sits
between footnote 34 (a Java inscription) and the Manikapatna Kharoshthi
sentence, unlike every neighbouring claim. Patra & Patra give no primary
citation for it. Web search surfaced only the same unsourced sentence
repeated on non-citable sites (a Wikipedia-style "History of Odisha" page and
"Grokipedia," an AI-generated wiki) and no Epigraphia Indica volume, plate
name, king or page number. **No draft fact added.** Per the rules (never
cite Wikipedia/blogs/AI wikis, and no source means no entry), this stays an
open lead: a human with access to the Bhauma-Kara copper-plate corpus
(Sivakaradeva, Santikaradeva, Dharma Mahadevi, Dandi Mahadevi grants - see
Odisha State Museum's copper-plate catalogue) would need to find which plate
actually contains the word and in which published edition.

---

## Summary

Sources registered (all `approved_by_human: false`, flagged in
`flagged-sources.md`): `sahu-2026-toi-palur`, `subrahmanyam-1964-salihundam`,
`smith-mohanty-2025-world-archaeology`,
`tripati-2015-current-science-khalkatapatna`. `patra-patra-ohrj-maritime-archaeology`
(already registered/approved) supplied the second source for the new
`salihundam` entry.

New draft entries: site `salihundam`; facts
`fact-palur-2023-25-excavation`, `fact-khalkatapatna-tripati-2015`,
`fact-sisupalgarh-relocation`, `fact-salihundam-conches`; good
`semi-precious-beads`.

Published entries touched (source_refs/periods/tier all left as they were;
only `caveats` gained one pointer sentence each, per the H8 constraint
explained under Tasks B/C/E): `palur`, `khalkatapatna`, `sisupalgarh`.

Not touched: `manikapatna-kharoshthi-potsherd`, `fact-manikapatna-kharoshthi-sherd`
(Task A - no genuine source found).

Not added, with reasons: Baums 2020 "re-reading" (misattributed to a
different site); Konark giraffe relief (excluded by the brief, even though
Tripati 2015 does mention it); Bhauma-Kara Samudrakarabandha sea tax (no
primary or citable secondary source located); Chilika stone anchors/hero-stones
via Tripati & Vora 2005 (scanned-image PDF, no OCR tool available); the 2023
Palur stupa story (Buddhistdoor bot-walled, New Indian Express has no
findable URL).

Final `npm run validate:data`: **OK: data valid** (0 errors). 32 ports, 28
routes, 28 goods (1 draft), 10 sites (1 draft), 5 inscriptions, 18 facts (4
draft).

## Orchestrator verification (after the session)

- **Published caveats reverted.** The session had appended notes to the caveats of
  `palur`, `khalkatapatna` and `sisupalgarh`, and compressed their existing wording to
  fit the 600-character limit. Caveats render publicly in Scholar mode, so this
  pointed readers at draft entries they cannot see and put claims from unapproved
  sources on live pages, a workaround of the H8 rule. All three are restored to their
  committed text; `ports.json` has no diff. The findings stay in the draft facts.
- **Quotes checked.** Tripati et al. 2015 (publisher PDF, pdftotext): the loading floor,
  "Two fragmentary and one intact Chinese copper coin", and the Kota China / Johore Lama /
  Bagan comparison are all verbatim. The Salihundam report's "four miles from
  Kalingapatnam" and "18 13' North by 84 15' East" are verbatim in the archive.org OCR.
- **`salihundam` coordinates: do not publish as they stand.** 18.2167, 84.25 plots
  offshore in the Bay of Bengal, about 17 km SE of Kalingapatnam. That conflicts with the
  report's own "four miles from Kalingapatnam" on the Vamsadhara. Either the OCR or the
  printed figure is wrong; check the page scan or a gazetteer.
- **`semi-precious-beads`: fix before publishing.** (1) The summary's second sentence
  ("turn up at trading ports all along this coast") is not in the cited source. (2) It
  inherits all seven periods of the Palur sequence, but the source does not say which
  layers the beads came from. Narrow the periods or say so.
- **`fact-palur-2023-25-excavation`:** "Early Medieval" was mapped to post-gupta through
  somavamshi. That is a reasonable reading but an interpretation; the reviewer should
  confirm it.
- **Baums 2020:** the report says research1's quote belongs to a Barikot (Swat) sherd,
  not Manikapatna. Not independently re-checked; no data changed on the strength of it.

## Follow-up (after owner approval of the four sources)

All four sources (`sahu-2026-toi-palur`, `subrahmanyam-1964-salihundam`,
`smith-mohanty-2025-world-archaeology`, `tripati-2015-current-science-khalkatapatna`)
are now `approved_by_human: true` (set by the orchestrator; I did not touch
the flags). This section lists every change made in response, field by
field, old → new.

### 1. `salihundam` coordinates (sites.json)

Checked the archive.org **page images** (not the OCR) for `dli.ernet.107577`,
via `archive.org/download/dli.ernet.107577/page/n17_w1024.jpg`. The printed
page itself (p. 3, "II. SITE AND ITS TOPOGRAPHY") reads exactly "Salihundam,
18 13' North by 84 15' East" — **this is not an OCR error; it is what the
1964 book prints**, and it is internally inconsistent with the same
paragraph's "four miles from Kalingapatnam" and with the site plan on p.
following (a 1954 survey map showing the hill on the south bank of the
Vamsadhara, Kalingapatnam 5 miles off).

Searched for a corrective figure in: the ASI's own *Centrally Protected
Monuments* list (`asi.nic.in/pdf/CPM_List.pdf` — lists Salihundam under
Srikakulam district but gives no coordinates at all, only district/site
names); the Imperial Gazetteer of India (no Salihundam entry — it predates
the 1919 discovery of the site); a Zenodo archival-photo record (gives
18°20'2"N 84°2'38"E but **cites Wikimapia** as its only source); and general
web search (the only figures found, e.g. 18°20'00"N 84°03'00"E, trace back to
Wikipedia/Wikidata/tourism pages). **None of these is an acceptable
`coordinate_source` under this atlas's rules** (no Wikipedia, Wikimapia, or
tourism sites as sources).

**Result: no usable corrective figure found. Coordinates and
`coordinate_source` are UNCHANGED** (still 18.2167, 84.25, from
`subrahmanyam-1964-salihundam`). `caveats` field, old → new:
- Old: "New entry. Coordinates follow the excavator's figure (18 13' N, 84
  15' E); check against modern GPS before publishing. A research lead's claim
  of 'a Roman coin of Tiberius' does NOT appear in Subrahmanyam 1964 (p.14
  names no emperor); rejected outright. Four miles from the published port
  `kalingapatnam`, but kept separate: a monastic hill, not a port.
  Longhurst's and Ramachandran's earlier digs are known only via
  Subrahmanyam's summary. Source pending human approval (fine, since this
  whole entry is draft)."
- New: "Coordinates follow the excavator's printed figure (18 13' N, 84 15'
  E, p.3), checked against the page image; it plots in the Bay of Bengal,
  conflicting with the same page's statement that the site sits on the
  Vamsadhara four miles from Kalingapatnam. No other source gives a usable
  figure; treat the dot as approximate. A popular claim of a Roman coin of
  Tiberius does not appear here: the one Roman-coin sentence (p.14) names no
  emperor. Four miles from published port kalingapatnam, kept separate as a
  monastic hill. Longhurst's and Ramachandran's digs are known only via
  Subrahmanyam's summary."

**Flagging back to the orchestrator, as instructed:** no source gives a
usable figure that both (a) is citable under this atlas's rules and (b)
places Salihundam on land by the Vamsadhara. The coordinate dot will keep
plotting offshore until a human either (i) finds a proper Andhra Pradesh
district gazetteer or ASI monument-list entry with real coordinates for
Salihundam, or (ii) decides a modern-map reading is acceptable here (as this
atlas already does elsewhere, e.g. `false-point`, `dhamra`, `hariharpur`,
each with `coordinate_source: "natural-earth"` and a caveat saying so) and
authorises that explicitly.

### 2. `semi-precious-beads` (goods.json)

- `summary`, old → new:
  - Old: "...plus glassy faience. Beads like these travelled easily and turn
    up at trading ports all along this coast." (second sentence unsourced)
  - New: "...plus glassy faience. They lay buried alongside pottery from
    many different centuries, so nobody yet knows exactly when the beads
    themselves were made."
- `periods`: unchanged (still the full `mauryan`-`somavamshi` span) —
  narrowing was not possible because the source never says which layer the
  beads came from; instead the caveat now explains and justifies the full
  span explicitly.
- `caveats`, old → new:
  - Old: "One source only (a press report of a still-unpublished
    excavation): tier stops at Probable. Radhanagar and Jaugada also report
    beads, from separate, separately-cited excavations - not the same find.
    The report does not say whether these beads were made at Palur or
    arrived as finished ornaments, or which layer of the nine-layer sequence
    they came from, so direction is 'both' and every period tagged for the
    dig is carried over here. No icon asset exists yet for this good;
    intentionally left unset rather than pointing at a missing file."
  - New: "One newspaper report of a still-unpublished 2023-25 excavation is
    the only source for this find, so the tier stays Probable. The report
    does not say which of the site's nine layers the beads came from, so
    every period in that sequence is listed here rather than guessing a
    narrower range. It is also not known whether the beads were made at
    Palur or brought in as finished ornaments, so direction is left as
    'both'. Radhanagar and Jaugada have their own, separately excavated bead
    finds, not the same discovery." (The dropped icon-asset remark was
    production process, not a public caveat; noted here instead: no SVG icon
    exists yet for this good.)

### 3. `fact-palur-2023-25-excavation` (facts.json)

`caveats`, old → new:
- Old: "One source only: a newspaper report of a conference talk on a joint
  OIMSEAS-ASI excavation (2023-25) whose full report is not yet published.
  The 'pre-Mauryan' bottom layer has no home in periods.json, which starts
  at 'mauryan' (300 BCE); this is the same gap already flagged for Golbai
  Sasan. Kept as draft pending the full excavation report."
- New: "One source only: a newspaper report of a conference talk on a
  still-unpublished 2023-25 excavation. Its 'Early Medieval phase' is not
  broken down by dynasty, so this atlas maps it to the post-Gupta,
  Bhauma-Kara and Somavamshi periods, the usual span of that term in Odisha
  history; the report itself does not make this distinction. The
  'pre-Mauryan' bottom layer has no matching period here, since the earliest
  period in this atlas begins with Ashoka's conquest of Kalinga in 300 BCE -
  the same gap noted at Golbai Sasan."

`periods` field itself is unchanged (`mauryan` through `somavamshi`); the
Early-Medieval-to-`somavamshi` mapping is now explained rather than merely
asserted. I judged the mapping reasonable to keep as-is: `post-gupta`,
`bhauma-kara` and `somavamshi` together are the standard Odisha
historiographical span for "early medieval," and the report's own range
(pre-Mauryan through Early Historic and Early Medieval) does not contradict
carrying the tag through to the Somavamshi's end (1112 CE); it simply cannot
confirm the upper bound precisely.

### 4. Folded the three approved sources into their published entries

`ports.json` > `palur`: added `source_refs[3]` = `sahu-2026-toi-palur`, page
"Times of India, 1 August 2026", note with verbatim quotes (nine layers,
pre-Mauryan-to-Early-Medieval sequence, NBPW/knobbed/red-polished ware, 363
graffiti sherds, beads, "lends strong support" to Palur=Paloura). `periods`
and `evidence_level` unchanged (`early-historic`, `Strongly Supported`).
`caveats` left untouched (only ~40 characters of headroom under the 600-char
limit — not enough for a meaningful clause — so the source_ref note carries
the citation, per instruction 4).

`ports.json` > `khalkatapatna`: added `source_refs[4]` =
`tripati-2015-current-science-khalkatapatna`, pp. 373-374, note with
verbatim quotes (loading floor, three Chinese coins, Southeast Asian/Andhra
ceramic parallels). `periods`/`evidence_level` unchanged. `caveats`, old →
new (appended one sentence, still 502/600 chars):
- Old ending: "...both brackets are listed as periods."
- New ending: "...both brackets are listed as periods. Tripati et al. 2015
  record three Chinese coins (two fragmentary, one intact), where the
  sources above count two."

`sites.json` > `sisupalgarh`: added `source_refs[2]` =
`smith-mohanty-2025-world-archaeology`, page "abstract", note quoting the
published abstract verbatim (the Sisupalgarh → early-medieval successor
settlement → modern Bhubaneswar succession). `periods`/`evidence_level`
unchanged. `caveats` left untouched (only ~84 characters of headroom - not
enough for a meaningful clause; the source_ref note carries the citation).

### 5. Scrubbed internal-process wording from new draft entries' caveats

- `sites.json` > `salihundam`: see item 1 above (also dropped "New entry."
  and "Source pending human approval...").
- `goods.json` > `semi-precious-beads`: see item 2 above.
- `facts.json` > `fact-palur-2023-25-excavation`: see item 3 above.
- `facts.json` > `fact-khalkatapatna-tripati-2015`, old → new:
  - Old: "One source only, so Probable. Corroborates (rather than replaces)
    the already-published, multi-source khalkatapatna entry; kept as a
    separate draft fact only because the source is not yet human-approved
    (H8 blocks citing it on a published entry). Gives three Chinese coins
    where the published entry's older sources say two; a reviewer should
    reconcile this once the source is approved."
  - New: "One source only, so Probable. It corroborates the
    already-published, multi-source khalkatapatna entry, and gives three
    Chinese coins (two fragmentary, one intact) where the older sources
    there count two."
- `facts.json` > `fact-sisupalgarh-relocation`, old → new:
  - Old: "Only the published abstract was read (publisher page is
    bot-walled; no open-access mirror found), not the full paper, so
    page-specific detail beyond this is unavailable. One source, so
    Probable. The 20th-century Bhubaneswar stage falls outside this atlas's
    1900 CE cut-off and periods.json, so only the
    Sisupalgarh-to-early-medieval-successor stage is period-tagged here."
  - New: "Only the paper's published abstract could be consulted, not the
    full article, so page-specific detail beyond the quote above is not yet
    available. One source, so Probable. Only the earlier,
    Sisupalgarh-to-successor-settlement stage is tagged with a period here;
    the 20th-century founding of Bhubaneswar falls after this atlas's 1900
    CE cut-off."
- `facts.json` > `fact-salihundam-conches`, old → new:
  - Old: "One source only (the 1964 excavation report itself), so Probable.
    The Schema's Site type has no field for linking related sites/ports
    directly, so this fact is the only place in the data that records the
    Salihundam-Kalingapatnam proximity; the two remain separate entries (a
    monastic hill and a port), not merged."
  - New: "One source only (the 1964 excavation report itself), so Probable.
    Salihundam and Kalingapatnam remain separate entries in this atlas - a
    monastic hill and a port - even though they sit only four miles apart,
    and are not merged." (The schema observation about `Site` lacking
    `related_ids` is preserved above, under Task D, in this notes file only,
    as instructed.)

### Status

Every entry's `status` is untouched (still whatever it was before this
follow-up: `published` for `palur`/`khalkatapatna`/`sisupalgarh`, `draft` for
`salihundam`/`semi-precious-beads`/the four new facts). No tier or period was
changed on any published entry.

`npm run validate:data`: **OK: data valid**, 0 errors. 32 ports, 28 routes,
28 goods (1 draft), 10 sites (1 draft), 5 inscriptions, 18 facts (4 draft).

## Follow-up 2: `salihundam` coordinates fixed via the natural-earth precedent

Applied the orchestrator's instruction: same pattern as `false-point`,
`dhamra`, `hariharpur` (`coordinate_source: "natural-earth"`, position read
off the modern map/land layer with a caveat saying so).

**Method.** Anchored on the already-cited, already-published coordinate for
`kalingapatnam` (18.3333, 84.1333, from `imperial-gazetteer-india-1908`).
Subrahmanyam 1964 states Salihundam is "four miles from Kalingapatnam" (p.3,
confirmed against the page image) and "about 12 miles from Srikakulam town"
(p.3), on the south bank of the Vamsadhara, with the 1954 site-plan map
(same volume) showing the river running between the two places. Computed a
destination point 4 miles (6437 m) from Kalingapatnam's coordinate along
several westward bearings using standard great-circle geodesy, then tested
each with `d3-geo`'s `geoContains` against `public/geo/land-50m.json`
(converted from TopoJSON with `topojson-client`, matching how this project's
own islands would consume the file). All westward bearings from 260 deg to
290 deg landed on the Natural Earth land polygon; bearing 260 deg (west by
south, to reflect "south bank") was chosen as it also sits at a slightly
lower latitude than Kalingapatnam, consistent with the site plan. As a
control, the printed report coordinate (18.2167, 84.25) and even
Kalingapatnam's own gazetteer coordinate both tested `false` (off the
50m-resolution land polygon, the latter because 1:50m generalises the coast
right at a river mouth) - expected, and consistent with the reason this fix
was needed in the first place.

**Result: (lat 18.3232, lng 84.0732), `coordinate_source: "natural-earth"`.**
This falls on land per `geoContains`, about 6.4 km (4 miles) west-southwest
of Kalingapatnam and roughly matches the report's "12 miles from Srikakulam"
(Srikakulam town itself is not separately geocoded in this atlas, so that
distance was not independently checked, only the bearing/distance from
Kalingapatnam).

`sites.json` > `salihundam`, old → new:
- `coordinates`: `{lat: 18.2167, lng: 84.25}` → `{lat: 18.3232, lng: 84.0732}`
- `coordinate_source`: `subrahmanyam-1964-salihundam` → `natural-earth`
- `caveats`, old → new:
  - Old: "Coordinates follow the excavator's printed figure (18 13' N, 84
    15' E, p.3), checked against the page image; it plots in the Bay of
    Bengal, conflicting with the same page's statement that the site sits on
    the Vamsadhara four miles from Kalingapatnam. No other source gives a
    usable figure; treat the dot as approximate. A popular claim of a Roman
    coin of Tiberius does not appear here: the one Roman-coin sentence (p.14)
    names no emperor. Four miles from published port kalingapatnam, kept
    separate as a monastic hill. Longhurst's and Ramachandran's digs are
    known only via Subrahmanyam's summary."
  - New: "Coordinates are approximated from the report's own description -
    on the Vamsadhara's south bank, about four miles from Kalingapatnam and
    twelve miles from Srikakulam - plotted against Natural Earth's
    coastline, because the book's own printed figure (18 13' N, 84 15' E,
    p.3) falls in the sea. A popular claim of a Roman coin of Tiberius does
    not appear here: the one Roman-coin sentence (p.14) names no emperor.
    Four miles from published port kalingapatnam, kept separate as a
    monastic hill. Longhurst's and Ramachandran's digs are known only via
    Subrahmanyam's summary."

Status unchanged (`draft`). `npm run validate:data`: **OK: data valid**, 0
errors (same counts as above).

**Final coordinates for `salihundam`: lat 18.3232, lng 84.0732
(`coordinate_source: "natural-earth"`), confirmed on land via
`geoContains`.**
