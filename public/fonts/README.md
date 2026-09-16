# Self-hosted fonts — split location

The `.woff2` files live in `src/assets/fonts/`, not here — see that
decision's rationale below. The **licence texts stay in this folder**
(`public/fonts/*-OFL.txt`) so they are served at the site root
(`/kalinga-atlas/fonts/EBGaramond-OFL.txt` and so on) and reach the
deployed site alongside the fonts they cover, as the SIL Open Font License
requires. `docs/attribution.md` and `src/pages/attribution.astro` link to
these served copies.

## Why the `.woff2` files moved out of here

Fonts referenced from `public/` are served at the site root with **no**
`import.meta.env.BASE_URL` prefix applied by Vite's dev server, and CSS
`url()` can't call `import.meta.env.BASE_URL` the way JS can — so a plain
`url('/fonts/...')` in `src/styles/tokens.css` worked once the production
build rewrote every asset path, but 404'd in `npm run dev` under the
`/kalinga-atlas` base (`Request URLs for public/ assets must also include
your base`). Referencing the fonts as a `src/`-relative path from
`tokens.css` instead routes them through Vite's normal asset pipeline,
which resolves and hashes them correctly in both dev and the build — no
base-path special-casing needed. Plain text licence files don't need that
pipeline, so they stay here where they're simplest to serve as-is.

All fonts are SIL Open Font License 1.1. See `docs/attribution.md`.
