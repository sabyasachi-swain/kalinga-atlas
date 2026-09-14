# Goods — research note

Session date: 2026-09-14 · Agent: `researcher` · Scope: populate `src/data/goods.json`

## Outcome

Thirteen `good` entries created, all `status: "draft"`. `src/data/goods.json` was empty before this
session; nothing else in `src/data/` was touched.

| id | category | direction | tier | distinct sources | periods |
|---|---|---|---|---|---|
| `ivory` | animal-product | export | Probable | 2 | early-historic |
| `elephants` | animal-product | export | Strongly Supported | 3 | mauryan, post-gupta, bhauma-kara |
| `cotton-textiles` | textile | both | Strongly Supported | 3 | mauryan, mughal-maratha, british |
| `salt` | foodstuff | export | Strongly Supported | 4 | mughal-maratha, british |
| `rice` | foodstuff | export | Strongly Supported | 3 | british |
| `cowrie-shells` | animal-product | import | Strongly Supported | 3 | post-gupta, british |
| `chinese-ceramics` | ceramic | import | Strongly Supported | 4 | eastern-ganga, gajapati |
| `roman-amphorae` | ceramic | import | Probable | 2 | early-historic |
| `diamonds` | gem | export | Probable | 2 | mughal-maratha, british |
| `sal-timber` | timber | export | Strongly Supported | 3 | british |
| `iron` | metal | both | Strongly Supported | 3 | british |
| `tasar-silk` | textile | export | Strongly Supported | 2 | british |
| `lac-and-beeswax` | other | export | Strongly Supported | 2 | british |

Two entries are held at `Probable` **despite** having two source ids, because the sources are not
truly independent or the inference is conjectural — see `roman-amphorae` and `diamonds` below.

## What I searched, and with what

Everything below was read as full text, not skimmed from search snippets.

1. **Periplus Maris Erythraei.** Casson 1989 (`periplusmarisery0000unse`) is lending-restricted on
   archive.org: `_djvu.txt` is not downloadable, and both the `fulltext/inside.php` and the newer
   `scrape.json` search-inside endpoints return "Item not available". **Casson's page numbers are
   therefore NOT verified anywhere in this file.** Section numbering is standard across editions, so
   entries cite `section 62`; the wording quoted is W. H. Schoff's 1912 translation, read at
   ToposText (`topostext.org/work/491`). Casson's own rendering of the same sentence differs
   (secondary literature reports him giving the Desarene elephants the name *bosare*), which is
   recorded in `ivory`'s source note.
2. **Kautilya, Arthashastra.** Read in R. Shamasastry's translation, archive.org
   `in.ernet.dli.2015.102722` (`2015.102722.Kautilyas-Arthasastra_djvu.txt`). Page numbers taken
   from the OCR'd running heads and cross-checked against the preceding and following head on each
   page. Wikisource's copy of the same translation was used only as a keyword index.
3. **Xuanzang.** Samuel Beal, *Si-yu-ki: Buddhist Records of the Western World*, vol. II, 1884,
   archive.org `siyukibuddhistre02hsuoft`. Running heads legible; pages verified.
4. **Ptolemy.** J. W. McCrindle, *Ancient India as Described by Ptolemy*, archive.org
   `in.ernet.dli.2015.65897`.
5. **Hunter 1872, *Orissa*.** Volume II from Google scan `orissa00huntgoog`; Volume I from
   `orissa-v01-1872`. I wrote a page-attribution script that walks the OCR looking for running heads
   (a line with no lower-case letters containing a 1–3 digit number) and tags every line with the
   last head seen; every page number quoted below was then confirmed by eye against the heads either
   side of the passage. Two early attempts produced wrong page numbers (the muslin passage is on
   p. 40, not p. 31; the Mahanadi river-traffic passage is Appendix III p. 74, not p. 73) — those are
   corrected in the data.
6. **Stirling 1825.** *Asiatic Researches* XV, archive.org `asiaticresearche151825cal`. Stirling's
   article runs pp. 163–338; the commerce section is at pp. 192–195.
7. **Imperial Gazetteer of India** (new edition, 1907–09), vol. XXII, archive.org
   `imperialgazettee22grea`, Sambalpur District at pp. 8 ff.
8. **Odisha government journals.** *Odisha Review* Nov 2014 (Patra, "Ports in Ancient Odisha") and
   *OHRJ* XLVII(2) (Patra & Patra) downloaded as PDFs and text-extracted. The
   `magazines.odisha.gov.in` TLS certificate has expired, so WebFetch refuses them; `curl -k` works.

