---
name: add-entry
description: Research and add one historical data entry (port, route, good, site, inscription, fact) to src/data/ with citations and evidence tier, then validate it. Use for "add Manikapatna", "add the pepper trade", etc.
arguments: [type, name]
argument-hint: <port|route|good|site|inscription|fact> <name>
---

# /add-entry $type "$name"

Delegate to the **researcher** agent (it runs on Opus by default; do not downgrade). One entry per run.

## Brief for the researcher

```
Create ONE entry of type "$type" for "$name" in src/data/${type}s.json (use the correct plural file:
ports, routes, goods, sites, inscriptions, facts).

Follow the historical-sourcing skill exactly:
- Locate at least one registry source with a page/section reference. Two distinct sources if you intend
  Strongly Supported or Confirmed; otherwise tier Probable or Hypothetical.
- If no registry source supports it, create the entry with evidence_level "UNVERIFIED", status "draft",
  empty source_refs, and explain in `caveats` what evidence would be needed.
- Sources outside the registry: add to sources.json with approved_by_human:false and log in
  docs/research/flagged-sources.md.
- Coordinates (ports, sites): from a gazetteer or report; set coordinate_source.
- summary: two short sentences a 10-year-old can read.
- status: "draft" always.
- Log what you checked in docs/research/<slug>.md.
- Finish by running `npm run validate:data` and include its output.
```

## After the agent returns

1. Run `npm run validate:data` yourself and confirm 0 errors.
2. Show the user the new entry (cat the JSON object) and the validator's draft warnings for it.
3. Tell the user: "Review it, then change `status` to `reviewed` or `published` in the file if you accept it."
