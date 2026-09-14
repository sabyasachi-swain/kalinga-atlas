# Base geodata

Generated files (gitignored). Regenerate with:

```bash
npm run fetch:geo
```

| File | Source | Licence |
|---|---|---|
| `land-50m.json` | Natural Earth 1:50m land via [world-atlas](https://github.com/topojson/world-atlas) | Public domain |
| `countries-50m.json` | Natural Earth 1:50m admin-0 via world-atlas | Public domain |
| `rivers-50m.json` | Natural Earth 1:50m rivers and lake centerlines | Public domain |

**Historical coastlines are not in these files.** Any reconstructed shoreline must be a separate, cited layer under `src/data/` with an `evidence_level` and a `source_ref` to the geological or historical paper it comes from, and is labelled "Approximate reconstruction" in the UI.
