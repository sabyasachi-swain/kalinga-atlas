/**
 * Downloads the open-licence base geodata used by the atlas into public/geo/.
 *
 *   land-50m.json       Natural Earth 1:50m land, TopoJSON (via world-atlas, public domain)
 *   countries-50m.json  Natural Earth 1:50m admin-0, TopoJSON (via world-atlas), context labels only
 *   rivers-50m.json     Natural Earth 1:50m rivers + lake centerlines, GeoJSON (public domain)
 *
 * The atlas only ever shows the Bay of Bengal to Java (see BBOX in
 * AtlasMap.tsx); world-scale coastline and river detail past that is wasted
 * transfer. After download this script:
 *
 *   - land:   drops whole polygons (continents, islands) that fall entirely
 *             outside a margin around the atlas bbox, re-derives a topology
 *             from what is left (topojson-server) and simplifies it
 *             (topojson-simplify) to a resolution appropriate for the map's
 *             on-screen size. countries-50m.json is left untouched: it is
 *             small and only used for label context.
 *   - rivers: drops whole features outside the same margin and rounds
 *             coordinates to ~100 m precision (plenty for a decorative
 *             overlay at this map scale).
 *
 * Natural Earth is public domain. No attribution is legally required, but the
 * atlas credits it in the footer anyway (master prompt §14).
 *
 * Run: npm run fetch:geo
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { feature as topoFeature } from 'topojson-client';
import { topology } from 'topojson-server';
import { presimplify, simplify, quantile } from 'topojson-simplify';
import type { Topology, GeometryCollection, Objects } from 'topojson-specification';
import type {
  Feature,
  FeatureCollection,
  Geometry,
  GeoJsonProperties,
  LineString,
  MultiLineString,
  MultiPolygon,
  Polygon,
  Position,
} from 'geojson';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(here, '../public/geo');

const FILES: Record<string, string> = {
  'land-50m.json': 'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/land-50m.json',
  'countries-50m.json': 'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-50m.json',
  'rivers-50m.json':
    'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_rivers_lake_centerlines.geojson',
};

/**
 * Same box the map fits to (AtlasMap.tsx BBOX), padded generously so panning
 * and zooming near the edges never reveals a hard-cut coastline.
 */
const BBOX = { minLon: 60, minLat: -12, maxLon: 120, maxLat: 30 };
const MARGIN = 15;
const CLIP = {
  minLon: BBOX.minLon - MARGIN,
  minLat: BBOX.minLat - MARGIN,
  maxLon: BBOX.maxLon + MARGIN,
  maxLat: BBOX.maxLat + MARGIN,
};

/**
 * True if any vertex of the ring/line falls inside the clip box. A min/max
 * bounding-box test would be wrong here: a handful of Natural Earth land and
 * river features (Russia's Far East, Antarctica, Fiji...) cross the
 * antimeridian, so their own bbox spans the entire globe and would
 * "intersect" every clip box. Testing vertices directly avoids that, at the
 * cost of (very rarely, and safely) keeping a feature whose edge merely
 * passes through the box without a vertex landing inside it.
 */
function ringBoundsIntersect(ring: Position[]): boolean {
  for (const [lon, lat] of ring) {
    if (lon === undefined || lat === undefined) continue;
    if (lon >= CLIP.minLon && lon <= CLIP.maxLon && lat >= CLIP.minLat && lat <= CLIP.maxLat) return true;
  }
  return false;
}

/** Keep a polygon (outer ring + holes) only if its outer ring touches the clip box. */
function filterMultiPolygon(mp: MultiPolygon): MultiPolygon {
  const coordinates = mp.coordinates.filter((polygon) => {
    const outer = polygon[0];
    return outer !== undefined && ringBoundsIntersect(outer);
  });
  return { type: 'MultiPolygon', coordinates };
}

function filterPolygon(p: Polygon): MultiPolygon {
  return ringBoundsIntersect(p.coordinates[0] ?? []) ? { type: 'MultiPolygon', coordinates: [p.coordinates] } : { type: 'MultiPolygon', coordinates: [] };
}

function kb(text: string): string {
  return `${(text.length / 1024).toFixed(0)} KB`;
}

