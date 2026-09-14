/**
 * Downloads the open-licence base geodata used by the atlas into public/geo/.
 *
 *   land-50m.json       Natural Earth 1:50m land, TopoJSON (via world-atlas, public domain)
 *   countries-50m.json  Natural Earth 1:50m admin-0, TopoJSON (via world-atlas), context labels only
 *   rivers-50m.json     Natural Earth 1:50m rivers + lake centerlines, GeoJSON (public domain)
 *
 * Natural Earth is public domain. No attribution is legally required, but the
 * atlas credits it in the footer anyway (master prompt §14).
 *
 * Run: npm run fetch:geo
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(here, '../public/geo');

const FILES: Record<string, string> = {
  'land-50m.json': 'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/land-50m.json',
  'countries-50m.json': 'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-50m.json',
  'rivers-50m.json':
    'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_rivers_lake_centerlines.geojson',
};

mkdirSync(OUT, { recursive: true });

for (const [name, url] of Object.entries(FILES)) {
  process.stdout.write(`fetching ${name} ... `);
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`failed: ${res.status} ${res.statusText}`);
    process.exitCode = 1;
    continue;
  }
  const text = await res.text();
  writeFileSync(resolve(OUT, name), text);
  console.log(`${(text.length / 1024).toFixed(0)} KB`);
}

console.log('\nSaved to public/geo/. These files are gitignored; re-run this script after a fresh clone.');
