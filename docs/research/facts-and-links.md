# Facts and links — research note

## Session 2026-09-15 · Agent: `researcher` · Scope: dangling `nanda-2019-*` source id, and port→goods links

Two tasks left over from the interrupted 2026-09-14 run. Nothing outside `src/data/sources.json`,
`src/data/ports.json`, `src/data/routes.json` (one ref), `src/data/facts.json` (one entry) and
`docs/research/` was touched.

---

## 1. The dangling `nanda-2019-*` source id — RESOLVED, the article exists

Two entries cited the same work under two ids, neither of which was defined anywhere:
`nanda-2019-odisha-review` (routes.json > `route-palur-sembiran-sea`, pp. 41-43) and
`nanda-2019-odisha-review-baliyatra` (facts.json > `fact-bali-jatra-paper-boats`, pp. 41-42). The
object definition was supposed to live in `docs/research/new-sources-facts.json`; that file was
never written, which is why the validator emitted two `H6-source-resolves` warnings.

### What the article actually is

> Nanda, R. K. "Kalinga Bali Yatra and the Maritime Trade of Odisha." *Odisha Review*
> (Information and Public Relations Department, Government of Odisha, Bhubaneswar),
> **November 2019, pp. 41-45**. ISSN 0970-8669.
> https://magazines.odisha.gov.in/Orissareview/2019/Nov/engpdf/41-45.pdf

Downloaded 2026-09-15 as a 5-page PDF and read in full. (The `magazines.odisha.gov.in` TLS
certificate is still expired, as the goods session recorded; `curl -k` works, WebFetch does not.)
The journal page numbers are printed in the running feet, so the PDF page → journal page mapping is
unambiguous: PDF 1 = p. 41 … PDF 5 = p. 45. The article is signed "Prof. R.K.Nanda"; the byline
carries no affiliation, and the file name on the government server is the pagination itself
(`2019/Nov/engpdf/41-45.pdf`).

### What I verified, page by page

| Journal page | Verified text |
|---|---|
| **41** | "Baliyatra or as it is popularly known as the **Boita Bandana Yatra** … This festival is held in the city of Cuttack at Gadagadia Ghata of the Mahanadi river. It is being celebrated to mark the day, when the ancient mariners named as **Sadhabas** … would go in sailing to distant lands like **Bali, Java** (known as "Yawadweepa"), **Sumatra, Borneo** (presently Indonesia), and **Sri Lanka** … from the day of **Kartika Purnima**". Also on p. 41: "recent archaeological explorations at Manikapatna, Palur, Radhanagar and Sishupalgarh". |
| **42** | "The people of Odisha gather near the banks of Mahanadi, Brahmani river, and in other river banks, ponds, water tanks and sea shores to **float miniature toy boats, made of coloured papers, dried banana tree barks, and cork**, as a symbol of their ancestors' sea journey to distant places. These handmade toy boats … contains with **Paan, Gua** (Betel leaf and betel nuts) and **a small oil lamps** … which are lit and placed inside them". And: "**The memory of these expeditions is kept alive in the festival of Boita Bandana**, where replicas of the sea faring boats of yore are set afloat in ponds and water bodies." |
| **43** | Kalinga's role in South East Asia; the 180-day / 14,000 km Cuttack-to-Bali sailing season. **No Sembiran material on this page** — the previous citation was wrong. |
| **44** | "The discovery of similar type of **roulette ware seen at Sembiran, located in north eastern Bali** and from the sites like **Shishupalagarh, Manikpatna, Tamluk** etc., of Odisha. It suggests deep ancient trade contacts between Odisha and the island of Bali." Also the 1992 INS *V-Samudra* voyage from Paradeep to Bali. |
| **45** | Six-item reading list (H. P. Ray 1989 and 2007; K. S. Behera, *Kalinga-Indonesian Cultural Relations*, OIMSEAS 2007; Benudhar Patra; S. Asthana 1976; M. N. Das 1949). No footnotes anywhere in the article. |

### What I changed

- **`src/data/sources.json`** — one new object, `nanda-2019-odisha-review`, `approved_by_human: true`,
  note beginning "approved under delegation 2026-09-14: Government of Odisha publication", followed
  by exactly what was read. `nanda-2019-odisha-review-baliyatra` was never created and does not exist.
