# Worked examples

These are *shape* examples. The page references are placeholders that show the required precision; the researcher must replace them with what the source actually says.

## Accepted: a draft port with honest uncertainty

```json
{
  "id": "palur",
  "name": "Palur",
  "summary": "An old port near Chilika lake. Some scholars think it is the 'Palura' a Greek geographer wrote about.",
  "evidence_level": "Probable",
  "evidence_type": "scholarly",
  "source_refs": [
    { "source_id": "ray-2003", "page": "p. TODO", "note": "discussion of east-coast ports" }
  ],
  "periods": ["kharavela", "gupta"],
  "status": "draft",
  "caveats": "Identification of Ptolemy's Palura with modern Palur is a scholarly proposal, not an established fact. Do not tag Confirmed without an excavation report and a second independent source.",
  "coordinates": { "lat": 19.4, "lng": 85.1 },
  "coordinate_source": "district-gazetteers-odisha",
  "also_known_as": ["Palura (Ptolemy)"],
  "goods": []
}
```

Why it passes: one source → `Probable`; the identification debate lives in `caveats`; coordinates name their source; status is `draft`.

## Accepted: a research to-do

```json
{
  "id": "kalingapatnam",
  "name": "Kalingapatnam",
  "summary": "A river-mouth port on the Andhra coast that may have served Kalinga's southern trade.",
  "evidence_level": "UNVERIFIED",
  "evidence_type": "scholarly",
  "source_refs": [],
  "periods": ["gupta"],
  "status": "draft",
  "caveats": "Needs an excavation report or a gazetteer reference before any tier can be assigned.",
  "coordinates": { "lat": 18.33, "lng": 84.13 },
  "coordinate_source": "natural-earth"
}
```

Why it passes: `UNVERIFIED` drafts may have empty `source_refs`. It is a visible to-do, never a published claim.

## Rejected: tier upgrade

```json
{
  "id": "kalinga-bali-voyages",
  "name": "Voyages to Bali",
  "evidence_level": "Confirmed",
  "evidence_type": "traditional",
  "source_refs": [{ "source_id": "behera-2000", "page": "p. 12" }],
  "status": "reviewed"
}
```

Validator output: `H2-no-tier-upgrade: evidence_level "Confirmed" needs >= 2 distinct sources, found 1`. Also wrong in spirit: a `traditional` account (Bali Jatra memory) can be `Hypothetical` or, with corroborating archaeology, `Probable`. It is never `Confirmed` on its own.

## Rejected: invented precision

```json
{
  "id": "manikapatna",
  "summary": "Roman traders landed here in 42 CE with 300 amphorae of wine.",
  "evidence_level": "Probable",
  "source_refs": [{ "source_id": "asi-annual-reports" }]
}
```

Wrong because: the date and count are not in any report (invented precision, H1); the source ref has no page; "Roman traders landed" overstates what rouletted ware demonstrates (contact with a trade network, not Roman ships). Correct summary: "Pieces of pottery found here match pottery used around the Roman world. That shows traders here were linked to faraway markets."
