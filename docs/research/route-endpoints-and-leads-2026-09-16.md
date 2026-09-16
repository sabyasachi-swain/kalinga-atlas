# Route endpoints and verification leads — 2026-09-16 (second session)

Scope: (1) add entities that block already-sourced routes; (2) verify a set of
specific leads against real scholarship, rejecting where there is no genuine
source. **Nothing in `additinal_sources_needs_review/` was used or cited** —
see `docs/research/rejected-sources-2026-09-16.md` for why those four files
were rejected in full before this session started.

## Part 1 — new entities, so the routes researcher can write the blocked routes

All three fetched and quoted directly (via `curl` + `pdftotext`, no OpenRouter
needed - the passages were short and I could quote them by hand with page
numbers).

- **`sambalpur`** (`ports.json`, Strongly Supported, 3 sources: `stirling-1825`
  p. 194/218, `hunter-1872` vol. ii App. III p. 74, `imperial-gazetteer-orissa`
  vol. XXII pp. 12-13). All three were already cited in this repo's `goods.json`
  entries for diamonds/iron/salt/sal-timber/tasar-silk under "Sambalpur
  District" - I combined them into a place entity rather than re-deriving
  anything. No printed town coordinate was found in any of the three; used a
  modern-map approximation (`natural-earth`).
- **`ujjayini`** and **`takshashila`** (`sites.json`, both Strongly Supported,
  2 sources each). Fetched Hultzsch's *Inscriptions of Asoka* (CII I, 1925)
  full text from archive.org and found the actual clauses: First Separate Rock
  Edict, Dhauli, p. 97, clauses AA/BB, naming Ujjayini and Takshasila as the
  two other provincial capitals whose governors also had to send inspecting
  officers every three years. Hultzsch's own introduction (pp. xxxvii-xxxviii)
  gives the standard identifications (Ujjayini = modern Ujjain; Takshasila =
  Cunningham's Shahdheri, near modern Taxila). For a second, independent
  source, fetched Kulke & Rothermund, *A History of India* (the same PDF
  edition already pinned to page 67 elsewhere in this repo for the Mauryan
  period) and found, also on p. 67: "the viceroy of the northwest resided at
  Taxila ... the viceroy of the west at Ujjain", alongside Tosali in Kalinga
  (east) - which also independently corroborates this repo's existing Tosali
  claims. Neither source prints a coordinate; both entities use a modern-map
  approximation.

**Routes now writable** (place ids that exist and resolve): any route with
`from`/`to` equal to `sambalpur`, `ujjayini` or `takshashila` will now pass
`ref-route-endpoint`. Likely candidates for the routes researcher: a Mahanadi
river/land route between `cuttack` (or another river port) and `sambalpur`
carrying salt one way and diamonds/iron/tasar silk the other (Stirling 1825
and Hunter 1872 already describe the cargo, just not as a `routes.json`
entry); and land routes from `dhauli` and/or `jaugada` to `ujjayini` and to
`takshashila`, representing the inspection circuit the edict itself describes
(Hultzsch p. 97) - these would parallel the existing `route-dhauli-jaugada-road`
entry, which already models an administrative rather than a merchant link.

## Part 2 — leads verified against real scholarship

### Dantapura's identification (`palur`) — fixed
The `palur` entry's caveats asserted the Dantapura equation without a page
citation. Fetched Patra 2014 (`patra-2014-odisha-review-ports`, already a
registered source and already one of `palur`'s three source_refs) and found,
on the same p. 121 already cited for Palur's coordinates: "On linguistic
grounds, S. Levi identifies Dantapura of the Buddhist literatures, and
Dandagula of Pliny with Paloura of Ptolemy," citing S. Levi, *Indian
Antiquary* LV (1926), pp. 98-99. Added this as a proper quote inside the
existing `patra-2014-odisha-review-ports` source_ref and tightened the
caveat to name the underlying paper. Levi's own 1926 paper was not read
directly - only Patra's report of it - so the caveat says so and the
identification stays a philological proposal, not a fact. No tier change
(the port's own Strongly Supported rating rests on the three sources for its
existence, not on the Dantapura question).

### Islamic glazed ware at Manikapatna, 8th-14th century — rejected
Fetched and searched the full text of every source already cited for
Manikapatna's ceramics (`tripati-2021-current-science`, `tripati-2022-scientific-reports`
via the PMC copy, and `patra-patra-ohrj-maritime-archaeology`, all downloaded
directly). None of the three contains the word "Islamic". What they do report
is "egg-white Arabian ware" / "egg white Arabian pottery" (OHRJ pp. 217, 255,
already in the entry) - undated in every source that mentions it - and a
broken Indo-Arabian stone anchor whose finders link it to "Arab (Islamic)
mariners" generically (Tripati 2022), which is about the anchor, not a glazed
ware. No source gives an 8th-14th century bracket for any Arab/Islamic
material at the site. **No entry written.** Added a caveat to `manikapatna`
recording that this was checked and found unsupported, so a future researcher
does not re-open it without a real source.

### Tang and Song ceramics at Manikapatna — checked, one firmer point added, rest rejected
Same three sources searched for "Tang" and "Song" (dynasty names): zero hits.
The existing entry already had Yuan/Ming porcelain (1368-1644 CE, Tripati
2021). Tripati 2022, read in full via the PMC copy, adds one genuinely firmer
data point not previously in this repo: "Chinese ceramic sherds ... of the
13th to 14th century CE ... produced in Fujian and Zhejiang Provinces of
China" (attributed by the excavator to a named ceramics specialist, Ran
Zhang, by personal communication). Added this to the existing
`tripati-2022-scientific-reports` source_ref. This range brushes the very end
of the Song dynasty (960-1279) but is mostly Yuan; the entry's caveat says so
explicitly and does not assert a Song-dynasty find, since no source uses that
dynastic label. No Tang-dynasty (618-907) material was found anywhere.