## Exact references used

### Periplus (`periplus-casson-1989`)

- §61: Palaesimundu/Taprobane "produces pearls, transparent stones, muslins, and tortoise-shell".
- §62: Masalia produces "a great quantity of muslins"; "Dosarene yields the ivory known as
  Dosarenic". **Masalia is Machilipatnam in Andhra, not Kalinga** — this is why the Periplus muslins
  are *not* cited for `cotton-textiles`.
- §63: the Ganges region yields "malabathrum and Gangetic spikenard and pearls, and muslins of the
  finest sorts"; Chryse has "the best tortoise-shell". Bengal and Chryse, not Kalinga — not used.

### Arthashastra (`arthashastra`, Shamasastry translation)

- Book II, ch. 2, **p. 49**: "Elephants bred in countries, such as Kalinga, Anga, Karusa, and the
  East are the best; those of the Dasarna and western countries are of middle quality."
- Book II, ch. 11, **p. 84**: "Of cotton fabrics, those of Madhura, of Aparanta, western parts, of
  Kalinga, of Kasi, of Vanga, of Vatsa, and of Mahisha are the best."
- Book II, ch. 12 (touchstones): "The touch-stone of the Kalinga country with the colour of green
  beans is also the best." Interesting, but a tool rather than a traded good — not entered.
- Book II, ch. 11, **p. 80, footnote 2**: the *commentator's* list of diamond-mine locations includes
  Kalinga ("Magadha, Kalinga, Surpaka, Jaladayasa, Paundraka, Barbara, Tripura, the mountains such as
  Sahya and Vindhya, Benares … Kosala and Vidarbha"). **This is Shamasastry's footnote reporting a
  commentary, not Kautilya's text**, so it is deliberately *not* cited in `diamonds`. It is the most
  tempting over-claim in this whole session; see open question 2.

### Xuanzang (`xuanzang-travels`, Beal 1884 vol. II)

- **p. 205**, Wu-ch'a/Odra: Charitra (Che-li-ta-lo) on the ocean border, "Here it is merchants depart
  for distant countries … Here are found all sorts of rare and precious articles."
- **p. 207**, Kong-u-t'o/Kongoda (Cunningham: Ganjam): "This country, bordering on the sea, abounds
  in many rare and valuable articles. They use cowrie shells and pearls in commercial transactions.
  The great greenish-blue elephant comes from this country."
- **p. 207**, Kalinga: "It produces the great tawny wild elephant, which are much prized by
  neighbouring provinces."

### McCrindle's Ptolemy (`mccrindle-ptolemy-1927`)

- **p. 71**: "Adamas is a Greek word meaning diamond. The true Adamas, Yule observes, was in all
  probability the Sank branch of the Brahmani, from which diamonds were got in the days of Mogul
  splendour."
- **p. 169**: "Sambalaka — … The Sambalaka of the Mandalai may perhaps be Sambhalpur on the Upper
  Mahanadi, the capital of a district which produces the finest diamonds in the world."
- **p. 333** (Additional Notes, quoting V. Ball's 1883 address to the Royal Geological Society of
  Ireland): the Adamas "was not identical with the Mahanadi … but with the Subanrikha, which is,
  however, so far as we know, not a diamond-bearing river"; Ball then rejects Lassen's alternative.
  This is the disagreement recorded in `diamonds.caveats`.

### Hunter 1872 (`hunter-1872`)

Volume I:
- **p. 41** ("SALT-MAKING IN PARIKUD"): "The only manufacture of Parikud is salt. There are two
  processes of making it; one by solar evaporation, the other by boiling."

Volume II, main text:
- **p. 40** ("OUR ORISSA TRADE (1680)"): "the Orissa factors bought up at the lowest prices for ready
  money the fine muslins of Cattack."
- **p. 102** ("THEIR TRADE AND CURRENCY"): "The trade of the Tributary States consists of rice,
  sugar-cane, oil seeds, clarified butter, cotton, coarse cereals, timber, lac, turmeric, beeswax,
  and other jungle products."
- **pp. 159–162** (running heads for 160–161 lost in the OCR): "Every year the Tributary States and
  Central Provinces export large quantities of rice, grain, oil-seeds, cotton, and other rural
  commerce to the coast, **in exchange for salt**."
- **p. 167**: "From time immemorial Orissa … has used a local currency of cowries"; official rate
  5,120 cowries to the rupee at annexation, "a rupee now only purchases 3584 of these."
- **p. 235**: transit dues on timber "mounting up 133 per cent. on a journey of 42 miles" in Ganjam.
- **p. 247**: "the Cattack and Balasor muslins formed an important item in the yearly Investments.
  But handloom industry, even in India, cannot compete with Lancashire machinery."

Volume II, Appendices (separately paginated 1–210):
- **App. I (Puri), p. 13**: Machhagaon near the Devi mouth — "A considerable export rice trade is
  done here"; Pipli and Bhubaneswar are "seats of a considerable trade in rice and cloth".
- **App. III (Tributary States), p. 74**: Baideswar, Padmabati and Kantilo "carry salt, spices,
  cocoa-nuts, and brass utensils up to Sambalpur … bringing thence, in exchange, cotton, wheat,
  oil-seeds, clarified butter, oil, molasses, iron, turmeric, tasar cloth, rice, etc."
- **App. III, p. 75**: "The chief marketable timber of the Tributary States is Sal … The jungle
  yields an annual supply of resin, lac, tasar, bees-wax, dyes, fibres"; class (9.) "Kostia, dealers
  in tasar"; Kols "who sell resin, lac, wax".

### Stirling 1825 (`stirling-1825`, *Asiatic Researches* XV)

- **p. 182**: on the wild elephants of Mayurbhanj — "it seems highly probable that the Elephant is
  **not indigenous to the province**, and it is said that the breed had its origin in the escape of
  some of the tame animals." Recorded in `elephants.caveats`.
- **p. 194**: "The exports liable to duty are as follows:—Piece goods, bees wax, iron, kut'h (the
  inspissated juice of the khayar or mimosa chadira), oil, lac, stone plates, sal timber, congni
  wood, karbeli, shirbeli and petty articles."