- **`routes.json` > `route-palur-sembiran-sea`** — `page` corrected from `"pp. 41-43"` to
  `"pp. 41-42, 44"`; the note now records that the Sembiran passage is on **p. 44, not p. 43**.
  The route keeps all five sources and stays `Strongly Supported`.
- **`facts.json` > `fact-bali-jatra-paper-boats`** — `source_id` switched to the canonical id. Pages
  `pp. 41-42` were already correct and are confirmed. `caveats` rewritten to drop the obsolete "NOT
  YET APPROVED / defined in docs/research/new-sources-facts.json" sentence and to record instead
  that the author is a professor of management and the article is unfootnoted.

### The "paper boats" detail — confirmed, with one wording fix

p. 42 supports every element of the entry's `summary`: paper, banana bark, cork, betel leaf, a lit
lamp, and "as a symbol of their ancestors' sea journey". The only over-reach was the word
*families*: Nanda writes "the people of Odisha gather", and names "the women folk" as the singers,
not families. `text` therefore now reads "Every Kartika Purnima, **people in Odisha** float little
paper boats to remember ancestors who sailed to Bali and Java." The fact stays `Hypothetical` /
`traditional` / `draft` — one source, and festival lore.

### Still open on this source

1. Nanda gives **no evidence for the age of the festival**. Nothing in the article dates Bali Jatra
   earlier than the 1992 state-sponsored revival he describes on p. 44. The entry's
   `early-historic` period tag rests only on his assertion that Kalinga traded with Java and Bali
   then.
2. The article's own reading list points at **K. S. Behera, *Kalinga-Indonesian Cultural Relations*,
   OIMSEAS 2007** and **H. P. Ray, *JSEAS* XX(1), 1989, pp. 42-54**. Either would be a far better
   second source for the Bali link than Nanda, and `ray-2003` / `ray-2021` are already in the
   registry. Getting one of them would move the fact off a single popular-magazine citation.

---

## 2. Port → goods links (Scope B)

Rule applied: a good is listed on a port only when a source I could read **names that good and that
port together**. District- or region-level trade lists were not enough on their own; where I leaned
on one, the port's `caveats` now says so. Nothing else in `ports.json` was touched — only `goods`
and `caveats`. All 19 ports keep `status: "published"`, and no new source id was introduced into a
port, so H8 is unaffected.

