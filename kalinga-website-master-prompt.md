# Master Prompt: "Kalinga — Ancient Trade Routes" Interactive Atlas

> **How to use this document.** This is the single source of truth for *what* we are building and *why*. Day-to-day rules for Claude Code live in `CLAUDE.md`; the sub-agent prompts live in `.claude/agents/`; the source registry, design tokens and engineering patterns live in `.claude/skills/`. If those files and this document disagree, fix the disagreement here first.

---

## 1. Project Identity

| | |
|---|---|
| **Name** | Kalinga: Ancient Trade Routes |
| **Type** | Interactive digital museum and historical atlas (static site, single interactive centrepiece) |
| **Tagline** | Explore how Odisha connected with the world across two millennia, port by port, route by route, century by century. |
| **Scope** | c. 300 BCE to 1900 CE. Kalinga = the historical region covering modern Odisha and parts of northern Andhra Pradesh, as used in Ashokan inscriptions and classical texts. Boundaries are drawn per period on the map. |

---

## 2. Goal and Objectives

**Goal.** A premium, fully interactive website that shows how ancient Kalinga traded with India and the wider Indian Ocean world by sea, coast, river and land, presented as an immersive museum experience rather than an article.

**Objectives.**

1. **Interactive map + timeline as the centrepiece.** Users switch periods and explore ports, routes, goods, archaeological sites, inscriptions, ships and destinations across India, Sri Lanka, Southeast Asia and the Indian Ocean.
2. **Child-friendly first layer.** A 10-year-old understands the screen within 30 seconds and wants to keep exploring: animation, storytelling micro-interactions, simple-first progressive disclosure.
3. **Scholarly integrity.** Every claim carries an inline citation and an evidence-level badge. Archaeological evidence, scholarly interpretation and traditional accounts are always visually distinct.
4. **Sections.** Trade Routes · Ancient Ports · Goods & Commodities · Archaeological Evidence · Sources & Bibliography · Explore the Timeline.
5. **Zero legal risk.** Open-licence assets only, attributed academic sources, original illustrations.

---

## 3. Constraints (non-negotiable)

| # | Constraint | Why |
|---|---|---|
| C1 | **Citable sources only.** Peer-reviewed or government-published: ASI reports, *Epigraphia Indica*, ICHR publications, university-press monographs, peer-reviewed journals (e.g. *Journal of the Economic and Social History of the Orient*, *South Asian Studies*), Odisha State Museum records, inscriptional corpora. **Not acceptable:** Wikipedia as a primary source, blogs, AI-generated "history", unverifiable oral claims presented as fact. | Legal safety and credibility. |
| C2 | **Evidence-level tag on every claim.** `Confirmed` (direct archaeological/epigraphic evidence) · `Strongly Supported` (multiple corroborating sources) · `Probable` (single credible source or strong inference) · `Hypothetical` (scholarly conjecture, traditional account, extrapolation). | Stops hallucination being presented as history. |
| C3 | **Evidence type on every claim.** `archaeological` · `scholarly` · `traditional`. Each has a distinct visual treatment (colour + icon + label, never colour alone). | Intellectual honesty. |
| C4 | **Open-licence assets only.** Map data: Natural Earth (public domain). Fonts: SIL OFL. Icons/images: original, CC0, CC-BY, CC-BY-SA, or public domain. No proprietary map APIs or tiles. No copyrighted museum photographs without written clearance. | Zero legal exposure. |
| C5 | **No fabricated artefacts.** Any illustration that is a reconstruction is labelled "Artistic reconstruction — not a historical document." | Prevents misrepresentation. |
| C6 | **Accessible.** WCAG 2.1 AA. Keyboard-navigable map and timeline. Alt text or an equivalent description for every visual. Colour-blind-safe palette. | Inclusivity and compliance. |
| C7 | **Fast.** First Contentful Paint < 2 s on 4G. Initial page weight < 1.5 MB. Lighthouse ≥ 90 in all four categories. Heavy layers lazy-load. | Mobile users in India are the primary audience. |
| C8 | **Responsive.** 360 px to 1440 px+. | |

---

## 4. Hallucination Prevention Protocol

The most important section. Every rule is enforced twice: by the agents' instructions and, where possible, by `scripts/validate-data.ts` at build time.