- **p. 194**: "A considerable exportation of rice takes place from the several small ports along the
  coast to Calcutta."
- **p. 194**: "formerly salt was an important article of export by way of the great road leading
  along the Mahanadi to Sembelpur and Berar … more than three lacs of maunds being exported
  annually."
- **p. 194**: "Piece goods, silk, good tobacco, and every thing in the shape of a luxury, are
  imported from the adjoining districts of Bengal, and a small supply of **couris, cocoanuts, coral,
  and dried fish is obtained from the few Maldive vessels, which resort annually to Balasore and
  Dhamra, to take on board cargoes of rice and earthen pots**." This one sentence carries the
  cowrie-import direction and the rice `kid_line`.
- **p. 218**: "The Revenue derived from the salt monopoly, exceeds the total amount of the land rents
  paid to the State."

### Imperial Gazetteer of India, vol. XXII (`imperial-gazetteer-orissa`)

Sambalpur District:
- **p. 12**: "Iron ores occur in most of the hilly country … There are 160 native furnaces, which
  produce about 1,120 cwt. of iron annually. When Sambalpur was under native rule diamonds were
  obtained in the island of Hirakud ('diamond island') in the Mahanadi. The Jharias or
  diamond-seekers were rewarded with grants of land in exchange for the stones found by them. The
  right to exploit the diamonds, which are of very poor quality, was leased by the British
  Government for Rs. 200, but the lessee subsequently relinquished it."
- **p. 12**: sal forest about 238 sq. miles; 1903-4 forest revenue Rs. 34,000 (Rs. 12,000 bamboos,
  Rs. 10,000 timber).
- **p. 13**: "Tasar silk-weaving is an important industry in Sambalpur. The cocoons are at present
  not cultivated locally, but are imported from Chota Nagpur … A little cloth is sent to Ganjam, but
  the greater part is sold locally."
- **p. 13**: "Rice is the staple export of Sambalpur, being sent principally to Calcutta, but also to
  Bombay and Berar … Salt comes principally from Ganjam, and is now brought by rail instead of river
  as formerly."

### Patra 2014, *Odisha Review* (`patra-2014-odisha-review-ports`)

- **pp. 119–120**: Khalkatapatna, c. 12th–14th century CE — "Chinese celadon ware; Chinese porcelain
  with blue floral design on white background, egg white glazed ware and glazed chocolate ware, all
  of foreign origin … two Chinese copper coins … datable to c. 14th century CE."
- **p. 120**: Manikapatna — "The discovery of rouletted ware, fragments of amphora etc., indicate its
  contact with the Roman Empire in the early centuries CE."