| Port | goods | Source and page for the linkage |
|---|---|---|
| `manikapatna` | `chinese-ceramics`, `roman-amphorae`, `salt` | Ceramics: Tripati 2021 p. 1212 (Yuan/Ming porcelain); OHRJ pp. 111-112; Patnaik 2014 p. 105; Patra 2014 p. 120 — four works. Amphorae: OHRJ p. 111 "Roman rouletted pottery and fragments of amphora"; Patra 2014 p. 120. Salt: Patnaik 2014 p. 104 and Dayalan 2019 offprint p. 23, both reporting Abul Fazl (1595-96) on Manikapatna as the port where **salt tax** was collected — inferential, flagged in caveats. |
| `palur` | `roman-amphorae`, `chinese-ceramics` | OHRJ p. 109: Kantigarh exploration "unearthed fragments of the Chinese celadon ware, the Roman rouletted ware, **amphora pieces**"; Dayalan 2019 offprint pp. 20-21 repeats both. Celadon undated — flagged. |
| `khalkatapatna` | `chinese-ceramics` | Patra 2014 pp. 119-120; OHRJ p. 112 (celadon, blue-floral porcelain, two Chinese copper coins c. 14th c.); Patnaik 2014 p. 105. Three works, all naming the site. |
| `kalingapatnam` | `salt` | *Imperial Gazetteer of India* vol. IX, **p. 292**: "Calingapatam possesses one of the four salt factories of the District. The pans cover an area of 517 acres, and yielded a revenue in 1903-4 of Rs. 3,27,000." Read directly in the archive.org scan. |
| `pithunda` | — | Never located on the ground; no find, no commodity. |
| `puri` | — | O'Malley, *Puri* (1908) p. 15 describes the roadstead's season but names no commodity; the Imperial Gazetteer calls Puri "destitute alike of manufactures or commerce". |
| `cuttack` | `cotton-textiles`, `chinese-ceramics` | Cotton: Hunter vol. ii **p. 40** "the fine muslins of Cattack" and **p. 247** "the Cattack and Balasor muslins formed an important item in the yearly Investments". Ceramics: OHRJ p. 111, Barabati fort "a few sherds of Chinese ceramics" — undated and reported at second hand, flagged. |
| `balasore` | `rice`, `cowrie-shells`, `cotton-textiles` | Rice and cowries: O'Malley, *Balasore* (1907) **p. 144** "frequented chiefly by vessels from Madras, which put in for **cargoes of rice**, and by the Laccadive and Maldive islanders, from whom the **cowries** then used extensively for currency were obtained"; corroborated by Stirling 1825 p. 194 (Maldive vessels at "Balasore and Dhamra"). Cotton: Hunter vol. ii p. 247. |
| `pipli` | `salt` | O'Malley, *Balasore* (1907) **p. 204**, quoting Hamilton's *Hindostan* (1820): "they ship **9,000 tons of salt** annually from the port". |
| `hariharpur` | — | The gazetteer describes a factory house and a Mughal customs station, no commodity. |
| `chandbali` | `rice` | O'Malley, *Balasore* (1907) **p. 139**: "the **principal export is rice** … At Chandbali also it is a common practice for the exporters to send out agents among the villages, who purchase the crops before they are reaped … Rice is shipped oversea to Ceylon and Mauritius"; p. 144 makes Chandbali "the chief port of Orissa", through which nearly all the district's sea trade passed. District-level list — flagged in caveats. |
| `gopalpur` | `sal-timber`, `cotton-textiles` | *Imperial Gazetteer* vol. XII **p. 329**, Gopalpur entry: "The principal exports are grain and pulse, hides and skins, **sal timber**, hemp, coir manufactures, oilseeds, myrabolams, and dried fish; while the chief imports are sugar, **piece-goods**, apparel, jute manufactures, liquors, matches, kerosene oil, **cotton twist**, and metals." Read directly. |
| `tamralipti` | — | OHRJ p. 110 reports rouletted ware, a Ganga fanam and Roman gold coins — none of which is one of the 13 goods. |
| `calcutta` | `rice`, `cotton-textiles` | *Imperial Gazetteer* vol. XI **p. 92** (Cuttack District): "The chief exports are **rice to Calcutta**, Mauritius, and Ceylon … The chief imports are **piece-goods**, kerosene oil, crockery, glass-ware, fancy goods, metals, yarn, betel-nuts, and spices **from Calcutta**." Also Stirling p. 194 and *Balasore* p. 144. Cargo moving to and from Calcutta, not made there — flagged. |
| `arikamedu` | — | Only rouletted-ware resemblance. |
| `kaveripattinam` | — | Only rouletted ware and a shared overland circuit. |
| `anuradhapura` | — | Rouletted ware and a coin network; no commodity. |
| `sembiran` | — | Rouletted ware, an Arikamedu type-10 sherd and a Kharoshthi graffito; no commodity. |
| `rangoon` | — | *Imperial Gazetteer* vol. XII p. 152 lists the Ganjam ports' coastwise exports to a group of destinations including Rangoon (coir, grain and pulse, hides, oilseeds, railway sleepers, apparel, turmeric); none maps onto one of the 13 goods, and none is attributed to Rangoon specifically. |

### New reading done for this section

- *Imperial Gazetteer of India* vol. IX, archive.org `imperialgazettee09greauoft` — Calingapatam
  entry, pp. 291-292, read in full.
- *Imperial Gazetteer of India* vol. XI, `imperialgazettee11greauoft` — Cuttack District trade,
  p. 92, read in full.
- *Imperial Gazetteer of India* vol. XII, `imperialgazettee12greauoft` — Ganjam District trade,
  pp. 152-153, and the Gopalpur entry, pp. 329-330, read in full.
- O'Malley, *Bengal District Gazetteers: Balasore* (1907), archive.org
  `PARI.bengal-district-gazetteers-balasore` — trade chapter, pp. 139-140, and water
  communications, pp. 144-145, read in full. **p. 139 is a page the ports session did not cite**; it
  is the one that carries the commodity lists.

All of these are already registered as `imperial-gazetteer-india-1908`, `imperial-gazetteer-orissa`
and `district-gazetteers-odisha`, all `approved_by_human: true`. No new source was needed.

