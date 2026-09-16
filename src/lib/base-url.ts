/**
 * Joins Astro's configured `base` with a path, guaranteeing exactly one
 * slash between them.
 *
 * `import.meta.env.BASE_URL` resolves to `/kalinga-atlas` with **no**
 * trailing slash in this project's build (confirmed in the built output),
 * so every past `${base}routes/`-style template literal silently produced
 * `/kalinga-atlasroutes/` — a 404 on GitHub Pages for every nav link, page
 * link and asset URL that used it. Route every such concatenation through
 * this helper instead of hand-joining the two strings.
 */
export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL;
  const trimmedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  const trimmedPath = path.startsWith('/') ? path : `/${path}`;
  return `${trimmedBase}${trimmedPath}`;
}