| # | Rule | Enforced by |
|---|---|---|
| H1 | Never invent a port, route, inscription, date, coordinate or artefact. No traceable published source → it does not exist on the site. | Agents + validator (`source_refs` non-empty) |
| H2 | Never upgrade evidence tiers. One source → `Probable` at best. `Confirmed` and `Strongly Supported` require ≥ 2 distinct sources. | Validator |
| H3 | Never merge distinct entities. Tamralipti (Bengal) ≠ Palur (Odisha). Every entity has one stable `id`. | Agents + validator (unique ids) |
| H4 | Never extrapolate goods or routes across periods without explicit source support. Each entry lists only the `periods` its sources support. | Agents + validator (periods must exist) |
| H5 | When uncertain, say so. `evidence_level: "UNVERIFIED"` is always better than a plausible fabrication. `UNVERIFIED` entries never reach `status: published`. | Validator |
| H6 | Every entry has `source_refs` pointing to an entry in `sources.json` with a page or section. Unresolved source ids fail the build. | Validator |
| H7 | Human review gate. Entries move `draft → reviewed → published` only by a human. Only `published` entries render. | Validator + engineer rule |
| H8 | Sources not in the registry (§8) are flagged in `docs/research/flagged-sources.md` for human review before use. | Researcher agent |

---

## 5. Assumptions

| # | Assumption | Fallback if wrong |
|---|---|---|
| A1 | Primary audience: Indian students aged 10–18 and history enthusiasts. | Add a "Scholar mode" toggle that exposes full citations and technical terms. |
| A2 | Static deployment (Vercel, Netlify, GitHub Pages). No server, no database. | All data ships as JSON/TopoJSON at build time. |
| A3 | Scope ends at 1900 CE. | Data model supports any date range; extending is a data task, not a code task. |
| A4 | English first; Odia is Phase 2. | UI strings live in one file from day one; Noto Sans Oriya is reserved in the type stack. |
| A5 | Period-accurate coastlines are approximations from published scholarship, not GPS. | Label "Approximate reconstruction" and cite the paper used. |

---

## 6. Data Model

All historical content is data, not prose in components. Files live in `src/data/`, validated by the Zod schema in `src/data/schema.ts`.

**Entity types:** `source` · `period` · `port` · `route` · `good` · `site` (archaeological) · `inscription` · `fact` ("Did you know?").

**Every entity except `source` and `period` extends `Claim`:**

```ts
{
  id: string;                       // kebab-case, stable, unique across all files
  name: string;
  summary: string;                  // ≤ 2 sentences, FK grade ≤ 7
  evidence_level: "Confirmed" | "Strongly Supported" | "Probable" | "Hypothetical" | "UNVERIFIED";
  evidence_type:  "archaeological" | "scholarly" | "traditional";
  source_refs: { source_id: string; page?: string; note?: string }[];   // min 1
  periods: string[];                // ids from periods.json
  status: "draft" | "reviewed" | "published";
}
```

**Type-specific fields.** `port`/`site`: `coordinates {lat,lng}`, `coordinate_source` (a `source_id`), `modern_name`. `route`: `mode` (`maritime|coastal|river|land`), `waypoints` (lat/lng list), `from`, `to`, `goods` (good ids). `good`: `category`, `direction` (`export|import|both`), `kid_line` (one fun sentence). `inscription`: `location`, `language`, `script`, `date_text`. `fact`: `text`, `related_ids`.

**Sources** (`sources.json`) use CSL-JSON so the bibliography page and BibTeX export come for free.

---

## 7. Periods

Canonical period ids used across all data. Ranges are approximate and are themselves entries in `periods.json` with `status: draft` until the Researcher confirms them against Kulke & Rothermund or an equivalent source.

| id | Label | Approximate range |
|---|---|---|
| `mauryan` | Mauryan Kalinga | c. 300–185 BCE |
| `kharavela` | Kharavela / Mahameghavahana | c. 1st century BCE |
| `gupta` | Gupta and post-Gupta | c. 300–600 CE |
| `bhauma-kara` | Bhauma-Kara | c. 700–950 CE |
| `somavamshi` | Somavamshi | c. 900–1100 CE |
| `eastern-ganga` | Eastern Ganga | c. 1078–1434 CE |
| `gajapati` | Gajapati | c. 1434–1541 CE |
| `mughal-maratha` | Mughal and Maratha rule | c. 1568–1803 CE |
| `british` | British colonial | 1803–1900 CE |

---

## 8. Authentic Source Registry

Content agents cite from these categories only. The machine-readable version is `.claude/skills/historical-sourcing/registry.md` and the bibliographic entries are seeded in `src/data/sources.json`.