### Linkages I deliberately did NOT make

| Candidate | Why not |
|---|---|
| `ivory` → `palur` | Rests on B. Srivastava's identification of the Periplus's **Dosarene** as a janapada with Palur as its capital. Dosarene is an unidentified region (Patra 2014 p. 122 canvasses three rival placings and rejects all). Linking would assert the identification. |
| `iron` → `manikapatna` | OHRJ p. 112 lists an iron harpoon, spearhead, sickle, fishhooks, boat nails and **slag** at Manikapatna. That is iron being worked and used at the port, not iron as a traded commodity, which is what the `iron` entry documents. A reviewer may disagree; the reference is here. |
| `salt` → `balasore`, `chandbali` | O'Malley p. 139: "The largest imports are **salt, which is brought in large quantities from Madras**." The `salt` entry documents Odisha-made salt as an **export**; listing it here would invert the direction. Worth a separate import claim if the atlas wants one. |
| `sal-timber` → `balasore`, `chandbali` | O'Malley p. 139 lists "timber" among the district's exports but does not say sal. Gopalpur's entry does say "sal timber", which is why only Gopalpur carries it. |
| `rice`, `cotton-textiles`, `lac-and-beeswax`, `sal-timber` → `cuttack` | *Imperial Gazetteer* vol. XI p. 92 gives a full commodity list for **Cuttack District** and then names "Cuttack city, False Point port, and Chandbali" as the chief trade centres. Reading the district list onto the city is one inference too many; only the Hunter muslin passage names the place itself. |
| `rice` → `gopalpur`, `kalingapatnam` | *Imperial Gazetteer* vol. XII p. 152 says the district's foreign exports include "**rice to Colombo and Galle**" and that Gopalpur and Calingapatam are the two ports open to foreign trade — but neither port's own entry (vol. XII p. 329; vol. IX p. 291) lists rice, only "grain and pulse". Left out; noted in `gopalpur.caveats`. |
| `elephants` → any port | OHRJ p. 114's Brahmeswar temple frieze shows elephants on shipboard but names no port. |
| `cotton-textiles` → `pipli`, `puri` | Hunter vol. ii Appendix I p. 13 calls "Pipli and Bhubaneswar" seats of a trade in rice and cloth — but that Appendix is the **Puri district** one, so its "Pipli" is the applique town Pipili on the Cuttack-Puri road, **not** the Subarnarekha-mouth port in `ports.json`. Explicitly not used. |

### Open questions for the human reviewer

1. **Nine of nineteen ports have no goods at all**, and every linkage that exists sits in one of two
   buckets: excavated ceramics (early historic to medieval) or colonial customs lists (19th
   century). The whole Eastern Ganga and Gajapati commercial middle is empty except for Chinese
   ceramics. That is a true reflection of what has been read, not of the trade.
