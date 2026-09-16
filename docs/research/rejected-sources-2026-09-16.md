# Rejected: `additinal_sources_needs_review/` (16 September 2026)

Four JSON files were supplied for possible import:
`boat_design.json`, `kalinga_trade_network_1.json`, `trade_contracts.json`,
`trade_routes_2.json` (about 114 KB, roughly 100 structured claims).

**Verdict: rejected in full. No entry from these files may enter `src/data/`
on their own authority.** The claims may be reused only as *leads* — topics
for a researcher to verify against a real, page-checkable source, citing that
source and never these files.

## Why: the citations are fabricated

Every citation in the four files was extracted programmatically (41 distinct
URLs) and tested. The pattern is unambiguous.

**Every deep locator fails. Only generic homepages resolve.**

| Cited locator | Result |
|---|---|
| All 7 DOIs (`10.1007/s11457-019-09245-6`, `10.1016/j.jas.2019.104945`, `10.1017/S0041977X00004601`, `10.1017/S0041977X00015678`, `10.1080/09546549.2014.963210`, `10.1163/9789004433006_004`, `10.1163/9789004433006_005`) | **404 — doi.org returns "Error: DOI Not Found"** |
| `asi.nic.in/uploads/manikpatna_excavation_report.pdf`, `.../sisupalgarh_excavation.pdf` | 404 |
| `ignca.gov.in/asi_reports/arkp_1978_79.pdf`, `.../odia_jibana_chautisa.pdf`, `.../odia_maritime_lexicon.pdf` | 404 |
| `archive.org/details/arecordofbuddhis00taka`, `buddhistrecordso00beal`, `chaujukua00hirt`, `ainiakbariofabul02abl` | 404 |
| `epigraphy.in/hatigumpha`, `tau.ac.il/geniza/`, both `odishatourism.gov.in` deep links | 404 |
| `asi.nic.in/`, `ctext.org/`, `perseus.tufts.edu/`, `soas.ac.uk/`, `efeo.fr/` | 200 (bare homepages only) |

**Control test, to prove the method and not the network was at fault:**
`10.1038/nature12373` → 200, `10.1017/S0041977X00141400` (same journal family
as one of the fabricated ids) → 200, `archive.org/details/periplusoferythr00schouoft`
→ 200, `archive.org/details/in.ernet.dli.2015.282619` → 200. Real identifiers
resolve from this machine; theirs do not exist.

A DOI is a registered permanent identifier. "DOI Not Found" means the article
was never assigned that DOI — it is not a broken link, a moved page or a
paywall.

## Corroborating signals

- **Uniform self-rated confidence.** 6/6 maritime routes, 13/13 commodities,
  7/7 timeline phases and 17/19 evidence items rate themselves ★★★ high.
  Genuine research produces a spread; uniform top confidence is a tell.
- **Hyper-specific unverifiable "sources".** Among 298 distinct source labels:
  "Sisupalgarh Seal No. 42", "Konark Wheel Panel 3", "Konark Wheel Panel 7 & 11",
  "Chilika Boat Survey 2018", "Odia Boatbuilder Glossary (Mohapatra 2010)",
  "Manikpatna Excavation 1997–2000 (Layer III)". Precise enough to look
  authoritative, specific enough to be uncheckable.
- **The files contradict each other.** `trade_routes_2.json` says the NE monsoon
  (Nov–Mar) carried outbound southbound voyages; `kalinga_trade_network_1.json`
  says the SW monsoon (Jun–Sep) did. Both rate ★★★.
- **Bare author-year citations.** Most non-URL sources are "Ray 1989",
  "Sahu 1990", "Mohanty & Smith 2008" with no page, chapter or section —
  already below this project's page-verified standard.
- **Internal inconsistencies**: Dantapura filed under `ancient_ports` while its
  own text says it was not a port; a segment rated ★★☆ whose status field reads
  "Strong Reconstruction"; a Visakhapatnam stop sourced to "GEOGRAPHY_ONLY".

## What this does not mean

Some underlying assertions are independently true and already in this repo with
real citations — Tamralipti as Tamluk, Rouletted Ware distribution, Kharavela's
Hathigumpha inscription. That a fabricated bibliography wraps a true statement
does not make the file a source. Anything wanted from here must be researched
from scratch and cited to a source a reader can open.

## If these leads are pursued

Treat each as an unsourced hypothesis. Promising, genuinely checkable ones:
Dantapura's identification, Chilika's Chandrabhaga landing, Islamic glazed ware
at Manikpatna, the Tang/Song ceramic horizon, and the Odia boat-building
vocabulary. Each needs a real excavation report or peer-reviewed article, quoted
with a page number, before any entry is written.

## Method note

The audit cost nothing beyond HTTP requests plus one free-tier OpenRouter call
(`inclusionai/ling-3.0-flash-vl:free`, $0.00) used only to inventory the files'
own structure and self-declared confidence — never as a source. The citation
testing was deterministic: extract every URL, request it, compare against
controls.