### A Chilika landing at Chandrabhaga — rejected, and the real Chandrabhaga documented instead
Chandrabhaga is real, but it is the well-known beach next to the Konark Sun
Temple, on the open Bay of Bengal coast about 30 km from Konark - not on
Chilika lake at all (confirmed independently via tourism-board descriptions
that treat "Chandrabhaga" and "Chilika" as two separate stops on the same
day-trip, and this matches what Patra 2014 p. 119 itself says: unnamed
scholars have proposed identifying Xuanzang's Che-li-ta-lo with "Chandrabhaga
near Konarak", a proposal Patra himself calls "based on feeble grounds ...
unacceptable and tenuous"). **No Chilika-landing entry was written.** The
`manikapatna` caveat now records this rival, rejected identification and
explains why Chandrabhaga itself is not entered as a place: it would be
geographically wrong to plot it on the lake.

### Odia boat-building vocabulary and boat types (`boita` etc.) — rejected
Searched specifically for a scholarly or historical (not tourism/festival)
source for Odia boat-building terms. Every result was Wikipedia, a WordPress
blog, or a tourism/culture site - all excluded by the sourcing rules - or the
same modern Boita Bandana festival material the goods researcher had already
found and flagged as describing a present-day commemoration, not a historical
cargo record (`nanda-2019-odisha-review`, already used and already caveated
as unfootnoted). No excavation report, philological study or historical
shipbuilding treatise naming specific Odia boat types was found. **No entry
written.** This confirms rather than overturns the goods researcher's
finding.

## Smaller fixes done

- **`goods > elephants`**: Stirling 1825 p. 182 was mentioned only in prose in
  the caveats. Fetched the actual 1825 *Asiatic Researches* XV text and
  confirmed the quote - "it seems highly probable that the Elephant is not
  indigenous to the province, and it is said that the breed had its origin in
  the escape of some of the tame animals from their keepers in former ages" -
  then added `stirling-1825` as a proper fourth `source_ref` (page 182,
  verbatim quote), rather than leaving it as an uncited aside.
- **`hariharpur`**: fetched Hunter 1872 vol. ii, Appendix IV (the Cuttack
  district fiscal-division table) directly and found, at p. 156: "(32)
  Hariharpur (Jagatsinhpur), 65.37 square miles ... (33) Harishpur Kila, 62.09
  square miles" - two distinct, separately numbered parganas. Added
  `hunter-1872` as a proper source_ref and rewrote the caveat to state plainly
  that the two names are not interchangeable, rather than leaving it as an
  open question.
- **Patnaik 2014a/2014b disambiguation**: root cause found but **not fixed by
  me**. `patnaik-2014-odisha-review` (June 2014, Puri) and
  `patnaik-2014-radhanagar` (December 2014, Radhanagar) already have distinct
  source ids and distinct `issued.date-parts` (`[2014,6]` vs `[2014,12]`), so
  the underlying data is not ambiguous. The problem is in `src/data/cite.ts`:
  `formatShort()`'s `year()` helper reads only `date-parts[0][0]`, discarding
  the month, so both render as the identical short form `[Patnaik, 2014,
  p.XX]`. Fixing this properly means detecting author+year collisions across
  the whole source list and appending a/b suffixes, which changes a
  function's signature and its call sites in components under `src/islands/`
  and `src/pages/` - code territory, and an engineer was working in
  `src/islands/` at the same time. I left this for the engineer rather than
  risk a concurrent edit; flagged clearly in the report.

## Validator

Final run this session: `sources: 44  periods: 11`; `ports: 32 (draft 3,
reviewed 0, published 29)`; `sites: 9 (draft 2, reviewed 0, published 7)`;
`goods: 27` (unchanged count, one entry edited); routes, inscriptions, facts
unchanged. `OK: data valid`, zero warnings.