- **p. 122**: "The Periplus of the Erythraean Sea describes that the sailors from Masalia proceeded
  eastward across a neighbouring Bay to reach Dosarene which had the good breed of elephants called
  bosare. **The ivory yielded in Dosarene was known as dosarenic.**" Followed by the rival
  identifications: Moti Chandra → Toshali; B. Srivastava → a janapada with Palur/Dantapura as
  capital; Patra's own preference → the Chilika coast, the same region as Xuanzang's Kongoda.
- **p. 122**: Sonapur (Ganjam) — "Excellent qualities of edible oysters were found here which
  constituted one of the principal items of export from this port." One source only; not entered.

### Patra & Patra, OHRJ XLVII(2) (`patra-patra-ohrj-maritime-archaeology`)

- **p. 109**: exploration around Palur (Kantigarh) by A. Nath (ASI) and K. S. Behera "unearthed
  fragments of the Chinese celadon ware, the Roman rouletted ware, amphora pieces etc."
- **p. 111**: Manikapatna's "Chinese celadone ware, white porcelain, blue, white and brown glazed
  porcelain sherds, Roman rouletted pottery and fragments of amphora, knobbed ware, Burmese pottery,
  Ceylonese coins, Siamese pottery, Indonesian terracotta, egg white Arabian pottery."
- **p. 112**: Manikapatna beads of terracotta, agate, soft stone and bone; bangles in terracotta,
  faience, glass and **conch-shell**; iron harpoon, spearhead, sickle, fishhooks, boat nails, slag.
- **pp. 112–113**: Don Ta Phet (Thailand) "semiprecious stone and glass beads, knobbed base bronze
  vessels etc. tangibly indicate the brisk commercial contact of Orissa with Thailand."
- **p. 114**: Brahmeswar temple frieze, Bhubaneswar, c. 9th century CE — two ships, each with a
  standing elephant on the bow. "the sculpture justify at least two points that the ships of ancient
  Orissa were well built and were big and strong enough to carry elephants, and that **elephant was
  an item of export** among many other items."

## Candidates I checked and rejected

The brief listed more candidates than the sources support. Each of these was searched for and left
out, deliberately:

| Candidate | Why not entered |
|---|---|
| **pepper** | Zero hits in Hunter (both volumes) or Stirling for pepper as an Odisha product or export; the only hit is "red pepper" as a garden vegetable (Hunter, App. I, p. 15). Pepper is Malabar. |
| **muslin as a Periplus good** | Periplus §62's muslins belong to Masalia = Machilipatnam (Andhra), and §63's "Gangetic" muslins to Bengal. Attributing either to Kalinga would break the "east coast ≠ Kalinga" rule. The Kalinga cotton claim rests on the Arthashastra instead. |
| **conch shell / chank** | Conch-shell **bangles** are reported at Manikapatna (OHRJ p. 112; *Odisha Review* Nov 2014 p. 120) and Hunter lists "Sankhari, makers of shell bracelets" as a Balasore caste (App. II, p. 39). That is evidence of shell-working, not of shell being traded in or out. Needs a source that says so. |
| **pearls** | One source only (Beal vol. II p. 207, Kongoda "use cowrie shells and pearls in commercial transactions"), and that describes money, not trade goods. Periplus §61 puts pearls at Taprobane. Would be `Probable` at best; left out. |
| **horses (import)** | Nothing in Hunter, Stirling or the Gazetteer about a horse trade into Odisha. |
| **cloves and other Southeast Asian spices** | Hunter App. III p. 74 has boats carrying "spices" *up* the Mahanadi, unspecified. No source names a clove, nutmeg or mace reaching Odisha. |
| **tortoiseshell** | Periplus §61 and §63 put it at Taprobane and Chryse. Not Kalinga. |
| **sugar** | Sugar-cane and molasses appear repeatedly as a crop and as inland traffic (Hunter p. 102, App. II p. 45) but never as an export. |
| **indigo, saltpetre, opium** | Zero hits for indigo, saltpetre or opium as Orissa trade goods in Hunter vol. II or Stirling. Hunter vol. I p. 313 mentions "indigo, mulberry, and silk … the costly products of Bengal and Orissa" as the *traditional* exports of ancient **Tamluk**, which is a Bengal port and a legend-flavoured aside, not a citable Orissa export. Saltpetre was a Bihar/Bengal trade. |
| **betel nut** | Only as a caste name (Tamboli, betel-nut sellers) and a diet item. No trade record. |
| **stone and glass beads** | Genuinely attractive (Manikapatna finds + the Don Ta Phet parallel) but both statements come from the same work, OHRJ XLVII(2). One work = `Probable` at most, and the export inference is the authors' own. Left as open question 5. |
| **edible oysters (Sonapur)** | One source (*Odisha Review* Nov 2014, p. 122), no corroboration. |

