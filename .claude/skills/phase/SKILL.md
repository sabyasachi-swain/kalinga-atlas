---
name: phase
description: Orchestrate one build phase of the Kalinga Atlas (research, design, build, content, launch). Checks the previous phase's gate, applies the model-routing table, and delegates to the right agent with the correct handoff artefact. Use for any "start/continue phase X" request.
arguments: [name]
argument-hint: research | design | build | content | launch
---

# /phase $name

You are the **orchestrator**. You never write historical content, design assets or feature code yourself. You check gates, choose the model, delegate with a precise brief, and verify the result.

## Step 1: identify the phase and check its entry gate

| Phase | Entry gate (run it, do not assume) | Owner agent |
|---|---|---|
| `research` | none | `researcher` |
| `design` | `npm run validate:data` passes with 0 errors | `designer` |
| `build` | `validate:data` passes AND `src/styles/tokens.css` exists AND at least one component spec in `docs/design/` | `engineer` |
| `content` | `npm run build` passes | `editor` |
| `launch` | `npm run readability` passes AND `grep -r "NEEDS VERIFICATION" src/content` is empty | `qa-auditor` + human |

If the gate fails, stop and report exactly which check failed and what to run. Do not "work around" a gate.

## Step 2: choose the model (routing table)

| Work | Model | Why |
|---|---|---|
| research, sourcing, tiering, fact-checking | `opus` | a wrong claim is the costliest error on this site |
| map engine, timeline, D3 interaction model (`src/islands/AtlasMap.tsx`, `Timeline.tsx`, `map-architecture.md` changes) | `opus` | hardest engineering; correctness of a11y and perf matters |
| section pages, components, styling, tokens, SVG art, copywriting | `sonnet` | bounded work with strong references preloaded |
| running validators, audits, summarising reports | `haiku` | tool-driven, low judgement |

Agent files already carry their default model. Override with the Agent tool's `model` parameter only when this table says so (typically: `engineer` gets `opus` for map/timeline tasks). If the user named a model in their request, use that instead.

## Step 3: delegate with a complete brief

Use the Agent tool with `subagent_type` set to the owner agent. The prompt must include:
1. The exact scope for this run (which periods / entities / components / pages). Keep runs small: 5–10 entries, one component group, one section.
2. Where the inputs are (file paths) and what handoff artefact the previous phase produced.
3. The output files expected and the gate they must pass before the agent finishes.
4. "Report: what you produced, what is `draft` and why, what needs a human decision."

Run independent scopes in parallel (e.g. researcher on ports and researcher on goods) only when they touch different files.

## Step 4: verify, then report to the user

- Re-run the phase's own gate yourself (`validate:data`, `build`, `readability`, or the audit) rather than trusting the agent's claim.
- Show the user: files changed, gate output summary, items needing human review (draft entries, flagged sources, open design decisions).
- Never move an entry from `draft` to `reviewed`/`published` yourself. That is the human's decision; list the candidates.

## Phase-specific briefs

**research** — brief the researcher with: target period(s) or entity type, the registry (already preloaded), instruction to create `draft` entries in `src/data/*.json`, log to `docs/research/<topic>.md`, flag non-registry sources, and run `/validate-data` at the end.

**design** — brief the designer with: the published data so far, the components needed for the next build slice, instruction to output tokens/specs/SVGs per the design-system skill, and a contrast check summary.

**build** — brief the engineer with: the specs in `docs/design/`, the components/pages in scope, the atlas-engineering skill (preloaded), and the requirement that `npm run build` and `npm run check` pass. Use `model: opus` when the scope includes the map or timeline islands.

**content** — brief the editor with: the entity ids to write for, the `src/content/` layout, the citation format, and the readability gate. Then run `/fact-check` on each new file.

**launch** — run `/audit`; if scores are below target, open a `build` phase scoped to the specific findings; repeat. Then hand the deploy step to the user with the checklist from master prompt §14.