2. **False Point** is named by both the Imperial Gazetteer (vol. XI p. 92: "in 1903-4 the exports by
   sea from False Point port were 21 lakhs … practically the whole of this was foreign trade") and
   the Balasore gazetteer p. 139. It is the best-documented Odisha port still missing from
   `ports.json`.
3. **Direction conflicts.** `salt` is an export in `goods.json` but an import at Balasore from
   Madras; `cotton-textiles` is `both`, which absorbs Gopalpur's imported piece-goods, but a reader
   looking at Gopalpur will see "cotton cloth" without knowing which way it was going. The schema
   has no per-link direction. **Proposed schema change: make `Port.goods` an array of
   `{ good_id, direction?, source_refs[] }` rather than bare ids**, so a linkage can carry its own
   citation and direction instead of leaning on the port's `caveats`. Not made here — `schema.ts` is
   out of bounds for a research task.
4. **Barabati fort, Cuttack.** B. K. Sinha's excavation report (*UHRJ* V, 1994) would date the
   Chinese sherds and either justify or remove the `chinese-ceramics` link.
5. **Pipli's salt.** The Balasore gazetteer says silting had ruined Pipli by the early 18th century
   (p. 9), yet quotes Hamilton (1820) on 9,000 tons of salt shipped annually from the port (p. 204).
   Both statements are in the same book. The entry's `caveats` field is already at 598 of 600
   characters, so this contradiction could not be recorded there and is recorded here instead.

## 2026-09-15: Fact-check corrections to two published summaries

Scope: fix two factual errors a fact-check found in `summary` fields. Only `summary` and `caveats` changed. Both entries stay `published`, and no sources were added. Nothing under `src/content/` was touched, because editors are rewriting those narratives.

### `sisupalgarh` (`src/data/sites.json`)

- **Before:** "Sisupalgarh is a huge square fort near Bhubaneswar, with an earth wall more than a mile long on each side. Inside it people found pottery and coin-like clay seals copied from Roman coins."
- **After:** "Sisupalgarh is a big walled city near Bhubaneswar, with an earth wall and moat around more than a square kilometre of land. Inside, people found pottery and clay seals copied from Roman coins."
- **Checked:** I read the author's copy of Mohanty and Smith 2009 (`mohanty-smith-2009-sisupalgarh`, the UCLA PDF). On p. 47 the abstract says "the rampart that surrounds the urban core and encloses an area over one square km in size". The introduction says "a fortified Early Historic city … formally delineated by a rampart and moat enclosing over 1 km² of ancient habitation". **The article prints no side length anywhere** (I searched the full text for km, square, side and hectare). So the summary now gives the area as printed and no side length. Working one out (about 1 km, or two-thirds of a mile) would be my own inference.
- I also dropped "square" and "coin-like". Neither word appears in the two cited passages. "Walled city" rests on p. 47's "fortified Early Historic city".
- Added to `caveats`: "Mohanty and Smith p. 47 give the enclosed area as 'over 1 km2' and print no side length."
- Pottery and Roman-style clay seals: `patra-patra-ohrj-maritime-archaeology` p. 110 (unchanged, not re-read this session).

### `rice` (`src/data/goods.json`)

- **Before:** "Rice was Odisha's biggest crop and its biggest export. Small ships loaded it at the river mouths and carried it away to Calcutta."
- **After:** "A lot of rice was shipped from Odisha's small coastal ports to Calcutta. Inland in Sambalpur, rice was the main thing sent away to be sold."
- **Checked:**
  - *Stirling 1825*, *Asiatic Researches* XV, p. 194 (archive.org `asiaticresearche151825cal`, djvu text). It reads: "A considerable exportation of rice takes place from the several small ports along the coast to Calcutta." Rice does not appear in Stirling's list of exports "liable to duty", and he ranks nothing.
  - *Imperial Gazetteer of India*, new edition, vol. XXII, p. 13 (archive.org `imperialgazettee22greauoft`, running head "TRADE AND COMMUNICATIONS 13"). It reads: "Rice is the staple export of Sambalpur, being sent principally to Calcutta, but also to Bombay and Berar." That is a district-level statement about inland Sambalpur (1903-04), not about sea trade.
  - Hunter 1872 (vol. II App. I p. 13, "a considerable export rice trade") was not re-read this session.
- **Result:** none of the three cited works calls rice Odisha's biggest crop or biggest sea export. I removed both superlatives. The old "small ships … river mouths" wording also went, because Stirling says "small ports along the coast". "Main thing sent away to be sold" paraphrases "staple export" and is limited to Sambalpur.
- Added to `caveats`: no cited source ranks rice as the largest export; Stirling says "considerable"; the Gazetteer's "staple export" is for inland Sambalpur, not sea trade.

### Tier check (not changed)

- `sisupalgarh`, **Strongly Supported**: still holds. Two distinct works (OHRJ excavation synthesis; Mohanty and Smith fieldwork report) independently document the fortified excavated site. The area figure itself rests on Mohanty and Smith alone, and the Roman-style seals in the summary rest on OHRJ p. 110 alone.
- `rice`, **Strongly Supported**: holds for the corrected, narrower claim, with one weakness. The coastal-ports-to-Calcutta export rests directly on Stirling p. 194, and Hunter's Machhagaon "export rice trade" (not re-read) is the only second work for coastal export. The Gazetteer line is inland and dated 1903-04, past the 1900 cut-off. If a reviewer does not count Hunter's line, the coastal-export sentence would be `Probable` on its own.

### Open

- Re-read Hunter vol. II App. I p. 13 to confirm the Machhagaon quote that the rice tier leans on.
- Read B. B. Lal, *Ancient India* 5 (1949) if a side length for the Sisupalgarh rampart is wanted. Mohanty and Smith do not give one.
