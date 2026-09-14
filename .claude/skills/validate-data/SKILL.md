---
name: validate-data
description: Run the data validator over src/data/*.json and summarise failures grouped by rule (missing source, tier violation, unresolved id, bad period). Use before any build, after any data edit, or when asked "is the data valid".
context: fork
model: haiku
allowed-tools: Bash(npm run validate:data*), Read, Grep
---

Run:

```
npm run validate:data
```

Then report in this shape, nothing else:

1. **Result**: OK / FAIL with the error and warning counts.
2. **Counts**: the per-collection line from the output (draft / reviewed / published).
3. **Errors by rule** (if any): rule id → list of `file > id: message`. Add one sentence per rule on how to fix (e.g. "H2: add a second distinct source or downgrade the tier").
4. **Draft warnings**: the same, but under a "will not block build" heading.

Do not edit any file. Do not speculate about history. If the command itself fails to run (missing node_modules, TypeScript error), quote the error and suggest `npm install` or the file to look at.