## Notes on particular entries

- **`elephants` is the strongest entry in the file**: three genuinely independent sources across three
  periods (a Sanskrit treatise, a Chinese pilgrim's account, and a sculptured frieze), plus Stirling's
  19th-century scepticism as a counterweight in `caveats`.
- **`roman-amphorae` is held at `Probable` despite two source ids** because both were written by
  Benudhar Patra (one with a co-author). The validator counts two distinct ids and will not complain;
  the tier is a judgement call about independence, and it is recorded in `caveats`.
- **`diamonds` is held at `Probable`** because only the Gazetteer documents actual diamond-getting,
  and it calls the stones "of very poor quality". The ancient hook (Ptolemy's Sambalaka and Adamas)
  is a chain of two conjectures with a published objection attached.
- **`iron` and `cotton-textiles` use `direction: "both"`** because the sources genuinely conflict on
  direction; both directions are quoted in the source notes.
- **Icons.** Every entry carries `icon: "<id>.svg"` as instructed. None of these files exist yet in
  `src/assets/goods/`; the designer will need to draw 13 of them.

## Open questions for the human reviewer

1. **Casson's page numbers for the Periplus.** Every Periplus citation in this file gives a section
   number only. If the project wants Casson's pages, someone with library access must supply them; the
   archive.org copy is lending-restricted and the search-inside API is closed for it. It would also
   settle whether Casson reads §62 as *ivory* (Schoff) or as *elephants called bosare* — secondary
   literature reports both from him, and I could not check.
2. **The Arthashastra commentator on Kalinga diamond mines.** Shamasastry p. 80 n. 2 lists Kalinga
   among diamond-mine locations, on the authority of the Sanskrit commentary. If a reviewer can
   identify which commentary and date it, `diamonds` could gain an ancient period — but only with that
   provenance nailed down. I refused to use it as it stands.
3. **Registry secondary sources not used.** `behera-2000`, `ray-2003`, `ray-2021` and
   `kulke-rothermund` are all in the registry and all plainly relevant to goods, but I could not open
   any of them to a page. Every claim here therefore rests on primary texts, public-domain colonial
   works and open-access Odisha government journals. A reviewer with these four books could
   probably upgrade `ivory` and `roman-amphorae` and add well-sourced entries for beads and for
   Southeast Asian trade.
4. **Which translations to name in the bibliography.** I cited `arthashastra`, `xuanzang-travels` and
   `ptolemy-geographia` with the translation named in each `source_ref.note` (Shamasastry, Beal 1884,
   McCrindle). For Ptolemy I went further and added `mccrindle-ptolemy-1927` as a separate source,
   because the diamond claims are the editors' commentary and not Ptolemy's words. If the project
   prefers consistency, Shamasastry and Beal should get their own source entries too.
5. **Beads, and Odisha's Southeast Asian connection.** OHRJ pp. 112–113 links Odishan material to Don
   Ta Phet in Thailand. That is the single most interesting untapped good in the sources I read, and it
   needs one more independent work before it can be entered.
6. **Sambalpur's administrative status.** Sambalpur was in the Central Provinces when the Imperial
   Gazetteer vol. XXII was compiled, and moved to Bihar & Orissa in 1905. Three entries (`diamonds`,
   `iron`, `tasar-silk`) lean on that district. The atlas should decide whether western Odisha is in
   scope; if not, those three need re-scoping to the coastal districts.
7. **Period gaps.** Six of the thirteen goods are tagged `british` only, because Hunter, Stirling and
   the Gazetteer are the only sources that give commodity-level detail with page numbers. The
   `somavamshi` and `gupta` periods carry no goods at all. That is an honest reflection of the
   sources, not of the trade, and it will look lopsided on a timeline.

## Validator

`npm run validate:data` output is in the session report. Expected warnings: `H6-source-resolves` for
`patra-2014-odisha-review-ports` and `mccrindle-ptolemy-1927`, which live in
`docs/research/new-sources-goods.json` until a human merges them into `src/data/sources.json`, plus
the pre-existing warnings for the inscriptions agent's two sources.
