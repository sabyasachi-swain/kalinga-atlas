# Triage: `additinal_sources_needs_review/kalinga_trade_network_1.json` (18 September 2026)

The owner supplied a **regenerated** `kalinga_trade_network_1.json` on 18 September.
A file of that name was among the four rejected on 16 September
(`docs/research/rejected-sources-2026-09-16.md`), but this is different content
under the same filename, so it was triaged on its own merits.

**Verdict: this batch is materially different from the rejected four. Its
citations resolve.** Nothing here is fabricated so far as citation-level checks
can establish. The other three files in that directory remain rejected.

## What was checked, and what was not

Checked: that each DOI and URL resolves, and that Crossref metadata matches the
claimed title, author, journal, volume and pages. Controls (two already-registered
DOIs) returned HTTP 200, so a failure would have been meaningful rather than a
local network artefact.

**Not checked: whether any of these papers supports any particular claim.**
That is still required before a single sentence is written from them. Citation
integrity is the floor, not the ceiling.

## Coverage against the 44-source registry

**Already registered — 2 of 12. Do not re-add.**

| File | Registry id | Basis |
|---|---|---|
| S4 — Tripati, *Indo-Arabian Stone Anchor of Manikapatna*, Current Science 120(7), 2021 | `tripati-2021-current-science` | Same paper |
| S5 — Tripati, *Geochemical provenance of an Indo-Arabian stone anchor*, Scientific Reports 12, 2022 | `tripati-2022-scientific-reports` | Exact DOI match, `10.1038/s41598-022-17910-9` |

Of the four print works listed separately, **K. S. Behera (ed.), *Maritime
Heritage of India*** is already registered as `behera-2000`. The file dates it
1999; the registry says 2000. Worth resolving before either is cited with a year.

**New — 10 online sources, 3 print works.**

## Verification results

| id | Source | Status |
|---|---|---|
| S1 | Tripati, *Early Maritime Activities of Orissa*, Man and Environment XXVII(1), 117–126, 2002 | Real paper. NIO repository URL sits behind an anti-bot challenge ("Making sure you're not a bot!"), so it cannot be fetched headlessly. **Needs a human browser.** |
| S2 | Tripati & Vora, *Maritime heritage in and around Chilika Lake*, Current Science 88(7), 1175–1181, 2005 | **Verified.** The file gives an academia.edu mirror; the publisher PDF is better provenance and resolves: `https://currentscience.ac.in/Volumes/88/07/1175.pdf` (4.5 MB, application/pdf). **Use the publisher URL.** |
| S3 | Tripati et al., *Khalkattapatna port*, Current Science 109(2), 372–376, 2015 | **Verified**, HTTP 200 at the publisher. |
| S6 | Behera, *Maritime Archaeology between the Rivers Mahanadi and Godavari*, PhD, Ravenshaw Univ., 2020 | **Verified**, Shodhganga landing page HTTP 200. |
| S7 | Mishra, *Buddhism and maritime networks in early medieval coastal Orissa*, PhD, JNU, 2005 | **Verified**, Shodhganga landing page HTTP 200. |
| S8 | Mishra, *Coastal Shrines of Odisha and Maritime Networks*, Ancient Asia 17, 2026 | **Verified**, full-text PDF HTTP 200. A 2026 volume is plausible — the current year — but confirm the issue is final, not in press. |
| S9 | *Trade and traders … early medieval Odisha*, Studies in People's History 6(2), 134–145, 2019 | **Verified via Crossref.** The direct DOI returns 403 — SAGE bot-blocking, *not* "DOI Not Found", which is what sank the rejected batch. Crossref also supplies the author the file could not name: **Bhairabi Prasad Sahu**. Likely paywalled. |
| S10 | Tripati et al., *A study of Traditional Boats and Navigational History of Odisha*, 2016 | **Weakest of the batch.** academia.edu mirror only; no publisher URL, no DOI, journal not named. Find the NIO repository record before registering. |
| S11 | Panda, *Maritime Culture and Heritage of Ancient Odisha*, Orissa Review, Nov 2020, 39–49 | **Verified**, HTTP 200, 480 KB PDF. (First attempt timed out; it resolves on retry — the Odisha government host is slow, not missing.) |
| S12 | *Odisha's ports and maritime trade*, Orissa Review, Nov 2014, 119–125 | **Verified**, HTTP 200, 40 KB PDF. Multiple uncredited contributors — establish authorship per article before citing. |

Print works with no free URL: Tripati, *Maritime Archaeology: Historical
Descriptions of the Seafarings of the Kalingas* (Kaveri Books, 2000);
A. P. Patnaik, *The Early Voyagers of the East* (Pratibha Prakashan, 2003); an
unnamed edited volume, *Early Maritime Contacts of Odisha*. All three are new.

## Why these look worth pursuing

They land on exactly the atlas's thin spots. `src/data/` currently has
Bhauma-Kara with 0 routes, Gajapati with 0 routes and 0 sites, and Kharavela and
Gupta with 0 goods. S7 (Buddhism and maritime networks, 5th–12th c.) and S8
(coastal shrines, 2nd c. BCE–12th c. CE) cover that window directly, and S6 is a
full maritime-archaeological survey of the Mahanadi–Godavari littoral — the
Kalinga core. S3 documents Khalkattapatna, already a port in the atlas.

## Recommended handling

1. Do not register anything yet. Registration is only useful alongside claim
   extraction, and that is researcher work.
2. When a researcher does take this: register with `approved_by_human: false`
   and a line each in `docs/research/flagged-sources.md`, per `CLAUDE.md`.
   **An agent must never flip `approved_by_human`.**
3. Prefer the publisher URL for S2 over the supplied academia.edu link.
4. Use the Crossref author for S9 rather than the file's placeholder.
5. Resolve the `behera-2000` / 1999 year discrepancy.
6. S1 needs a human to fetch the PDF past the anti-bot page.
7. S10 should not be registered on an academia.edu mirror alone.