async function processLand(): Promise<void> {
  const url = FILES['land-50m.json'];
  if (!url) throw new Error('land-50m.json url missing');
  process.stdout.write('fetching land-50m.json ... ');
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> ${res.status} ${res.statusText}`);
  const beforeText = await res.text();
  console.log(kb(beforeText));

  const topo = JSON.parse(beforeText) as Topology;
  const landObject = topo.objects['land'];
  if (!landObject) throw new Error('land-50m.json has no "land" object');

  const geo = topoFeature(topo, landObject as GeometryCollection) as
    | Feature<Geometry, GeoJsonProperties>
    | FeatureCollection<Geometry, GeoJsonProperties>;

  const features: Feature<MultiPolygon, GeoJsonProperties>[] = [];
  const source: Feature<Geometry, GeoJsonProperties>[] = geo.type === 'FeatureCollection' ? geo.features : [geo];
  for (const f of source) {
    if (f.geometry.type === 'MultiPolygon') {
      const clipped = filterMultiPolygon(f.geometry);
      if (clipped.coordinates.length > 0) features.push({ ...f, geometry: clipped });
    } else if (f.geometry.type === 'Polygon') {
      const clipped = filterPolygon(f.geometry);
      if (clipped.coordinates.length > 0) features.push({ ...f, geometry: clipped });
    }
  }

  // Empty properties objects, not the original (possibly null) ones: the
  // topojson-simplify types require Objects<{}>, and neither land nor rivers
  // carry any properties this atlas reads.
  const clippedCollection: FeatureCollection<MultiPolygon, Record<string, never>> = {
    type: 'FeatureCollection',
    features: features.map((f) => ({ ...f, properties: {} }) as Feature<MultiPolygon, Record<string, never>>),
  };

  // Rebuild a topology (shared arcs deduplicated again) from the clipped
  // geometry, weight every point by how much it contributes to the shape
  // (presimplify), and drop the least significant 70% of them (simplify).
  // presimplify decodes arcs to plain spherical coordinates and drops the
  // topology's integer quantization, so the final size win comes from
  // re-quantizing the simplified geometry back into a topology afterwards.
  // topojson-server's types always return the widest `Topology` (properties
  // typed as GeoJsonProperties); topojson-simplify's types require the
  // narrower `Objects<{}>`. Both describe the same runtime shape here, since
  // every feature above was given `properties: {}`.
  const initial = topology({ land: clippedCollection }, 1e6) as Topology<Objects<Record<string, never>>>;
  const weighted = presimplify(initial);
  // 0.3: keeps the most significant 30% of each arc's interior points.
  // Chosen empirically — coarse enough to shed most of the file at this
  // map's on-screen scale (a few hundred pixels across the whole Bay of
  // Bengal), fine enough that the coastline around Kalinga's ports still
  // reads correctly.
  const threshold = quantile(weighted, 0.3) ?? 0;
  const simplified = simplify(weighted, threshold);
  const simplifiedGeo = topoFeature(simplified, simplified.objects['land'] as GeometryCollection) as
    | Feature<Geometry, GeoJsonProperties>
    | FeatureCollection<Geometry, GeoJsonProperties>;
  const simplifiedCollection: FeatureCollection<Geometry, GeoJsonProperties> =
    simplifiedGeo.type === 'FeatureCollection' ? simplifiedGeo : { type: 'FeatureCollection', features: [simplifiedGeo] };
  const rebuilt = topology({ land: simplifiedCollection }, 1e4) as Topology;

  const outText = `${JSON.stringify(rebuilt)}\n`;
  writeFileSync(resolve(OUT, 'land-50m.json'), outText);
  console.log(`  clipped + simplified -> ${kb(outText)}`);
}

async function processRivers(): Promise<void> {
  const url = FILES['rivers-50m.json'];
  if (!url) throw new Error('rivers-50m.json url missing');
  process.stdout.write('fetching rivers-50m.json ... ');
  const res = await fetch(url);
  const beforeText = await res.text();
  console.log(kb(beforeText));

  const collection = JSON.parse(beforeText) as FeatureCollection<Geometry, GeoJsonProperties>;
  const isLineFeature = (
    f: Feature<Geometry, GeoJsonProperties>,
  ): f is Feature<LineString | MultiLineString, GeoJsonProperties> =>
    f.geometry.type === 'LineString' || f.geometry.type === 'MultiLineString';

  const kept = collection.features.filter(isLineFeature).filter((f) => {
    const lines = f.geometry.type === 'LineString' ? [f.geometry.coordinates] : f.geometry.coordinates;
    return lines.some((line) => ringBoundsIntersect(line));
  });

  // Round to 3 decimal places (~110 m at the equator): far finer than this
  // decorative overlay is ever drawn, and it shrinks the JSON substantially
  // by shortening every coordinate pair.
  const round = (n: number) => Math.round(n * 1000) / 1000;
  const roundedLine = (line: Position[]) => line.map(([lon, lat]) => [round(lon ?? 0), round(lat ?? 0)]);
  const trimmed: FeatureCollection<LineString | MultiLineString, GeoJsonProperties> = {
    type: 'FeatureCollection',
    features: kept.map((f): Feature<LineString | MultiLineString, GeoJsonProperties> => ({
      ...f,
      properties: null,
      geometry:
        f.geometry.type === 'LineString'
          ? { type: 'LineString', coordinates: roundedLine(f.geometry.coordinates) }
          : { type: 'MultiLineString', coordinates: f.geometry.coordinates.map(roundedLine) },
    })),
  };

  const outText = `${JSON.stringify(trimmed)}\n`;
  writeFileSync(resolve(OUT, 'rivers-50m.json'), outText);
  console.log(`  clipped + rounded -> ${kb(outText)} (${kept.length}/${collection.features.length} features kept)`);
}

async function processPassthrough(name: string): Promise<void> {
  const url = FILES[name];
  if (!url) return;
  process.stdout.write(`fetching ${name} ... `);
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`failed: ${res.status} ${res.statusText}`);
    process.exitCode = 1;
    return;
  }
  const text = await res.text();
  writeFileSync(resolve(OUT, name), text);
  console.log(kb(text));
}

mkdirSync(OUT, { recursive: true });

try {
  await processLand();
  await processRivers();
  await processPassthrough('countries-50m.json');
} catch (err) {
  console.error(`fetch:geo failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
}

console.log('\nSaved to public/geo/. These files are gitignored; re-run this script after a fresh clone.');
