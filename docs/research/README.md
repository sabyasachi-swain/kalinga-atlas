# Research notes

One file per research session or topic, written by the **researcher** agent:

```
docs/research/<topic>.md          e.g. ports-gupta-period.md, goods-periplus.md
docs/research/flagged-sources.md  sources outside the registry awaiting human approval
docs/research/fact-check-log.md   editor's per-file fact-check record
```

Each topic note records: scope, sources consulted (with what was actually seen: page, scan, listing), entries created or changed, open questions, and the validator summary.

## Human review workflow

1. Read the note and the new `draft` entries in `src/data/`.
2. For a flagged source, confirm it is peer-reviewed / government-published, then set `approved_by_human: true` in `sources.json`.
3. For an entry you accept, change `status` to `reviewed` (visible in local preview with `PUBLIC_SHOW_DRAFTS=true`) or `published`.
4. Run `npm run validate:data`. It fails if a published entry cites an unapproved source.

## Review delegation, 14 September 2026

The project owner asked for the site to be completed without their review. Under that delegation, the orchestrating session approves sources the researcher verified as peer-reviewed or government/university-published (marked in `sources.json` with a note beginning `approved under delegation`) and publishes entries that pass the validator. `UNVERIFIED` entries stay `draft` and never render. Every decision stays listed in `flagged-sources.md` for a later human audit.