**Primary (epigraphic / textual).** Ashokan Rock Edicts (Separate Edicts at Dhauli and Jaugada) · Hathigumpha Inscription of Kharavela (Udayagiri) · *Epigraphia Indica* (ASI, various volumes) · *Periplus of the Erythraean Sea* (Casson translation, 1989) · Ptolemy, *Geographia* (Palura, Dosarene references) · Kautilya, *Arthashastra* (trade and port regulation) · Jataka tales (maritime voyages) · Xuanzang's travel account (7th c. CE) · Yijing's account (7th c. CE).

**Secondary (academic).** K.S. Behera, *Maritime Heritage of India* (Aryan Books, 2000) · K.S. Behera, "Rebirth of a Maritime State", *Orissa Review* · Kulke & Rothermund, *A History of India* (Routledge) · H.P. Ray, *The Archaeology of Seafaring in Ancient South Asia* (Cambridge, 2003) · H.P. Ray, *Coastal Shrines and Transnational Maritime Networks across India and Southeast Asia* (Routledge, 2021) · B.K. Rath and N.K. Sahu on Odisha maritime history · *Proceedings of the Indian History Congress* · ASI Annual Reports and excavation reports (Sisupalgarh, Manikapatna, Palur, Radhanagar).

**Archaeological site reports.** Manikapatna (rouletted ware, beads) · Sisupalgarh (ASI / Deccan College) · Jaugada, Palur, Kalingapatnam · Tamluk/Tamralipti (comparative only).

**Early modern and colonial (1500–1900).** M.A. Haque, *Muslim Administration in Orissa 1568–1751* (1980) · B.C. Ray, *Orissa under the Mughals* (1981) · K.M. Patra, *Orissa under the East India Company* (1971) · H.K. Mahtab, *History of Orissa* · W.W. Hunter, *Orissa* (1872, public domain) · Andrew Stirling, "An Account ... of Orissa Proper or Cuttack", *Asiatic Researches* XV (1825, public domain) · *Imperial Gazetteer of India*, Orissa volumes (public domain) · British-era District Gazetteers (Cuttack, Puri, Ganjam, Balasore) · Published extracts of East India Company factory records · Odisha State Archives (published extracts only).

**Maps and geospatial.** Natural Earth (public domain) · Historical coastline reconstructions (cite the geological paper) · Rennell, *Map of Hindoostan* (1782, public domain) · 19th-century Admiralty charts where reproduced in published works.

> **Rule.** A source not on this list, or not of equivalent calibre, is flagged for human review before inclusion (H8).

---

## 9. Aesthetic Direction

- **Inspiration.** Ancient nautical charts, Odisha palm-leaf manuscripts (pothi / pattachitra line work), stone inscription rubbings, temple frieze line art, museum exhibit lighting.
- **Palette.** Deep ocean navy, aged parchment cream, laterite red-brown, verdigris green, gold-foil accent. Explicitly *not* the generic "warm cream + terracotta" default. Exact tokens: `src/styles/tokens.css`.
- **Typography.** EB Garamond (headings, historicity) · Source Sans 3 (body, humanist) · Noto Sans Oriya (reserved for Odia). All SIL OFL.
- **Map.** Dark navy sea, parchment-toned land, luminous animated route lines, ports as glowing waypoints. Period switches feel like turning a manuscript page.
- **Tone.** "You are walking through a living museum." Reverential but inviting, never textbook-dry.

---

## 10. Interaction Design (kid-friendly)

1. **Ship sails the route** when a route is selected, cargo icons trailing behind.
2. **"What's in the ship?"** Tap the ship for an illustrated cargo manifest with one fun line per good (from `good.kid_line`).
3. **Timeline slider** along the bottom. Drag to watch ports light up and fade across centuries.
4. **"Did you know?"** tooltips from `facts.json`, each sourced and badged.
5. **Progressive disclosure.** Map + glowing dots → tap a dot for a port card (image, summary, badge) → "Learn more" for the full panel with citations.
6. **Treasure-hunt mode** (optional, Phase 2). "Can you find the port that traded diamonds?"

---

## 11. Stack and Architecture

| Layer | Choice | Why |
|---|---|---|
| Framework | **Astro 5** with **React islands**, TypeScript strict | Content pages ship zero JS; only the map and timeline hydrate. Best path to Lighthouse ≥ 90 on 4G. |
| Map | **D3-geo v7** rendering **Natural Earth 50m** vectors (TopoJSON in `public/geo/`) | No tile server, no tile licence, fully stylable nautical-chart look, easy to make keyboard-accessible. Land drawn to Canvas; routes and ports as SVG so they can receive focus. |
| Timeline | D3 scales + a custom `<input type="range">`-backed slider | Native keyboard and screen-reader semantics for free. |
| Data | JSON + TopoJSON validated by **Zod** at build time | See §6. |
| Styling | CSS custom properties, no runtime CSS-in-JS | Tokens are shared by Astro and React. |
| Fonts | Self-hosted OFL fonts with `font-display: swap` | Performance and privacy. |
| Hosting | Static (Vercel / Netlify / GitHub Pages) | A2. |

