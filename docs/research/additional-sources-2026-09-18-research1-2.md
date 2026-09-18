# Triage: `18thSep_research1.md` and `18thSep_research2.md` (18 September 2026)

Two more owner-supplied research files, triaged the same way as
`additional-sources-2026-09-18.md`. Nothing has been registered or written to
`src/data/`.

**Verdict.** Neither file is a source; both are secondary syntheses written by
AI. **research1** is careful: its confidence tags mostly match the atlas's own
caution, and it gets the Kharavela "navy" point right. **research2** is weak: it
rates everything "High", and several claims are pinned to sources that do not
contain them. Most of what they say about Manikapatna, Khalkatapatna,
Sisupalgarh and Golbai is **already published** and sourced. What is worth
keeping is a handful of new sources and one new body of evidence, the Palur
excavation of 2023–25.

## What was checked, and what was not

Checked: every URL (29 unique), the Crossref metadata for the one DOI, the full
article text of the Times of India and OdishaTV pieces, and the open-access text
of the Nature anchor paper (PMC9363498). Each claim was compared against the
published entries in `src/data/`.

Not checked: any claim against a source the fetch could not reach (see below).

## URL results

| Result | URLs |
|---|---|
| **200, content confirmed** | Times of India, 1 Aug 2026 (Diana Sahu, Palur); OdishaTV (Palur); Nature / PMC anchor paper; archive.org Salihundam report; archive.org Schoff Periplus; topostext Periplus; NTU Kalinganagara pages ×2 |
| **200, but a bot wall ("Just a moment…")** | academia.edu ×3; Buddhistdoor. The status code only proves the page exists; the content was not read. |
| **403, bot-blocked** | ResearchGate ×4; tandfonline (DOI verified via Crossref instead) |
| **Host broken, not missing** | All 6 `magazines.odisha.gov.in` links. The server presents an **expired TLS certificate** (`SEC_E_CERT_EXPIRED`) and port 80 does not answer. This is the government host's problem. The earlier triage reached it, so retry later. |
| **522** | wisdomlib Barua text |

## Sources: registry coverage

**Already registered. Do not re-add.** `patra-2014-odisha-review-ports`
(Ports in Ancient Odisha, Nov 2014), `patra-patra-ohrj-maritime-archaeology`,
`patnaik-2014-radhanagar` (Dec 2014), `tripati-2022-scientific-reports`,
`pradhan-mohanty-mishra-2000`, `hathigumpha-inscription`,
`sircar-select-inscriptions-1`, `asi-annual-reports` (IAR 1984–85),
`periplus-casson-1989` (research1 cites Schoff 1912 instead, an alternative
translation), `ptolemy-geographia`, `xuanzang-travels`.

**Already triaged this morning.** Tripati et al. 2015, *Khalkattapatna port*
(S3); Tripati & Vora 2005, *Chilika* (S2; use the publisher PDF).

**New candidates, in priority order:**

| # | Source | Status | Why it matters |
|---|---|---|---|
| N1 | Smith & Mohanty, "Deurbanization as lateral stratigraphy: three thousand years of settlement relocation at Sisupalgarh/Bhubaneswar", *World Archaeology* 57(1), 14–25, 2025, DOI `10.1080/00438243.2025.2604285` | **Verified via Crossref.** Open access, CC BY-NC-ND. | Peer-reviewed chronology for a published site. |
| N2 | Diana Sahu, "Digging at Palur reveals thriving maritime hub from pre-Mauryan era", *Times of India*, 1 Aug 2026 | **Verified; full text read.** | The only report of the OIMSEAS–ASI 2023–25 Palur excavation. It is a newspaper account of a conference talk, not an excavation report. |
| N3 | Subrahmanyam, *Salihundam: A Buddhist Site in Andhra Pradesh* (ASI) | **Verified**, full text on archive.org | A primary excavation report. Salihundam is not in the atlas. |
| N4 | Baums 2020 re-reading of the Manikapatna Kharoshthi sherd | **No citation given.** Probably the Baums & Glass *Catalog of Gāndhārī Texts*; must be located. | If real, it undercuts the published reading (see conflicts). |
| N5 | Tripati et al., "Stone anchors along the coast of Chilika Lake" (ResearchGate 27667806) | Bot-blocked. Find the NIO repository or publisher record. | Chilika anchorages and the Kanas anchors. |
| N6 | "Maritime Trade Contacts of Odisha with the Roman World: An Appraisal" (ResearchGate 285009602) | Bot-blocked. **Author and venue unknown.** | Roman contact, currently thin. |
| N7 | Mahalik, "Maritime Trade of Ancient Orissa", *Orissa Review*, Sept 2004 | Host down. | Minor coastal points (Sonapur, Barua). |
| N8 | "Jaugada: An Early Historical Fort Town", *Orissa Review*, Jan 2007 | Host down. | A published site. |
| N9 | "Kalinga and Siam", *Odisha Review*, Apr 2017 | Host down. | Southeast Asia links. |
| N10 | K. C. Dash, "Maritime Trade and Odisha", *Orissa Review*, Nov 2011 | academia.edu mirror only. Find the magazines.odisha.gov.in copy. | General. |