Architecture diagram and folder layout: `docs/ARCHITECTURE.md`.

---

## 12. Build Phases

| Phase | Owner (agent) | Outputs | Gate to next phase |
|---|---|---|---|
| 1 Research & Data | `researcher` | `sources.json`, populated `src/data/*.json`, `docs/research/` notes | `npm run validate:data` passes; human moves entries to `reviewed` |
| 2 Design | `designer` | `tokens.css`, component specs, SVG illustrations in `src/assets/` | Contrast check passes; every SVG carries title, description, licence |
| 3 Build | `engineer` | Map island, timeline island, section pages, badges, popovers | `npm run build` passes; all sections render |
| 4 Content & QA | `editor` | Copy in `src/content/`, fact-check log | `npm run readability` passes; zero `[NEEDS VERIFICATION]` in published copy |
| 5 Launch | `qa-auditor` + human | Audit reports in `docs/audits/`, deploy | Lighthouse ≥ 90 ×4; zero serious/critical axe issues |

---

## 13. Claude Code Workflow

The **orchestrator is the main Claude Code session**. It never writes historical content itself; it delegates and checks gates.

| Piece | Location | Purpose |
|---|---|---|
| Agents | `.claude/agents/` | `researcher` (opus) · `designer` (sonnet) · `engineer` (sonnet, opus for map/timeline core) · `editor` (sonnet) · `qa-auditor` (haiku) |
| Reference skills (preloaded into agents) | `.claude/skills/` | `historical-sourcing` · `design-system` · `atlas-engineering` |
| Command skills | `.claude/skills/` | `/phase <name>` · `/add-entry <type> <name>` · `/validate-data` · `/fact-check <path>` · `/audit` |
| Path-scoped rules | `.claude/rules/` | `data.md` · `ui.md` · `content.md` |

**Model routing.** The model tier follows the cost of being wrong. Anything that can put a false claim on the site (sourcing, tiering, fact-checking) runs on Opus. Bounded creative and implementation work runs on Sonnet. Validators, audits and report summaries run on Haiku. `/phase` is the only place delegation decisions are made.

**Handoffs.**

| From → To | Artefact | Gate |
|---|---|---|
| orchestrator → researcher | Scope for the period or entity type | — |
| researcher → designer / engineer | Validated `src/data/*.json` | `validate-data` passes |
| designer → engineer | `tokens.css`, component specs, SVGs | Contrast + licence check |
| engineer → editor | Working preview | Build passes, sections render |
| editor → qa-auditor | Published copy | Readability passes, no unverified claims |
| qa-auditor → orchestrator | Audit report | Lighthouse ≥ 90 ×4, no serious axe issues |

---

## 14. Legal Safety Checklist

- [ ] Map data: Natural Earth (public domain), attributed in footer.
- [ ] Fonts: SIL OFL, licence files shipped.
- [ ] Icons and illustrations: original (CC-BY-SA) or CC0/CC-BY, listed on the attribution page.
- [ ] Images: original, CC-licensed or public domain, individually attributed.
- [ ] No copyrighted museum photographs without written permission.
- [ ] No proprietary map APIs or styles.
- [ ] Every historical claim cites a published source.
- [ ] No AI-generated imagery presented as a historical artefact.
- [ ] MIT licence in repository root.
- [ ] No cookies, tracking or consent-requiring analytics.
- [ ] No personal data collected.

---

## 15. Success Metrics

| Metric | Target |
|---|---|
| A 10-year-old can name 3 Kalinga ports after 5 minutes | Yes (user test) |
| Visible claims with a source popover | 100 % |
| `published` entries with empty `source_refs` | 0 (build fails otherwise) |
| Lighthouse performance / accessibility / best practices / SEO | ≥ 90 each |
| Initial page weight | < 1.5 MB |
| Time to Interactive on 4G | < 3 s |
| Public copy reading level | Flesch-Kincaid grade ≤ 7 |

---

*Living document. Update §6, §7 and §8 as research progresses, then propagate changes to `CLAUDE.md` and the skills.*