**Do not register.** Wikipedia (Hathigumpha), wisdomlib compilation (tertiary),
the UCLA staff page (not a publication), OdishaTV (a rewrite of N2 that credits
the Times of India, so it is **not an independent second source**), and
Buddhistdoor unless a human can read it. The *New Indian Express*, 13 Jan 2024,
has no URL. Nigam 1993 and Behera 1994 have no full reference.

## Genuinely new evidence: Palur 2023–25 (N2)

The published `palur` entry is `early-historic` only, and its caveats say no
excavation report was read. The Times of India article reports:

- a nine-layer, roughly 3 m sequence running "from the pre-Mauryan period through
  the Early Historic and Early Medieval phases";
- NBPW, knobbed ware, deluxe red polished ware, chocolate-slipped ware and black
  polished ware;
- red polished ware fired at 950–1,000 °C, with lab work pending at the ASI and
  IIT Mumbai;
- 363 graffiti-marked sherds;
- beads of carnelian, agate, jasper, quartz and faience, plus glass bangles,
  ivory and shell;
- net sinkers, fish bones, cowries and conch;
- 66 Early Historic sites in the surrounding landscape;
- that the findings "lend strong support" to Palur = Ptolemy's Paloura.

This is one news source, and Sunil Patnaik is its only named voice, so it
supports **Probable** at most. It could justify widening Palur's periods and
softening the "Gerini's proposal, not proved" caveat, but only as "reported, full
report awaited". It does **not** mention celadon, amphorae or a Buddhist stupa.

## Conflicts with published data, and errors in the files

**research1**

1. *"Nagarjunakonda inscription … names Palur as a maritime emporium."*
   **Wrong.** The published `nagarjunakonda-bodhisiri-inscription` records that
   the name is damaged. Vogel writes only that "it is tempting to restore the name
   as Palura" (EI XX, p. 8). Keep the atlas's reading.
2. *"Smith & Mohanty 2016, World Archaeology, p. 684"* (the date of the Sisupalgarh
   rampart). **No such paper in Crossref.** The only Smith & Mohanty paper in
   *World Archaeology* is N1 (2025, pp. 14–25). Treat the citation as garbled.
3. The Sisupalgarh population quote, "twice as much as … Athens which had just
   10,000 people". The comparison with Athens is historically dubious. **Do not use it.**
4. *Kuki copper plate (840 CE) naming "Kling" potters; Tugu inscription's
   Chandrabhaga.* No source is given. Linking Tugu's Candrabhaga to Odisha's
   river is speculative.
5. *A Konark giraffe relief as evidence of African contact.* A popular claim with
   no source. Leave it out.
6. *The Bhauma-Kara "Samudrakarabandha" ocean tax.* Unsourced here, but worth
   chasing: Bhauma-Kara has 0 routes in the atlas.
7. *Kanas hero-stones and a 7th-century naval battle; a 10th-century text on
   ships leaving Chilika.* Unsourced specifics. N5 or S2 may cover them.
8. The Kharavela "navy" point is **correct**, and the atlas already agrees: no
   entry or narrative claims a navy.

**research2**

1. **Misattributed.** Roman amphorae and Chinese celadon at Palur are credited to
   "Diana Sahu 2026". That article mentions neither. The atlas's Palur celadon and
   amphora finds come from older Kantigarh exploration, via Patra & Patra.
2. **Misattributed.** Claims that the Brahmanda Purana calls Chilika a port and
   that "12th-c. Odia temple inscriptions" record maritime commerce are credited to
   Dash 2011 and Raymond Lam 2024. Lam's piece is about a stupa. Unverified.
3. **Factual errors.** Knobbed ware is not "Greek-influenced". The anchor is dated
   only "medieval" by its paper, not "13th–15th c.". Palur's "6th c. BCE – 13th c.
   CE" appears nowhere in N2. The Chinese coins are 14th c., not "7th–14th c.".
   Xuanzang's Che-li-ta-lo is not placed "on the Mahanadi" in the edition the
   atlas cites.
4. Goods such as "likely spices and textiles" and "carpets, dates" are
   speculation, with no sources.
5. **Correct, and already published.** The Manikapatna coin list (Puri-Kushan,
   Rajaraja Chola, Sahassamalla, 14th-c. Chinese, Yuan–Ming porcelain) matches
   Tripati 2022 exactly and is already in `ports.json` and `facts.json`.

## A published entry at risk

`manikapatna-kharoshthi-potsherd` and `fact-manikapatna-kharoshthi-sherd` give
B. N. Mukherjee's reading ("Dasatradeva", "Khida"). research1 says Baums (2020)
re-read the sherd and wrote that "the meaning of the inscription eludes us". If
that is confirmed, the caveat should say so. **Locating N4 is the most useful
single follow-up.**

## Recommended handling

1. Register nothing yet. Registration belongs with claim extraction, which is
   researcher work, with `approved_by_human: false` and a line in
   `flagged-sources.md`.
2. Researcher, in priority order: (a) locate Baums 2020 and check the Kharoshthi
   entries; (b) take N2 into a Palur update at Probable, flagged "press report of a
   conference talk"; (c) read N1 for Sisupalgarh; (d) read N3 for a possible
   Salihundam site entry.
3. Retry the `magazines.odisha.gov.in` links once the host renews its certificate.
4. Discard research2's summary claims. Use only its source list, all of which is
   covered above.
