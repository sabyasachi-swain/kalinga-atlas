/**
 * AtlasMap island — the centrepiece.
 *
 * Architecture: .claude/skills/atlas-engineering/map-architecture.md
 * Visual spec:  docs/design/atlas-map.md, docs/design/route-styles.md
 *
 *   - <canvas> for the Natural Earth basemap: graticule, land, rivers.
 *   - <svg> overlay for routes and markers so each is focusable and labelled.
 *   - d3-zoom on the stage; canvas uses setTransform, the SVG root <g> uses
 *     transform, markers counter-scale so they stay a constant size.
 *   - Period changes fade inactive layers over --dur-page. Nothing remounts.
 *
 * Geodata is fetched after mount so it never blocks first paint.
 */
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { geoBounds, geoGraticule10, geoMercator, geoPath } from 'd3-geo';
import { select } from 'd3-selection';
import { zoom as d3Zoom, zoomIdentity, type D3ZoomEvent, type ZoomBehavior } from 'd3-zoom';
import { feature as topoFeature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import type { Feature, FeatureCollection, GeoJsonProperties, Geometry } from 'geojson';
import type { EvidenceLevel, EvidenceType, Period, Port, Route, Site } from '@data/schema';
import { TIER, TYPE } from './Badge';
import { withBase } from '@lib/base-url';

/** What the map reports upward when something is chosen. */
export interface MapSelection {
  kind: 'port' | 'route' | 'site';
  id: string;
}

export interface AtlasMapProps {
  ports: Port[];
  routes: Route[];
  sites: Site[];
  periods: Period[];
  /** id from periods.json. Controls which ports/routes are lit. */
  activePeriod: string;
  /** Path to the TopoJSON land file, relative to Astro's configured base URL. */
  landUrl?: string;
  riversUrl?: string;
  onSelect?: (selection: MapSelection) => void;
  /** Currently selected entity, owned by Atlas.tsx. */
  selection?: MapSelection | null;
  /** Clear the selection (Escape on the map). */
  onClear?: () => void;
  /**
   * Bump this number to move focus back to the marker that opened the panel.
   * Used by Atlas.tsx when the detail panel closes.
   */
  focusReturnToken?: number;
  /**
   * True when this instance is rendered inside the phone full-screen dialog
   * (docs/design/kid-experience.md A3). Only affects touch-action: a
   * fullscreen dialog has no page behind it to fight over a vertical drag,
   * so touch panning can be unrestricted there. Never a second live
   * instance — Atlas.tsx portals the same AtlasMap between the inline slot
   * and the dialog rather than mounting a second one.
   */
  fullscreen?: boolean;
}

// ---------------------------------------------------------------------------
// Geography constants
// ---------------------------------------------------------------------------

/** Bay of Bengal → Java. Everything the atlas ever needs to show. */
const BBOX: [number, number, number, number] = [60, -12, 120, 30];

/**
 * The corners as a MultiPoint, not a Polygon. d3-geo reads a spherical
 * polygon's winding order to decide which side is "inside", so a ring wound
 * the wrong way makes fitExtent fit the whole globe minus the box. Points
 * carry no winding, and Mercator is cylindrical (x from lon, y from lat,
 * both monotonic), so the corners' projected bounds are exactly the box.
 */
const BBOX_FEATURE: Feature<Geometry, GeoJsonProperties> = {
  type: 'Feature',
  properties: {},
  geometry: {
    type: 'MultiPoint',
    coordinates: [
      [BBOX[0], BBOX[1]],
      [BBOX[2], BBOX[1]],
      [BBOX[2], BBOX[3]],
      [BBOX[0], BBOX[3]],
    ],
  },
};

const FIT_PADDING = 24;
const SSR_WIDTH = 960;
const SSR_HEIGHT = 600;
const PAN_STEP = 40;
const ZOOM_STEP = 1.5;
/**
 * A1/A4 fix: the whole-ocean view's fit has to show almost the entire
 * Bay-of-Bengal-to-Java extent inside the chrome-reduced safe area (see
 * `getSafeRect`); on a tall/narrow stage that can require zooming out
 * further than the base projection's own k=1. 1 stayed the practical floor
 * for manual zoom-out (arrow keys, "-"), but the ocean-view fit specifically
 * needs real headroom below it, or `computeFit` silently clamps back up to
 * 1 and pushes content under the topbar/zoom column instead.
 */
const MIN_SCALE = 0.1;
const MAX_SCALE = 12;
/** Half of the 44 px minimum touch target (markers). */
const HIT_RADIUS = 22;
/**
 * route-styles.md: a full 44 px hit band is impractical for a world-scale
 * line, so routes get a 12 screen-px transparent stroke instead (set in
 * atlas.css as `.route-hit`'s `stroke-width`, kept constant on screen with
 * `vector-effect: non-scaling-stroke` rather than a per-zoom JS recompute).
 * Keyboard users reach every route directly with Tab, so nothing depends on
 * the hit band being large.
 */
/** Wide screens show the legend expanded (atlas-map.md, 56.25rem boundary). */
const WIDE_QUERY = '(min-width: 56.25rem)';
/** A1 fix: below this, the map caption collapses to keep the top chrome
 * short — same 600px boundary A3 uses for the phone full-screen mode. */
const NARROW_CHROME_QUERY = '(max-width: 37.4375rem)';

// ---------------------------------------------------------------------------
// Kid experience (docs/design/kid-experience.md) — A1 default view, A4 markers
// ---------------------------------------------------------------------------

/** A1: bounding-box padding applied on every side before fitting a view. */
const COAST_PADDING = 0.15;
/** A4 fix: smaller than COAST_PADDING — see `showOcean`. */
const OCEAN_PADDING = 0.06;
/** A1 fix: floor on a view fit's bounding box, in real-world terms — see
 * `minFitSpanPx`, computed from this via the live projection. */
const MIN_FIT_SPAN_KM = 150;
const KM_PER_DEG_LAT = 111.32;
/** Roughly central to the Kalinga coast (Cuttack district); only used to
 * pick a representative latitude for the Mercator scale factor above —
 * not a claim about any specific place. */
const KALINGA_REF_LNG = 86;
const KALINGA_REF_LAT = 20.2;
/**
 * A4 (light map-style geometry, map-style-light.md): round markers, 28px
 * diameter at the coast view and 22px at the whole-ocean view; the 44px hit
 * area (HIT_RADIUS) is unchanged. Manual pan/zoom keeps the coast size.
 */
const MARKER_R_COAST = 14; // 28px diameter
const MARKER_R_OCEAN = 11; // 22px diameter
const MARKER_RING_GAP = 6;
const MARKER_RING_WIDTH = 3;
/**
 * Cluster threshold: one marker diameter (at the *current* view's size)
 * plus 6px, applied at every view including the coast — bigger, rounder
 * markers overlap more easily than the old 6px dots did, so "every Kalinga
 * port keeps a permanent label" is replaced entirely by "nothing ever
 * overlaps anything else"; a cluster bubble stands in wherever that would
 * otherwise happen.
 */
/**
 * Visual padding beyond a marker's fill radius: map-style-light.md's ring
 * (2–2.5px) plus outline (1.25–1.5px) layers add up to 4px outside the
 * fill circle, so any gap/threshold based on the bare fill radius needs a
 * margin comfortably bigger than 6px to still guarantee the *rendered*
 * (outline-to-outline) edges never touch.
 */
const MARKER_VISUAL_PAD = 10;

function clusterThresholdPx(markerRadius: number): number {
  return markerRadius * 2 + MARKER_VISUAL_PAD;
}

/** map-style-light.md: site markers keep the diamond silhouette. */
function diamondPath(r: number): string {
  return `M0,${-r} L${r},0 L0,${r} L${-r},0 Z`;
}
/** A2: remembers the wheel/drag hint has been dismissed. */
const HINT_KEY = 'kalinga-map-hint-dismissed';
const HINT_AUTO_MS = 5000;

/** An axis-aligned rectangle, in the stage's local (unzoomed) pixel space. */
interface SafeRect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/**
 * Fit a set of already-projected (identity-transform) points into `box`,
 * expanding their bounding box by `padPct` on every side first. `box` is
 * the *free* area of the stage — the caller subtracts the overlay chrome
 * (top bar, zoom column, keys button) before calling this, so the fit
 * centres content in the space actually free of controls, not the raw
 * stage rect. Pure and stateless so it can be reused for both view
 * buttons, the initial fit and zooming into a cluster.
 */
function computeFit(
  points: Array<{ x: number; y: number }>,
  box: SafeRect,
  padPct: number,
  minScale: number = MIN_SCALE,
  maxScale: number = MAX_SCALE,
  minSpanPx: number = 0,
): { k: number; x: number; y: number } {
  if (points.length === 0) return { k: minScale, x: 0, y: 0 };
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const p of points) {
    if (p.x < x0) x0 = p.x;
    if (p.x > x1) x1 = p.x;
    if (p.y < y0) y0 = p.y;
    if (p.y > y1) y1 = p.y;
  }
  // A1 fix: a one-point (or near-one-point) box otherwise collapses to a
  // ~1px span, which forces an absurd scale once that span is fitted to
  // the available area — expand around the box's own centre to a sensible
  // geographic minimum instead of letting either axis shrink arbitrarily.
  if (minSpanPx > 0) {
    if (x1 - x0 < minSpanPx) {
      const cx = (x0 + x1) / 2;
      x0 = cx - minSpanPx / 2;
      x1 = cx + minSpanPx / 2;
    }
    if (y1 - y0 < minSpanPx) {
      const cy = (y0 + y1) / 2;
      y0 = cy - minSpanPx / 2;
      y1 = cy + minSpanPx / 2;
    }
  }
  const w = Math.max(x1 - x0, 1);
  const h = Math.max(y1 - y0, 1);
  const totalW = w * (1 + 2 * padPct);
  const totalH = h * (1 + 2 * padPct);
  const availW = Math.max(box.x1 - box.x0 - 2 * FIT_PADDING, 1);
  const availH = Math.max(box.y1 - box.y0 - 2 * FIT_PADDING, 1);
  let k = Math.min(availW / totalW, availH / totalH);
  if (!Number.isFinite(k) || k <= 0) k = 1;
  k = Math.min(Math.max(k, minScale), maxScale);
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const boxCx = (box.x0 + box.x1) / 2;
  const boxCy = (box.y0 + box.y1) / 2;
  return { k, x: boxCx - k * cx, y: boxCy - k * cy };
}

const MODE_LABEL: Record<Route['mode'], string> = {
  maritime: 'Maritime',
  coastal: 'Coastal',
  river: 'River',
  land: 'Land',
};

/**
 * route-styles.md mode × tier dash table. The pattern length is the sum of
 * one dash period; the flow keyframes offset by exactly that, so every mode
 * shares one animation. Set inline so dasharray and length cannot drift.
 */
const ROUTE_DASH: Record<Route['mode'], { normal: string; hypothetical: string }> = {
  maritime: { normal: '40 6', hypothetical: '6 14' },
  coastal: { normal: '10 5', hypothetical: '10 13' },
  river: { normal: '3 4', hypothetical: '3 10' },
  land: { normal: '7 3 2 3', hypothetical: '7 8 2 8' },
};

function patternLength(dash: string): number {
  return dash.split(/\s+/).reduce((sum, n) => sum + (Number.parseFloat(n) || 0), 0);
}

/** route-styles.md: no vehicle glyph exists for overland caravans yet. */
const SHIP_FOR_MODE: Record<Route['mode'], 'sailing' | 'river' | null> = {
  maritime: 'sailing',
  coastal: 'sailing',
  river: 'river',
  land: null,
};

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function tierSlug(level: EvidenceLevel): string {
  return TIER[level].css;
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

function formatYear(y: number): string {
  return y < 0 ? `${Math.abs(y)} BCE` : `${y} CE`;
}

function readVar(el: Element | null, name: string, fallback: string): string {
  if (!el || typeof window === 'undefined') return fallback;
  const value = window.getComputedStyle(el).getPropertyValue(name).trim();
  return value === '' ? fallback : value;
}

function readMs(el: Element | null, name: string, fallback: number): number {
  const raw = readVar(el, name, '');
  if (raw === '') return fallback;
  if (raw.endsWith('ms')) return Number.parseFloat(raw) || 0;
  if (raw.endsWith('s')) return (Number.parseFloat(raw) || 0) * 1000;
  return fallback;
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

function intersectsBbox(f: Feature<Geometry, GeoJsonProperties>): boolean {
  try {
    const [[x0, y0], [x1, y1]] = geoBounds(f);
    return x1 >= BBOX[0] && x0 <= BBOX[2] && y1 >= BBOX[1] && y0 <= BBOX[3];
  } catch {
    return true;
  }
}

interface GeoData {
  land: FeatureCollection<Geometry, GeoJsonProperties> | null;
  rivers: Feature<Geometry, GeoJsonProperties>[];
}

// ---------------------------------------------------------------------------
// Derived view models
// ---------------------------------------------------------------------------

type MarkerShape = 'port' | 'site' | 'destination';

interface MarkerDatum {
  key: string;
  kind: 'port' | 'site';
  shape: MarkerShape;
  id: string;
  name: string;
  x: number;
  y: number;
  label: string;
  inactive: boolean;
}

interface RouteDatum {
  key: string;
  id: string;
  d: string;
  mode: Route['mode'];
  tier: string;
  dash: string;
  patternLength: number;
  label: string;
  inactive: boolean;
}

export function AtlasMap({
  ports,
  routes,
  sites,
  periods,
  activePeriod,
  landUrl = withBase('geo/land-50m.json'),
  riversUrl = withBase('geo/rivers-50m.json'),
  onSelect,
  selection = null,
  onClear,
  focusReturnToken = 0,
  fullscreen = false,
}: AtlasMapProps) {
  const uid = useId().replace(/[^a-zA-Z0-9-]/g, '');
  const figureRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const shipRef = useRef<SVGGElement | null>(null);
  const keysDialogRef = useRef<HTMLDialogElement | null>(null);
  const keysButtonRef = useRef<HTMLButtonElement | null>(null);
  const keysCloseRef = useRef<HTMLButtonElement | null>(null);
  /** A1 fix: measured to exclude the overlay chrome from every view fit. */
  const topbarRef = useRef<HTMLDivElement | null>(null);
  const zoomColRef = useRef<HTMLDivElement | null>(null);
  const zoomRef = useRef<ZoomBehavior<HTMLDivElement, unknown> | null>(null);
  const nodeRefs = useRef<Map<string, SVGGElement>>(new Map());
  const routePathRefs = useRef<Map<string, SVGPathElement>>(new Map());
  const lastSelectedKey = useRef<string | null>(null);
  const rootGRef = useRef<SVGGElement | null>(null);
  /**
   * Live transform, written on every d3-zoom tick without touching React
   * state. `transform` (state, below) only gets committed on the zoom
   * `end` event, so a drag or wheel gesture re-renders the component once
   * per gesture instead of once per tick. Mid-gesture, the root <g>'s
   * `transform` attribute and the `--map-counter` custom property (which
   * every marker's counter-scale reads) are written directly to the DOM
   * from the refs below.
   */
  const liveTransformRef = useRef({ k: 1, x: 0, y: 0 });
  const canvasRafRef = useRef(0);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenReadyRef = useRef(false);
  /** A1: the runtime-computed default fit only ever runs once. */
  const didInitialFitRef = useRef(false);
  /** True once the ResizeObserver below has reported the stage's real,
   * laid-out size at least once — the `size` state may still hold its SSR
   * default before then, and markers/projection are computed from `size`,
   * not from the DOM directly, so the initial fit must wait for it too. */
  const sizeMeasuredRef = useRef(false);
  /**
   * A1 fix: every view/cluster fit raises this to ~4x whatever scale a
   * tight coast fit actually needed, so "+" never starts disabled just
   * because the static MAX_SCALE ceiling happened to equal the fit's own
   * scale. Read (not just written) during render for `canZoomIn`.
   */
  const scaleExtentMaxRef = useRef(MAX_SCALE);
  /** A1/A4: view-fit and cluster-zoom transitions write DOM directly per
   * frame (like a gesture tick) and only touch React state once, at the
   * end — see `animateTo`. */
  const viewAnimRafRef = useRef(0);
  /** A2: dismiss the hint on the first wheel/drag; kept current via a ref
   * because the zoom-behavior effect below only runs once on mount. */
  const dismissHintRef = useRef<() => void>(() => {});
  const hintShownRef = useRef(false);
  const hintTimerRef = useRef(0);

  const [size, setSize] = useState({ width: SSR_WIDTH, height: SSR_HEIGHT });
  const [transform, setTransform] = useState({ k: 1, x: 0, y: 0 });
  const [geo, setGeo] = useState<GeoData>({ land: null, rivers: [] });
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [showKeys, setShowKeys] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  /** A1: which of the two view buttons (if either) matches the current
   * transform. Any manually-triggered zoom/pan event clears it to 'manual'. */
  const [viewMode, setViewMode] = useState<'coast' | 'ocean' | 'manual'>('coast');
  /** A1: both view buttons are aria-disabled for the length of a transition. */
  const [viewTransitioning, setViewTransitioning] = useState(false);
  /** A2: dismissible "scroll to zoom" hint, mouse pointers only. */
  const [hintVisible, setHintVisible] = useState(false);
  /** A1 fix: the caption collapses behind a summary below 600px so the top
   * chrome a view fit has to avoid is shorter on a phone screen; open by
   * default at wider widths. Independent of the media query after mount,
   * same pattern as `legendOpen`, so a manual toggle isn't fought back. */
  const [caveatOpen, setCaveatOpen] = useState(true);

  const period = periods.find((p) => p.id === activePeriod);

  // -- Media queries -------------------------------------------------------
  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const wide = window.matchMedia(WIDE_QUERY);
    const narrow = window.matchMedia(NARROW_CHROME_QUERY);
    const applyMotion = () => setReducedMotion(motion.matches);
    const applyWide = () => setLegendOpen(wide.matches);
    const applyNarrow = () => setCaveatOpen(!narrow.matches);
    applyMotion();
    applyWide();
    applyNarrow();
    motion.addEventListener('change', applyMotion);
    wide.addEventListener('change', applyWide);
    narrow.addEventListener('change', applyNarrow);
    return () => {
      motion.removeEventListener('change', applyMotion);
      wide.removeEventListener('change', applyWide);
      narrow.removeEventListener('change', applyNarrow);
    };
  }, []);

  // -- Size ----------------------------------------------------------------
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const box = entry.contentRect;
      sizeMeasuredRef.current = true;
      setSize((prev) =>
        Math.round(prev.width) === Math.round(box.width) && Math.round(prev.height) === Math.round(box.height)
          ? prev
          : { width: box.width, height: box.height },
      );
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // -- Geodata (after mount, never blocks first paint) ---------------------
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const landRes = await fetch(landUrl);
        if (!landRes.ok) throw new Error(`land ${landRes.status}`);
        const topology = (await landRes.json()) as Topology;
        const landObject = topology.objects['land'];
        if (!landObject) throw new Error('TopoJSON has no "land" object');
        const land = topoFeature(topology, landObject as GeometryCollection) as FeatureCollection<
          Geometry,
          GeoJsonProperties
        >;

        let rivers: Feature<Geometry, GeoJsonProperties>[] = [];
        try {
          const riversRes = await fetch(riversUrl);
          if (riversRes.ok) {
            const collection = (await riversRes.json()) as FeatureCollection<Geometry, GeoJsonProperties>;
            rivers = (collection.features ?? []).filter(intersectsBbox);
          }
        } catch {
          rivers = []; // rivers are decorative; the map is still usable without them
        }

        if (cancelled) return;
        setGeo({ land, rivers });
        setStatus('ready');
      } catch {
        if (!cancelled) setStatus('error');
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [landUrl, riversUrl]);

  // -- Projection ----------------------------------------------------------
  const projection = useMemo(() => {
    const width = Math.max(size.width, 1);
    const height = Math.max(size.height, 1);
    const p = geoMercator();
    p.fitExtent(
      [
        [FIT_PADDING, FIT_PADDING],
        [Math.max(width - FIT_PADDING, FIT_PADDING + 1), Math.max(height - FIT_PADDING, FIT_PADDING + 1)],
      ],
      BBOX_FEATURE,
    );
    return p;
  }, [size.width, size.height]);

  const pathGen = useMemo(() => geoPath(projection), [projection]);

  /**
   * A1 fix: the minimum geographic span (in projected px, at k=1) any view
   * fit's bounding box is allowed to shrink below, so a single active port
   * (or two ports a few hundred metres apart) doesn't turn into a
   * near-zero-width box that forces an absurd scale (~500x, observed with
   * Mauryan Kalinga's single active port). Derived from the projection
   * itself, not a magic pixel constant: project a `MIN_FIT_SPAN_KM`-tall
   * step of latitude at a point roughly central to the Kalinga coast, so
   * the resulting default view always shows a sensible stretch of
   * coastline around a lone port. Mercator is locally conformal, so the
   * same span works as a floor on both axes.
   */
  const minFitSpanPx = useMemo(() => {
    const dLat = MIN_FIT_SPAN_KM / KM_PER_DEG_LAT;
    const p0 = projection([KALINGA_REF_LNG, KALINGA_REF_LAT]);
    const p1 = projection([KALINGA_REF_LNG, KALINGA_REF_LAT + dLat]);
    if (!p0 || !p1) return 0;
    return Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
  }, [projection]);

  /** Route endpoints are port or site ids; resolve them for the aria-label. */
  const placeNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of ports) map.set(p.id, p.name);
    for (const s of sites) map.set(s.id, s.name);
    return map;
  }, [ports, sites]);

  // -- Markers, in Tab order: Kalinga ports, sites, then destinations -------
  const markers = useMemo<MarkerDatum[]>(() => {
    const out: MarkerDatum[] = [];

    const pushPort = (p: Port, shape: MarkerShape) => {
      const xy = projection([p.coordinates.lng, p.coordinates.lat]);
      if (!xy) return;
      const [x, y] = xy;
      const inactive = !p.periods.includes(activePeriod);
      const kindWord = shape === 'destination' ? 'trading destination' : 'port';
      out.push({
        key: `port:${p.id}`,
        kind: 'port',
        shape,
        id: p.id,
        name: p.name,
        x,
        y,
        label: `${p.name}, ${kindWord}, ${p.evidence_level}, ${TYPE[p.evidence_type].label}${
          inactive ? ', outside the selected period' : ''
        }`,
        inactive,
      });
    };

    for (const p of ports) if (p.region === 'kalinga') pushPort(p, 'port');

    for (const s of sites) {
      const xy = projection([s.coordinates.lng, s.coordinates.lat]);
      if (!xy) continue;
      const [x, y] = xy;
      const inactive = !s.periods.includes(activePeriod);
      out.push({
        key: `site:${s.id}`,
        kind: 'site',
        shape: 'site',
        id: s.id,
        name: s.name,
        x,
        y,
        label: `${s.name}, ${s.site_type}, ${s.evidence_level}, ${TYPE[s.evidence_type].label}${
          inactive ? ', outside the selected period' : ''
        }`,
        inactive,
      });
    }

    for (const p of ports) if (p.region !== 'kalinga') pushPort(p, 'destination');

    return out;
  }, [ports, sites, projection, activePeriod]);

  const routeData = useMemo<RouteDatum[]>(() => {
    const out: RouteDatum[] = [];
    for (const r of routes) {
      const d = pathGen({
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: r.waypoints.map((w) => [w.lng, w.lat]) },
      });
      if (!d) continue;
      const inactive = !r.periods.includes(activePeriod);
      const tier = tierSlug(r.evidence_level);
      const table = ROUTE_DASH[r.mode];
      const dash = tier === 'hypothetical' || tier === 'unverified' ? table.hypothetical : table.normal;
      const from = placeNames.get(r.from) ?? r.from;
      const to = placeNames.get(r.to) ?? r.to;
      out.push({
        key: `route:${r.id}`,
        id: r.id,
        d,
        mode: r.mode,
        tier,
        dash,
        patternLength: patternLength(dash),
        label: `${MODE_LABEL[r.mode]} route, ${from} to ${to}, ${r.evidence_level}, ${
          TYPE[r.evidence_type].label
        }${inactive ? ', outside the selected period' : ''}`,
        inactive,
      });
    }
    return out;
  }, [routes, pathGen, activePeriod, placeNames]);

  // -- Zoom ----------------------------------------------------------------
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const behavior = d3Zoom<HTMLDivElement, unknown>()
      .scaleExtent([MIN_SCALE, MAX_SCALE])
      // kid-experience.md A2: plain wheel zoom, no Ctrl. This map is the
      // full-viewport centrepiece of its own screen, not embedded in a
      // scrolling article, so the usual "Ctrl+wheel" convention (which
      // exists to stop an embedded map hijacking page scroll) does not
      // apply and a 10-year-old would never discover the modifier anyway.
      // Double-click/double-tap and pinch are d3-zoom defaults, unblocked
      // by not vetoing them here.
      .filter((event: Event) => !(event as MouseEvent).button)
      .on('start', (event: D3ZoomEvent<HTMLDivElement, unknown>) => {
        // A2: a real user gesture (not our own programmatic transform calls,
        // which have no sourceEvent) dismisses the hint and, per A1, means
        // neither view button is "pressed" any more.
        if (event.sourceEvent) {
          dismissHintRef.current();
          setViewMode('manual');
        }
      })
      .on('zoom', (event: D3ZoomEvent<HTMLDivElement, unknown>) => {
        const t = event.transform;
        liveTransformRef.current = { k: t.k, x: t.x, y: t.y };
        // Mutate the DOM directly for every tick: the SVG root <g> transform
        // and the --map-counter custom property markers/ship counter-scale
        // against. This is what keeps a drag or wheel gesture from
        // re-rendering the whole marker/route tree on every tick.
        const g = rootGRef.current;
        if (g) g.setAttribute('transform', `translate(${t.x},${t.y}) scale(${t.k})`);
        const figure = figureRef.current;
        if (figure) figure.style.setProperty('--map-counter', String(1 / t.k));
        scheduleCacheDrawRef.current();
      })
      .on('end', (event: D3ZoomEvent<HTMLDivElement, unknown>) => {
        const t = event.transform;
        liveTransformRef.current = { k: t.k, x: t.x, y: t.y };
        // Commit to React state once per gesture: this is what reruns label
        // culling and updates the zoom buttons' disabled state, and it
        // triggers the one full-quality vector redraw of the canvas.
        setTransform({ k: t.k, x: t.x, y: t.y });
      });

    const sel = select(el);
    sel.call(behavior);
    zoomRef.current = behavior;

    return () => {
      sel.on('.zoom', null);
      zoomRef.current = null;
    };
  }, []);

  // A3: touch-action pan-y inline (leaves single-finger vertical page scroll
  // alone), touch-action none inside the full-screen dialog (nothing behind
  // it to scroll, so a touch drag can pan the map with no ambiguity).
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    select(el).style('touch-action', fullscreen ? 'none' : 'pan-y');
  }, [fullscreen]);

  // A2: dismissible "scroll to zoom" hint, mouse pointers only, remembered
  // in localStorage. Every access is wrapped in try/catch — storage can be
  // disabled or throw (private browsing, quota) and the hint must still
  // work for the current visit either way.
  const dismissHint = useCallback(() => {
    window.clearTimeout(hintTimerRef.current);
    setHintVisible(false);
    try {
      window.localStorage.setItem(HINT_KEY, '1');
    } catch {
      /* storage unavailable — the hint just reappears next visit */
    }
  }, []);

  useEffect(() => {
    dismissHintRef.current = dismissHint;
  }, [dismissHint]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    let dismissed = false;
    try {
      dismissed = window.localStorage.getItem(HINT_KEY) === '1';
    } catch {
      dismissed = false;
    }
    if (dismissed) {
      hintShownRef.current = true;
      return;
    }
    const onPointerEnter = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || hintShownRef.current) return;
      hintShownRef.current = true;
      setHintVisible(true);
      hintTimerRef.current = window.setTimeout(dismissHint, HINT_AUTO_MS);
    };
    el.addEventListener('pointerenter', onPointerEnter);
    return () => el.removeEventListener('pointerenter', onPointerEnter);
  }, [dismissHint]);

  useEffect(() => () => window.clearTimeout(hintTimerRef.current), []);

  const zoomBy = useCallback((factor: number) => {
    const el = stageRef.current;
    const behavior = zoomRef.current;
    if (!el || !behavior) return;
    setViewMode('manual');
    behavior.scaleBy(select(el), factor);
  }, []);

  const panBy = useCallback((dx: number, dy: number) => {
    const el = stageRef.current;
    const behavior = zoomRef.current;
    if (!el || !behavior) return;
    // Live k, not the committed state value: correct even mid-gesture.
    const k = liveTransformRef.current.k;
    setViewMode('manual');
    behavior.translateBy(select(el), dx / k, dy / k);
  }, []);

  /**
   * A1/A4: view-fit and cluster-zoom animation. Mid-flight it writes
   * liveTransformRef and the DOM directly, exactly like a gesture tick (see
   * the 'zoom' handler above) — no React state per frame. It commits once,
   * at the end, via the real d3-zoom `transform()` call so the behavior's
   * own stored transform (what the next wheel/drag gesture starts from)
   * stays in sync; that single call is what triggers the map-architecture
   * "one render per gesture" React commit.
   */
  const animateTo = useCallback(
    (target: { k: number; x: number; y: number }, onDone?: () => void) => {
      const el = stageRef.current;
      const behavior = zoomRef.current;
      if (!el || !behavior) {
        onDone?.();
        return;
      }
      if (viewAnimRafRef.current) cancelAnimationFrame(viewAnimRafRef.current);
      const start = { ...liveTransformRef.current };
      const duration = reducedMotion ? 0 : readMs(figureRef.current, '--dur-page', 700);
      const commit = () => {
        behavior.transform(select(el), zoomIdentity.translate(target.x, target.y).scale(target.k));
        setViewTransitioning(false);
        onDone?.();
      };
      if (duration <= 0) {
        commit();
        return;
      }
      setViewTransitioning(true);
      let t0 = 0;
      const step = (now: number) => {
        if (t0 === 0) t0 = now;
        const p = Math.min((now - t0) / duration, 1);
        const e = easeInOut(p);
        const cur = {
          k: start.k + (target.k - start.k) * e,
          x: start.x + (target.x - start.x) * e,
          y: start.y + (target.y - start.y) * e,
        };
        liveTransformRef.current = cur;
        const g = rootGRef.current;
        if (g) g.setAttribute('transform', `translate(${cur.x},${cur.y}) scale(${cur.k})`);
        const figure = figureRef.current;
        if (figure) figure.style.setProperty('--map-counter', String(1 / cur.k));
        scheduleCacheDrawRef.current();
        if (p < 1) {
          viewAnimRafRef.current = requestAnimationFrame(step);
        } else {
          viewAnimRafRef.current = 0;
          commit();
        }
      };
      viewAnimRafRef.current = requestAnimationFrame(step);
    },
    [reducedMotion],
  );

  useEffect(() => {
    return () => {
      if (viewAnimRafRef.current) cancelAnimationFrame(viewAnimRafRef.current);
    };
  }, []);

  /**
   * A1 fix: the free area of the stage, with the overlay chrome subtracted.
   * The top bar (period label, view buttons, caption) spans the full
   * width, so only a top inset is needed for it. The zoom column and the
   * keys button are both anchored to the stage's bottom edge, so together
   * they only need a bottom inset — not left/right insets across the whole
   * height — which is what leaves the fit box's full width usable. Reads
   * live `getBoundingClientRect()`s, so it only has to run when a fit
   * actually runs (button press, cluster activation, initial mount),
   * never per animation frame.
   */
  const getSafeRect = useCallback((): SafeRect => {
    const stage = stageRef.current;
    const fallback: SafeRect = { x0: 0, y0: 0, x1: size.width, y1: size.height };
    if (!stage) return fallback;
    const stageRect = stage.getBoundingClientRect();
    const margin = 12;
    const topbarRect = topbarRef.current?.getBoundingClientRect() ?? null;
    const zoomColRect = zoomColRef.current?.getBoundingClientRect() ?? null;
    const keysBtnRect = keysButtonRef.current?.getBoundingClientRect() ?? null;
    const rawTopInset = topbarRect ? Math.max(topbarRect.bottom - stageRect.top + margin, 0) : 0;
    const rawBottomInset = Math.max(
      zoomColRect ? stageRect.bottom - zoomColRect.top + margin : 0,
      keysBtnRect ? stageRect.bottom - keysBtnRect.top + margin : 0,
    );
    // Cap each inset to a fraction of the stage height: the whole-ocean fit
    // has to show the entire Bay-of-Bengal-to-Java extent, and on a tall,
    // narrow stage the topbar (period label + view buttons + caption) plus
    // the zoom column can otherwise eat most of the height between them,
    // leaving a sliver too small to fit anything into without forcing the
    // scale below what MIN_SCALE allows — which is what pushed content
    // (and whole clusters) up under the chrome in the first place. Capping
    // guarantees a usable middle band always exists, at the (rare, only at
    // extreme aspect ratios) cost of the inset being a slight underestimate.
    const maxInsetEach = stageRect.height * 0.22;
    const topInset = Math.min(rawTopInset, maxInsetEach);
    const bottomInset = Math.min(rawBottomInset, maxInsetEach);
    const x1 = Math.max(stageRect.width, 1);
    const y0 = topInset;
    const y1 = Math.max(stageRect.height - bottomInset, y0 + 1);
    return { x0: 0, y0, x1, y1 };
  }, [size]);

  /**
   * A4 fix: the scale needed to fully de-cluster the tightest pair of
   * markers anywhere in the (unfiltered-by-period) data — e.g. the
   * Bhubaneswar-area ports/sites, which sit closer together than almost
   * anything else in the dataset. `clusterThresholdPx(MARKER_R_COAST)` is
   * the largest cluster threshold either view ever uses (28px markers, the
   * coast size); a pair needs screen distance at or above it to render as
   * two separate markers, so this is `threshold / minDistance`, with a 1.5x
   * margin so zooming to the max clearly separates them rather than
   * landing right on the boundary. O(n^2) over ~26 markers, recomputed
   * only when the marker set itself changes (a period switch), never per
   * frame.
   */
  const declusterCeiling = useMemo(() => {
    let minDist = Infinity;
    for (let i = 0; i < markers.length; i++) {
      const a = markers[i]!;
      for (let j = i + 1; j < markers.length; j++) {
        const b = markers[j]!;
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d > 0 && d < minDist) minDist = d;
      }
    }
    if (!Number.isFinite(minDist) || minDist <= 0) return MAX_SCALE;
    const threshold = clusterThresholdPx(MARKER_R_COAST) * 1.5;
    return threshold / minDist;
  }, [markers]);

  /**
   * A1/A4 fix: the scale actually *applied* to a view fit is clamped to the
   * sane, static `MAX_SCALE` (never further, however tiny the fit's own
   * bounding box is) — that clamp is what `computeFit` enforces by being
   * called with `MAX_SCALE` as its own ceiling below, not
   * `Number.MAX_SAFE_INTEGER`. The d3-zoom *scaleExtent* ceiling (what "+"
   * and pinch/wheel are allowed to reach) is a separate, looser number:
   * whichever is larger of roughly 4x the applied scale or
   * `declusterCeiling`, so a child can still zoom in further by hand to
   * fully separate the tightest cluster in the data, without the
   * auto-fit itself ever landing on an unreadable ~500x view.
   */
  const fitWithHeadroom = useCallback(
    (points: Array<{ x: number; y: number }>, padPct: number, minSpanPx = 0) => {
      const box = getSafeRect();
      const applied = computeFit(points, box, padPct, MIN_SCALE, MAX_SCALE, minSpanPx);
      const ceiling = Math.max(MAX_SCALE, applied.k * 4, declusterCeiling);
      scaleExtentMaxRef.current = ceiling;
      zoomRef.current?.scaleExtent([MIN_SCALE, ceiling]);
      // Sanity assertion: every point this fit targeted should land inside
      // the safe rect it was fitted to (a small epsilon for rounding). A
      // violation means a future change broke the fit maths, not that the
      // page is in danger — warn only, never throw.
      const eps = 1;
      for (const p of points) {
        const px = applied.k * p.x + applied.x;
        const py = applied.k * p.y + applied.y;
        if (px < box.x0 - eps || px > box.x1 + eps || py < box.y0 - eps || py > box.y1 + eps) {
          // eslint-disable-next-line no-console
          console.warn('[AtlasMap] view fit left a target point outside the safe rect', { point: p, applied, box });
          break;
        }
      }
      return applied;
    },
    [getSafeRect, declusterCeiling],
  );

  /** A1: fit to every published Kalinga port active in the current period. */
  const coastFitPoints = useCallback(() => {
    const active = markers.filter((m) => m.shape === 'port' && !m.inactive);
    return active.length > 0 ? active : markers.filter((m) => m.shape === 'port');
  }, [markers]);

  /** A1: fit to every visible port, Kalinga and foreign destinations alike. */
  const oceanFitPoints = useCallback(() => markers.filter((m) => m.kind === 'port'), [markers]);

  const showCoast = useCallback(() => {
    const pts = coastFitPoints();
    if (pts.length === 0) return;
    setViewMode('coast');
    animateTo(fitWithHeadroom(pts, COAST_PADDING, minFitSpanPx));
  }, [coastFitPoints, fitWithHeadroom, minFitSpanPx, animateTo]);

  const showOcean = useCallback(() => {
    const pts = oceanFitPoints();
    if (pts.length === 0) return;
    setViewMode('ocean');
    // A4 fix: less padding than the coast fit — the ocean view already has
    // to squeeze a much taller geographic extent into the same
    // chrome-reduced safe area, so every extra percent of padding shrinks
    // the resulting scale further and makes clustering chain more markers
    // together than genuinely belong in one bubble.
    animateTo(fitWithHeadroom(pts, OCEAN_PADDING));
  }, [oceanFitPoints, fitWithHeadroom, animateTo]);

  /**
   * A1/A3 fix: re-fits the *current* view (never overriding a manual
   * pan/zoom) whenever this runs. Used both for the very first fit on
   * mount and for every later stage-size change — the phone dialog moves
   * this same AtlasMap instance into a differently-sized host via the
   * portal in Atlas.tsx, and the transform fitted for the inline host's
   * size is meaningless once the stage is a different size, leaving every
   * marker off-screen. Goes through `animateTo` (liveTransformRef, one
   * committed render) except the very first time, which applies instantly
   * — there is nothing to animate *from* yet.
   */
  const refitCurrentView = useCallback(
    (instant: boolean) => {
      if (viewMode === 'manual') return;
      const pts = viewMode === 'ocean' ? oceanFitPoints() : coastFitPoints();
      if (pts.length === 0) return;
      const padPct = viewMode === 'ocean' ? OCEAN_PADDING : COAST_PADDING;
      const span = viewMode === 'ocean' ? 0 : minFitSpanPx;
      if (instant) {
        const el = stageRef.current;
        const behavior = zoomRef.current;
        if (!el || !behavior) return;
        const target = fitWithHeadroom(pts, padPct, span);
        behavior.transform(select(el), zoomIdentity.translate(target.x, target.y).scale(target.k));
      } else {
        animateTo(fitWithHeadroom(pts, padPct, span));
      }
    },
    [viewMode, oceanFitPoints, coastFitPoints, fitWithHeadroom, minFitSpanPx, animateTo],
  );
  // The size-change effect below only needs the *latest* refit function,
  // not to re-run every time viewMode (or anything refitCurrentView
  // depends on) changes — those are handled by showCoast/showOcean's own
  // direct animateTo calls. Routing through a ref keeps this effect's own
  // dependency list to just `size`, so a view-button click never also
  // triggers a redundant second fit from here.
  const refitCurrentViewRef = useRef(refitCurrentView);
  useEffect(() => {
    refitCurrentViewRef.current = refitCurrentView;
  }, [refitCurrentView]);

  // A1: fit on first mount, computed at runtime from the published data —
  // never hard-coded coordinates. Waits for the ResizeObserver's first real
  // measurement: markers/projection are derived from the `size` state, not
  // the DOM directly, so fitting before then would compute the target
  // transform for the right viewport but the wrong (stale) marker
  // positions. A3 fix: also re-fires on every later `size` change (not
  // gated by "first mount only" any more), so moving the map into the
  // phone dialog's differently-sized host re-fits instead of leaving the
  // inline host's stale transform in place.
  useEffect(() => {
    if (!sizeMeasuredRef.current) return;
    if (size.width < 2 || size.height < 2) return;
    const instant = !didInitialFitRef.current;
    didInitialFitRef.current = true;
    refitCurrentViewRef.current(instant);
  }, [size]);

  // A1: "reset" now means the same thing as pressing "Show the Odisha
  // coast" — the whole point of the default-view fit is that it is what a
  // reset should return to, not the old whole-Bay-of-Bengal identity
  // transform.
  const resetView = showCoast;

  // -- Canvas draw -----------------------------------------------------------
  //
  // Two paths, both reading the *live* transform (a ref, not React state):
  //
  //   - `drawFull` strokes land/graticule/rivers with geoPath at the current
  //     transform. Sharp at any zoom, but it walks every polygon, so it is
  //     only used to paint the resting frame: once after geodata/size/zoom
  //     settle, never on every zoom tick.
  //   - `drawFromCache` blits a bitmap of the basemap rendered once at
  //     identity transform (`paintOffscreen`), scaled/translated onto the
  //     visible canvas with a single drawImage. That is what a zoom or pan
  //     gesture uses while it is in motion: O(1) per frame instead of
  //     O(polygon count), at the cost of a softer edge until the gesture
  //     ends and `drawFull` repaints it crisp.
  //
  // Colours, fills and strokes are unchanged from the previous single-path
  // version; only when full-quality vector work happens has changed.

  // map-style-light.md: fallbacks match the light basemap tokens now
  // (pale sea/land), not the old dark-navy map.
  const readColours = useCallback((figure: Element | null) => ({
    graticule: readVar(figure, '--map-graticule', 'rgba(111,168,192,0.25)'),
    land: readVar(figure, '--map-land', '#f2eee6'),
    edge: readVar(figure, '--map-land-edge', '#d9cdb8'),
    river: readVar(figure, '--map-river', '#6fa8c0'),
  }), []);

  const sizeCanvas = useCallback((canvas: HTMLCanvasElement, width: number, height: number, dpr: number) => {
    const pxW = Math.round(width * dpr);
    const pxH = Math.round(height * dpr);
    if (canvas.width !== pxW) canvas.width = pxW;
    if (canvas.height !== pxH) canvas.height = pxH;
  }, []);

  const paintVector = useCallback(
    (ctx: CanvasRenderingContext2D, dpr: number, k: number, x: number, y: number) => {
      const { width, height } = size;
      const figure = figureRef.current;
      const { graticule, land, edge, river } = readColours(figure);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * x, dpr * y);

      const p = geoPath(projection, ctx);

      ctx.beginPath();
      p(geoGraticule10());
      ctx.lineWidth = 0.6 / k;
      ctx.strokeStyle = graticule;
      ctx.stroke();

      if (geo.land) {
        ctx.beginPath();
        p(geo.land);
        ctx.fillStyle = land;
        ctx.fill();
        ctx.lineWidth = 0.9 / k;
        ctx.strokeStyle = edge;
        ctx.stroke();
      }

      if (geo.rivers.length > 0) {
        ctx.beginPath();
        for (const river2 of geo.rivers) p(river2);
        ctx.lineWidth = 0.7 / k;
        ctx.strokeStyle = river;
        ctx.stroke();
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
    },
    [geo, projection, size, readColours],
  );

  /** Full-quality redraw of the visible canvas at an arbitrary transform. */
  const drawFull = useCallback(
    (t: { k: number; x: number; y: number }) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const { width, height } = size;
      if (width < 2 || height < 2) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      sizeCanvas(canvas, width, height, dpr);
      paintVector(ctx, dpr, t.k, t.x, t.y);
    },
    [size, sizeCanvas, paintVector],
  );

  /** Renders the basemap once at identity transform into an offscreen bitmap. */
  const paintOffscreen = useCallback(() => {
    const { width, height } = size;
    if (width < 2 || height < 2) return;
    let off = offscreenRef.current;
    if (!off) {
      off = document.createElement('canvas');
      offscreenRef.current = off;
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    sizeCanvas(off, width, height, dpr);
    const ctx = off.getContext('2d');
    if (!ctx) return;
    paintVector(ctx, dpr, 1, 0, 0);
    offscreenReadyRef.current = true;
  }, [size, sizeCanvas, paintVector]);

  /** Cheap redraw for mid-gesture ticks: blit the cached bitmap, transformed. */
  const drawFromCache = useCallback(
    (t: { k: number; x: number; y: number }) => {
      const canvas = canvasRef.current;
      const off = offscreenRef.current;
      if (!canvas || !off || !offscreenReadyRef.current) {
        drawFull(t);
        return;
      }
      const { width, height } = size;
      if (width < 2 || height < 2) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      sizeCanvas(canvas, width, height, dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.setTransform(dpr * t.k, 0, 0, dpr * t.k, dpr * t.x, dpr * t.y);
      ctx.drawImage(off, 0, 0, width, height);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    },
    [size, sizeCanvas, drawFull],
  );

  /** Coalesce mid-gesture redraws to at most one per animation frame. */
  const scheduleCacheDraw = useCallback(() => {
    if (canvasRafRef.current) return;
    canvasRafRef.current = requestAnimationFrame(() => {
      canvasRafRef.current = 0;
      drawFromCache(liveTransformRef.current);
    });
  }, [drawFromCache]);

  // The d3-zoom setup effect below only ever runs once (empty deps — the
  // zoom behavior is created once for the stage's lifetime), so its 'zoom'
  // callback closes over whatever `scheduleCacheDraw` was at mount. Route
  // every call through a ref that is kept current every render instead, so
  // a gesture always schedules a draw using the latest `size`/`geo`.
  const scheduleCacheDrawRef = useRef(scheduleCacheDraw);
  useEffect(() => {
    scheduleCacheDrawRef.current = scheduleCacheDraw;
  }, [scheduleCacheDraw]);

  // Repaint the bitmap cache and the resting frame whenever geodata or size
  // change; also whenever the committed transform changes (gesture end, or
  // a keyboard/button zoom step), so the on-screen canvas stays crisp.
  useEffect(() => {
    paintOffscreen();
    const frame = requestAnimationFrame(() => drawFull(transform));
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo, size, paintOffscreen]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => drawFull(transform));
    return () => cancelAnimationFrame(frame);
  }, [transform, drawFull]);

  useEffect(() => {
    return () => {
      if (canvasRafRef.current) cancelAnimationFrame(canvasRafRef.current);
    };
  }, []);

  // -- Selection -----------------------------------------------------------
  const selectedKey = selection ? `${selection.kind}:${selection.id}` : null;

  const handleSelect = useCallback(
    (kind: MapSelection['kind'], id: string) => {
      lastSelectedKey.current = `${kind}:${id}`;
      onSelect?.({ kind, id });
    },
    [onSelect],
  );

  useEffect(() => {
    if (focusReturnToken === 0) return;
    const key = lastSelectedKey.current;
    if (!key) return;
    nodeRefs.current.get(key)?.focus();
  }, [focusReturnToken]);

  // -- Ship along the selected route --------------------------------------
  const selectedRoute =
    selection?.kind === 'route' ? routeData.find((r) => r.id === selection.id) ?? null : null;
  const shipKind = selectedRoute ? SHIP_FOR_MODE[selectedRoute.mode] : null;
  const shipVisible = selectedRoute !== null && !selectedRoute.inactive && shipKind !== null;
  const shipSymbol = shipKind === 'river' ? `ship-river-${uid}` : `ship-sailing-${uid}`;

  useEffect(() => {
    const g = shipRef.current;
    if (!g || !selectedRoute || !shipVisible) return;
    const pathEl = routePathRefs.current.get(selectedRoute.id);
    if (!pathEl || typeof pathEl.getTotalLength !== 'function') return;

    const total = pathEl.getTotalLength();
    if (!Number.isFinite(total) || total <= 0) return;

    const place = (distance: number) => {
      const here = pathEl.getPointAtLength(distance);
      const ahead = pathEl.getPointAtLength(Math.min(distance + Math.max(total / 200, 0.5), total));
      const angle = (Math.atan2(ahead.y - here.y, ahead.x - here.x) * 180) / Math.PI;
      g.setAttribute('transform', `translate(${here.x},${here.y}) rotate(${angle})`);
    };

    const duration = readMs(figureRef.current, '--dur-sail', 6000);
    if (reducedMotion || duration <= 0) {
      // route-styles.md: static at the midpoint, oriented along the tangent.
      place(total / 2);
      g.dataset['sailing'] = 'true';
      return;
    }

    // Plays once, bow-first, then fades out; re-selecting replays it.
    let frame = 0;
    let start = 0;
    place(0);
    g.dataset['sailing'] = 'true';
    const step = (now: number) => {
      if (start === 0) start = now;
      const t = Math.min((now - start) / duration, 1);
      place(easeInOut(t) * total);
      if (t < 1) {
        frame = requestAnimationFrame(step);
      } else {
        g.dataset['sailing'] = 'false';
      }
    };
    frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
      g.dataset['sailing'] = 'false';
    };
    // `transform.k` is deliberately not a dependency: the ship rides the
    // unzoomed path geometry and only its counter-scale changes with zoom.
  }, [selectedRoute, shipVisible, reducedMotion, activePeriod]);

  // -- Keyboard-shortcuts dialog ------------------------------------------
  useEffect(() => {
    const dialog = keysDialogRef.current;
    if (!dialog) return;
    if (showKeys && !dialog.open && typeof dialog.showModal === 'function') {
      dialog.showModal();
      keysCloseRef.current?.focus();
    }
    if (!showKeys && dialog.open) dialog.close();
  }, [showKeys]);

  // -- Keyboard on the figure ---------------------------------------------
  const onFigureKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLElement>) => {
      switch (event.key) {
        case '+':
        case '=':
          event.preventDefault();
          zoomBy(ZOOM_STEP);
          break;
        case '-':
        case '_':
          event.preventDefault();
          zoomBy(1 / ZOOM_STEP);
          break;
        case 'ArrowUp':
          event.preventDefault();
          panBy(0, PAN_STEP);
          break;
        case 'ArrowDown':
          event.preventDefault();
          panBy(0, -PAN_STEP);
          break;
        case 'ArrowLeft':
          event.preventDefault();
          panBy(PAN_STEP, 0);
          break;
        case 'ArrowRight':
          event.preventDefault();
          panBy(-PAN_STEP, 0);
          break;
        case '0':
          event.preventDefault();
          resetView();
          break;
        case '?':
          event.preventDefault();
          setShowKeys((v) => !v);
          break;
        case 'Escape':
          // The keys dialog is the topmost layer and closes itself natively.
          // A3: inside the phone full-screen dialog, stop the event so
          // closing a selected marker's panel doesn't also close the whole
          // dialog — only the topmost layer responds to one Escape.
          if (!showKeys && selection) {
            event.preventDefault();
            event.stopPropagation();
            onClear?.();
          }
          break;
        default:
          break;
      }
    },
    [zoomBy, panBy, resetView, onClear, selection, showKeys],
  );

  const onNodeKeyDown = useCallback(
    (event: ReactKeyboardEvent<SVGGElement>, kind: MapSelection['kind'], id: string) => {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
        event.preventDefault();
        event.stopPropagation();
        handleSelect(kind, id);
      }
    },
    [handleSelect],
  );

  const setNodeRef = useCallback((key: string, el: SVGGElement | null) => {
    if (el) nodeRefs.current.set(key, el);
    else nodeRefs.current.delete(key);
  }, []);

  const setRoutePathRef = useCallback((id: string, el: SVGPathElement | null) => {
    if (el) routePathRefs.current.set(id, el);
    else routePathRefs.current.delete(id);
  }, []);

  // -- Render --------------------------------------------------------------
  const { k, x, y } = transform;
  const rootTransform = `translate(${x},${y}) scale(${k})`;
  /**
   * Counter-scale for markers/ship, as a CSS custom property rather than a
   * per-element inline `scale(...)`: it inherits from the figure down to
   * every marker with a single write, and the zoom handler updates it
   * directly on the DOM mid-gesture without touching this JSX at all (see
   * the 'zoom' listener above). This value (from committed state) only
   * matters at mount and at the end of each gesture, when React re-renders
   * and reasserts it.
   */
  const mapCounterStyle = { '--map-counter': 1 / k } as CSSProperties;
  const keysTitleId = `atlas-keys-title-${uid}`;
  const descId = `atlas-map-desc-${uid}`;
  const activeMarkers = markers.filter((m) => !m.inactive);
  const activeRoutes = routeData.filter((r) => !r.inactive);
  // A1 fix: compare against the dynamic ceiling `fitWithHeadroom` raises,
  // not the static MAX_SCALE — otherwise "+" reads disabled right after a
  // tight coast fit lands exactly on the old, lower ceiling.
  const canZoomIn = k < scaleExtentMaxRef.current - 0.001;
  const canZoomOut = k > MIN_SCALE + 0.001;

  /**
   * A4 (map-style-light.md): marker size follows the named view, not the
   * raw zoom level — 28px diameter (coast) or 22px (whole-ocean); manual
   * pan/zoom keeps the coast size.
   */
  const markerRadius = viewMode === 'ocean' ? MARKER_R_OCEAN : MARKER_R_COAST;
  // map-style-light.md sizes table: ring/outline widths step down slightly
  // at the whole-ocean view's smaller pins.
  const ringW = markerRadius >= MARKER_R_COAST ? 2.5 : 2;
  const outlineW = markerRadius >= MARKER_R_COAST ? 1.5 : 1.25;
  const portGlyphId = `port-glyph-${uid}`;
  const siteGlyphId = `site-glyph-${uid}`;

  /**
   * A4 fix: cluster bubbles at *every* view (not just whole-ocean) and
   * across every marker kind (ports and sites both, since bigger round
   * markers can overlap each other regardless of kind). The old rule
   * "every Kalinga port keeps a permanent label at the coast view" is
   * replaced entirely by "no marker (or its label) ever overlaps another
   * marker, a label or the overlay chrome" — clustering is what guarantees
   * that for markers themselves.
   *
   * A cluster bubble is always rendered at a fixed 28px diameter (see
   * `.cluster-bubble` in atlas.css), same as a coast-view marker — bigger
   * than an ocean-view marker's 22px. A single greedy pass using only the
   * *current* view's marker-to-marker threshold can therefore still leave
   * two resulting bubbles (or a bubble and a lone marker) touching, so this
   * merges iteratively — any two nodes (marker or already-merged cluster)
   * closer than the threshold appropriate to *their own* rendered sizes —
   * until nothing more merges. A rendering shortcut, not a data concept;
   * recomputed only when the committed transform, marker size or view mode
   * change, never per animation frame.
   */
  const clustersResult = useMemo(() => {
    type Point = { key: string; id: string; x: number; y: number };
    type Node = { points: Point[] };
    // A4 fix: true single-linkage on *original* marker positions, not on a
    // shifting group centroid. Merging by centroid distance let two touching
    // markers pull their merged centroid within range of a third marker
    // that was never actually close to either one individually, chaining
    // transitively until "the whole ocean" collapsed into one giant
    // cluster. Checking every original pair instead — still Chebyshev, for
    // the same axis-aligned-box reason as the marker/label overlap fix —
    // means a merge only ever happens between markers that are genuinely
    // within one marker's footprint of each other.
    const threshold = markerRadius * 2 + MARKER_VISUAL_PAD;
    // A1 fix: the coast fit deliberately zooms in tight around a period's
    // active Kalinga ports (sometimes just one) — the whole point of that
    // fit is to make them visible. Letting the only active port disappear
    // into a cluster with nearby inactive neighbours would defeat it, so
    // active Kalinga ports never merge into a bubble at the coast view.
    // Sites are deliberately *not* protected the same way: several (e.g.
    // the Bhubaneswar-area group) really do sit within a couple of
    // kilometres of each other, and forcing them to stay individual at this
    // tight a zoom reintroduces real overlaps — clustering is the correct
    // outcome for those, with the bubble itself still visible and openable.
    const protectedKeys = new Set(
      viewMode === 'coast' ? markers.filter((m) => m.shape === 'port' && !m.inactive).map((m) => m.key) : [],
    );

    // Protected markers still take part in the proximity check — an
    // inactive marker sitting right on top of one would otherwise stay an
    // unmerged singleton and overlap it — but a merge involving a
    // protected marker never turns it into a bubble; it silently absorbs
    // the other (non-protected) marker instead, hiding the redundant one
    // rather than showing two overlapping dots. Two protected markers
    // never merge with each other: both always stay individually visible.
    type MergeNode = Node & { protectedMember: boolean };
    let nodes: MergeNode[] = markers.map((m) => ({
      points: [{ key: m.key, id: m.id, x: m.x, y: m.y }],
      protectedMember: protectedKeys.has(m.key),
    }));

    const closeEnough = (a: Node, b: Node) => {
      for (const p of a.points) {
        const px = p.x * k + x;
        const py = p.y * k + y;
        for (const q of b.points) {
          const qx = q.x * k + x;
          const qy = q.y * k + y;
          if (Math.max(Math.abs(px - qx), Math.abs(py - qy)) < threshold) return true;
        }
      }
      return false;
    };

    let merged = true;
    while (merged) {
      merged = false;
      outer: for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i]!;
          const b = nodes[j]!;
          if (a.protectedMember && b.protectedMember) continue; // both stay individual
          if (closeEnough(a, b)) {
            nodes.splice(j, 1);
            nodes.splice(i, 1, { points: [...a.points, ...b.points], protectedMember: a.protectedMember || b.protectedMember });
            merged = true;
            break outer;
          }
        }
      }
    }

    const bubbleClusters = nodes
      .filter((n) => !n.protectedMember && n.points.length > 1)
      .map((n) => ({
        key: `cluster:${n.points.map((p) => p.key).join('-')}`,
        x: n.points.reduce((s, p) => s + p.x, 0) / n.points.length,
        y: n.points.reduce((s, p) => s + p.y, 0) / n.points.length,
        keys: n.points.map((p) => p.key),
        ids: n.points.map((p) => p.id),
      }));

    // A protected node that absorbed one or more other markers renders as
    // just the protected marker — the absorbed ones are hidden (they never
    // get their own bubble, since the protected marker already occupies
    // that spot), never as a group the protected marker is folded into.
    const hidden = nodes
      .filter((n) => n.protectedMember && n.points.length > 1)
      .flatMap((n) => n.points.filter((p) => !protectedKeys.has(p.key)).map((p) => p.key));

    return { bubbles: bubbleClusters, hiddenKeys: hidden };
  }, [markers, k, x, y, markerRadius, viewMode]);

  const clusters = clustersResult.bubbles;
  const clusteredKeys = useMemo(
    () => new Set([...clusters.flatMap((c) => c.keys), ...clustersResult.hiddenKeys]),
    [clusters, clustersResult.hiddenKeys],
  );

  /** A4: activating a cluster zooms to fit it, then focuses the first marker. */
  const activateCluster = useCallback(
    (cluster: { keys: string[] }) => {
      const pts = markers.filter((m) => cluster.keys.includes(m.key));
      if (pts.length === 0) return;
      setViewMode('manual');
      animateTo(fitWithHeadroom(pts, 0.4), () => {
        const firstKey = cluster.keys[0];
        if (firstKey) nodeRefs.current.get(firstKey)?.focus();
      });
    },
    [markers, fitWithHeadroom, animateTo],
  );

  /**
   * A4 fix (map-style-light.md): which markers show a name, and where
   * around the dot. The old "every Kalinga port keeps a permanent label at
   * the coast view" rule is gone — with 28px round markers, forcing a
   * label on regardless of collisions is exactly what produced the
   * overlaps the coordinator flagged. The rule now is unconditional:
   * nothing ever overlaps another marker, another label or the overlay
   * chrome. Every candidate direction around the dot (right, left, above,
   * below, then the four diagonals, offset far enough to clear the dot's
   * own — possibly 28px — footprint) is tried in turn; the first that
   * collides with nothing wins. If none do, the label is hidden rather
   * than shown overlapping — the marker itself (already guaranteed clear
   * of its neighbours by clustering) still carries the full name in its
   * `aria-label`, so nothing is lost to a screen reader. Markers folded
   * into a cluster bubble don't get a label of their own — the bubble
   * speaks for them. Computed once per view fit (keyed on the committed
   * x/y/k, marker size and cluster set, never the live gesture ref, and on
   * a fresh read of the chrome rects), never per animation frame.
   */
  const labelInfo = useMemo(() => {
    const map = new Map<string, { show: boolean; dx: number; dy: number; anchor: 'start' | 'end' | 'middle' }>();
    const safe = getSafeRect();
    const visible = markers.filter((m) => !clusteredKeys.has(m.key));
    const priority = [...visible].sort((a, b) => {
      const aScore = (selectedKey === a.key ? 2 : 0) + (a.inactive ? 0 : 1);
      const bScore = (selectedKey === b.key ? 2 : 0) + (b.inactive ? 0 : 1);
      return bScore - aScore;
    });
    const charW = 6.4;
    const lineH = 14;
    const radiusFor = (_m: MarkerDatum) => markerRadius;

    // Every visible marker's own circular footprint (plus every cluster
    // bubble's) is an obstacle no *other* marker's label may sit on.
    const markerBoxes = new Map<string, { x0: number; y0: number; x1: number; y1: number }>();
    for (const m of visible) {
      const px = m.x * k + x;
      const py = m.y * k + y;
      const r = radiusFor(m);
      markerBoxes.set(m.key, { x0: px - r, y0: py - r, x1: px + r, y1: py + r });
    }
    const clusterBoxes = clusters.map((c) => {
      const px = c.x * k + x;
      const py = c.y * k + y;
      return { x0: px - 14, y0: py - 14, x1: px + 14, y1: py + 14 };
    });

    const placedBoxes: Array<{ x0: number; y0: number; x1: number; y1: number }> = [];

    const boxFor = (px: number, py: number, dx: number, dy: number, anchor: string, textWidth: number) => {
      let x0: number;
      if (anchor === 'start') x0 = px + dx;
      else if (anchor === 'end') x0 = px + dx - textWidth;
      else x0 = px + dx - textWidth / 2;
      return { x0, y0: py + dy - lineH + 3, x1: x0 + textWidth, y1: py + dy + 4 };
    };
    const fitsChrome = (b: { x0: number; y0: number; x1: number; y1: number }) =>
      b.x0 >= safe.x0 && b.x1 <= safe.x1 && b.y0 >= safe.y0 && b.y1 <= safe.y1;
    const intersects = (
      a: { x0: number; y0: number; x1: number; y1: number },
      b: { x0: number; y0: number; x1: number; y1: number },
    ) => !(a.x1 <= b.x0 || a.x0 >= b.x1 || a.y1 <= b.y0 || a.y0 >= b.y1);
    const collidesAny = (b: { x0: number; y0: number; x1: number; y1: number }, selfKey: string) => {
      if (placedBoxes.some((p) => intersects(b, p))) return true;
      if (clusterBoxes.some((p) => intersects(b, p))) return true;
      for (const [key, mb] of markerBoxes) {
        if (key !== selfKey && intersects(b, mb)) return true;
      }
      return false;
    };

    for (const m of priority) {
      const px = m.x * k + x;
      const py = m.y * k + y;
      const textWidth = m.name.length * charW + 4;
      const gap = radiusFor(m) + MARKER_VISUAL_PAD;
      // kid-experience.md A1/A4: every Kalinga port keeps a *permanent*
      // label at the coast view — never hidden, only routed around. A
      // cluster swallows the marker entirely (no label needed), so this
      // only ever applies to markers that reached this loop at all.
      const forced = viewMode === 'coast' && m.shape === 'port' && !m.inactive;
      const candidates: Array<{ dx: number; dy: number; anchor: 'start' | 'end' | 'middle' }> = [
        { dx: gap, dy: 4, anchor: 'start' }, // right
        { dx: -gap, dy: 4, anchor: 'end' }, // left
        { dx: 0, dy: -gap - 3, anchor: 'middle' }, // above
        { dx: 0, dy: gap + 14, anchor: 'middle' }, // below
        { dx: gap * 0.75, dy: -gap * 0.6, anchor: 'start' }, // upper-right
        { dx: -gap * 0.75, dy: -gap * 0.6, anchor: 'end' }, // upper-left
        { dx: gap * 0.75, dy: gap * 0.8 + 8, anchor: 'start' }, // lower-right
        { dx: -gap * 0.75, dy: gap * 0.8 + 8, anchor: 'end' }, // lower-left
      ];

      let chosen: (typeof candidates)[number] | null = null;
      let chosenBox: { x0: number; y0: number; x1: number; y1: number } | null = null;
      for (const c of candidates) {
        const b = boxFor(px, py, c.dx, c.dy, c.anchor, textWidth);
        if (fitsChrome(b) && !collidesAny(b, m.key)) {
          chosen = c;
          chosenBox = b;
          break;
        }
      }
      if (!chosen || !chosenBox) {
        if (!forced) {
          // Nothing was collision-free: hide rather than overlap. The full
          // name is still in the marker's aria-label.
          map.set(m.key, { show: false, dx: 11, dy: 4, anchor: 'start' });
          continue;
        }
        // Forced (permanent) label: never hide it. Pick whichever
        // candidate collides least, preferring one that at least clears
        // the chrome — a coast-view fit box is sized precisely so its
        // active ports normally *do* have a free slot; this only matters
        // as a rare fallback.
        let bestScore = Infinity;
        for (const c of candidates) {
          const b = boxFor(px, py, c.dx, c.dy, c.anchor, textWidth);
          let score = fitsChrome(b) ? 0 : 1000;
          if (placedBoxes.some((p) => intersects(b, p))) score += 10;
          if (clusterBoxes.some((p) => intersects(b, p))) score += 10;
          for (const [key, mb] of markerBoxes) if (key !== m.key && intersects(b, mb)) score += 10;
          if (score < bestScore) {
            bestScore = score;
            chosen = c;
            chosenBox = b;
          }
        }
      }
      if (!chosen || !chosenBox) continue;
      placedBoxes.push(chosenBox);
      map.set(m.key, { show: true, dx: chosen.dx, dy: chosen.dy, anchor: chosen.anchor });
    }
    return map;
  }, [markers, k, x, y, selectedKey, markerRadius, clusters, clusteredKeys, viewMode, getSafeRect]);

  const periodYears = period ? `${formatYear(period.start_year)} – ${formatYear(period.end_year)}` : '';

  /**
   * atlas-map.md: show the reconstruction caveat whenever anything on screen
   * is below "Strongly Supported", and default to showing it. Route waypoints
   * are themselves reconstructions, so any visible route triggers it too.
   */
  const showReconstructionCaveat =
    activeRoutes.length > 0 ||
    ports.some((p) => p.evidence_level === 'Probable' || p.evidence_level === 'Hypothetical') ||
    sites.some((s) => s.evidence_level === 'Probable' || s.evidence_level === 'Hypothetical');

  return (
    <div
      ref={figureRef}
      className="atlas-map"
      role="group"
      tabIndex={0}
      style={mapCounterStyle}
      aria-label={`Map of Kalinga trade routes, ${period?.label ?? 'all periods'}. Press question mark for keyboard help.`}
      aria-describedby={descId}
      onKeyDown={onFigureKeyDown}
    >
      <div className="atlas-map__stage" ref={stageRef}>
        <canvas className="atlas-map__canvas" ref={canvasRef} aria-hidden="true" />

        <svg
          className="atlas-map__svg"
          viewBox={`0 0 ${Math.max(size.width, 1)} ${Math.max(size.height, 1)}`}
          preserveAspectRatio="none"
        >
          <defs>
            {/* Original illustrations, CC BY-SA 4.0, from src/assets/ships/.
                Artistic reconstruction — not a historical document. */}
            <symbol id={`ship-sailing-${uid}`} viewBox="0 0 64 64">
              <title>Sailing vessel</title>
              <path
                fill="currentColor"
                d="M6,40 Q6,34 14,33 L40,31 Q46,30 47,24 Q48,18 44,13 Q52,15 55,21 Q58,27 54,32 Q60,33 60,38 Q60,44 52,46 L16,47 Q6,47 6,40 Z"
              />
              <path fill="currentColor" d="M29,6 L31,6 L31,24 L29,24 Z" />
              <path fill="currentColor" d="M31,8 L54,14 L54,26 L31,23 Z" />
              <path fill="currentColor" d="M30,6 L37,4.5 L30,8.5 Z" />
            </symbol>
            <symbol id={`ship-river-${uid}`} viewBox="0 0 64 64">
              <title>River boat</title>
              <path fill="currentColor" d="M4,38 Q4,34 8,34 L54,34 Q60,34 60,38 Q60,42 54,42 L8,42 Q4,42 4,38 Z" />
              <path fill="currentColor" d="M22,34 Q22,24 30,24 Q38,24 38,34 Z" />
              <path fill="currentColor" d="M8,40 L2,57 L5,58 L11,42 Z" />
            </symbol>
            {/* map-style-light.md marker glyphs, from src/assets/ports/.
                Original illustrations, CC BY-SA 4.0. Generic shapes, not
                specific historical objects — see each source file's <desc>. */}
            <symbol id={portGlyphId} viewBox="0 0 64 64">
              <title>Port glyph</title>
              <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="32" cy="16" r="7" strokeWidth={4} />
                <path d="M32,23 L32,50" strokeWidth={5} />
                <path d="M20,30 L44,30" strokeWidth={4} />
                <path d="M18,38 Q18,50 32,50 Q46,50 46,38" strokeWidth={5} />
              </g>
            </symbol>
            <symbol id={siteGlyphId} viewBox="0 0 64 64">
              <title>Site glyph</title>
              <path fill="currentColor" d="M14,54 L50,54 L50,50 L14,50 Z" />
              <path fill="currentColor" d="M18,50 L46,50 L46,44 L18,44 Z" />
              <path fill="currentColor" d="M22,44 Q22,28 32,24 Q42,28 42,44 Z" />
              <path fill="currentColor" d="M29,24 L35,24 L35,16 L29,16 Z" />
              <path fill="currentColor" d="M32,7 L36,16 L28,16 Z" />
            </symbol>
          </defs>

          <g ref={rootGRef} transform={rootTransform}>
            <g className="routes">
              {routeData.map((r) => (
                <g
                  key={r.key}
                  ref={(el) => setNodeRef(r.key, el)}
                  className="route"
                  role="button"
                  tabIndex={r.inactive ? -1 : 0}
                  aria-label={r.label}
                  data-mode={r.mode}
                  data-tier={r.tier}
                  data-inactive={String(r.inactive)}
                  data-selected={String(selectedKey === r.key)}
                  style={{ '--route-pattern-length': r.patternLength } as CSSProperties}
                  onClick={(e) => {
                    e.stopPropagation();
                    (e.currentTarget as SVGGElement).focus();
                    handleSelect('route', r.id);
                  }}
                  onKeyDown={(e) => onNodeKeyDown(e, 'route', r.id)}
                >
                  <path className="route-glow" d={r.d} aria-hidden="true" />
                  <path
                    className="route-line"
                    d={r.d}
                    aria-hidden="true"
                    strokeDasharray={r.dash}
                    ref={(el) => setRoutePathRef(r.id, el)}
                  />
                  <path className="route-hit" d={r.d} />
                </g>
              ))}
            </g>

            <g className="markers">
              {markers.map((m) => {
                if (clusteredKeys.has(m.key)) return null;
                const label = labelInfo.get(m.key);
                const selected = selectedKey === m.key;
                // map-style-light.md: a site marker is the same footprint as
                // a port at whichever view is active — only the shape
                // (diamond vs circle) differs, not the size.
                const shapeR = markerRadius;
                const outlineR = shapeR + ringW + outlineW;
                const ringR = shapeR + ringW;
                const glyphId = m.shape === 'port' ? portGlyphId : m.shape === 'site' ? siteGlyphId : null;
                const glyphSize = shapeR * 1.15;
                return (
                  <g
                    key={m.key}
                    ref={(el) => setNodeRef(m.key, el)}
                    className="marker"
                    role="button"
                    tabIndex={0}
                    aria-label={m.label}
                    data-kind={m.shape}
                    data-inactive={String(m.inactive)}
                    data-selected={String(selected)}
                    transform={`translate(${m.x},${m.y})`}
                    onClick={(e) => {
                      e.stopPropagation();
                      (e.currentTarget as SVGGElement).focus();
                      handleSelect(m.kind, m.id);
                    }}
                    onKeyDown={(e) => onNodeKeyDown(e, m.kind, m.id)}
                  >
                    {/* Counter-scale via the --map-counter custom property
                        (set on the figure), not a per-render inline scale():
                        the zoom handler updates it directly on the DOM. */}
                    <g className="marker-scale">
                      <circle className="marker-hit" r={HIT_RADIUS} />
                      <circle className="marker-glow" r={shapeR + 6} />
                      {selected && (
                        <circle
                          className="marker-select-ring"
                          r={shapeR + MARKER_RING_GAP}
                          fill="none"
                          strokeWidth={MARKER_RING_WIDTH}
                        />
                      )}
                      {m.shape === 'destination' ? (
                        // map-style-light.md: destination stays "unfilled
                        // concentric rings", deliberately plainer than a
                        // Kalinga place, with no glyph.
                        <>
                          <circle className="marker-shape" r={shapeR} />
                          <circle className="marker-core" r={shapeR * 0.46} />
                        </>
                      ) : m.shape === 'site' ? (
                        <>
                          <path className="marker-shape marker-outline" d={diamondPath(outlineR)} />
                          <path className="marker-shape marker-ring" d={diamondPath(ringR)} />
                          <path className="marker-fill" d={diamondPath(shapeR)} />
                          {glyphId && (
                            <use
                              className="marker-glyph"
                              href={`#${glyphId}`}
                              x={-glyphSize / 2}
                              y={-glyphSize / 2}
                              width={glyphSize}
                              height={glyphSize}
                            />
                          )}
                        </>
                      ) : (
                        <>
                          <circle className="marker-shape marker-outline" r={outlineR} />
                          <circle className="marker-shape marker-ring" r={ringR} />
                          <circle className="marker-fill" r={shapeR} />
                          {glyphId && (
                            <use
                              className="marker-glyph"
                              href={`#${glyphId}`}
                              x={-glyphSize / 2}
                              y={-glyphSize / 2}
                              width={glyphSize}
                              height={glyphSize}
                            />
                          )}
                        </>
                      )}
                      {label?.show && (
                        <text
                          className="marker-label"
                          x={label.dx}
                          y={label.dy}
                          textAnchor={label.anchor}
                        >
                          {m.name}
                        </text>
                      )}
                    </g>
                  </g>
                );
              })}
            </g>

            <g className="clusters">
              {clusters.map((c) => (
                <g
                  key={c.key}
                  className="cluster"
                  role="button"
                  tabIndex={0}
                  aria-label={`${plural(c.keys.length, 'place', 'places')} near here — activate to zoom in`}
                  transform={`translate(${c.x},${c.y})`}
                  onClick={(e) => {
                    e.stopPropagation();
                    activateCluster(c);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
                      e.preventDefault();
                      e.stopPropagation();
                      activateCluster(c);
                    }
                  }}
                >
                  <g className="marker-scale">
                    <circle className="cluster-hit" r={HIT_RADIUS} />
                    <circle className="marker-glow" r={14 + 6} />
                    {/* map-style-light.md: same anatomy as a single pin —
                        outline, white ring, fill — fixed 28px (r=14). */}
                    <circle className="cluster-outline" r={14 + ringW + outlineW} />
                    <circle className="cluster-ring" r={14 + ringW} />
                    <circle className="cluster-bubble" r={14} />
                    <text className="cluster-count" x={0} y={4}>
                      {c.keys.length}
                    </text>
                  </g>
                </g>
              ))}
            </g>

            {shipVisible && (
              <g className="ship" ref={shipRef} data-sailing="false" aria-hidden="true">
                <g className="marker-scale">
                  <use className="ship-glyph" href={`#${shipSymbol}`} x={-13} y={-13} width={26} height={26} />
                </g>
              </g>
            )}
          </g>
        </svg>

        {/* Period label sits on the map surface (atlas-map.md). */}
        <div className="atlas-map__topbar" ref={topbarRef}>
          <p className="atlas-map__period">
            {period?.label ?? 'All periods'}
            {periodYears !== '' && <span className="atlas-map__years"> · {periodYears}</span>}
            <span className="visually-hidden">
              {` — ${plural(activeMarkers.length, 'place', 'places')} and ${plural(
                activeRoutes.length,
                'route',
                'routes',
              )} in this period.`}
            </span>
          </p>
          {/* A1: default-view toggle. Neither button is pressed once the
              visitor has manually panned or zoomed. */}
          <div className="atlas-map__views" role="group" aria-label="Map view">
            <button
              type="button"
              className="view-btn"
              onClick={showCoast}
              aria-pressed={viewMode === 'coast'}
              aria-disabled={viewTransitioning}
            >
              <span aria-hidden="true">🏝</span> Show the Odisha coast
            </button>
            <button
              type="button"
              className="view-btn"
              onClick={showOcean}
              aria-pressed={viewMode === 'ocean'}
              aria-disabled={viewTransitioning}
            >
              <span aria-hidden="true">🌊</span> Show the whole ocean
            </button>
          </div>

          {/*
            A1 fix, narrow widths: the caption is the same text at every
            width (never reworded) but is collapsed behind a summary below
            the 600px boundary, so the top chrome the fit has to avoid is
            shorter on a phone screen. `caveatOpen` starts from the media
            query and is then independent of it, exactly like `legendOpen`
            below, so toggling it by hand doesn't get fought by re-renders.
          */}
          <details
            className="atlas-map__caveat"
            open={caveatOpen}
            onToggle={(e) => setCaveatOpen(e.currentTarget.open)}
          >
            <summary className="atlas-map__caveat-summary">About this map</summary>
            <p className="atlas-map__caveat-text">
              Modern coastline (Natural Earth); historical shorelines differ.
              {showReconstructionCaveat
                ? ' Approximate reconstruction — coastlines and some routes are drawn from historical and scholarly sources, not satellite survey.'
                : ''}
            </p>
          </details>
        </div>

        {hintVisible && (
          <div className="atlas-map__hint" role="status" aria-live="polite">
            <p>
              <span aria-hidden="true">🖱</span> Scroll to zoom in
              <br />
              Drag to look around
            </p>
            <button type="button" className="atlas-map__hint-close" onClick={dismissHint} aria-label="Close this tip">
              <span aria-hidden="true">×</span>
            </button>
          </div>
        )}

        <div className="atlas-map__zoom" ref={zoomColRef}>
          <button
            type="button"
            className="atlas-map__ctl"
            onClick={() => zoomBy(ZOOM_STEP)}
            aria-disabled={!canZoomIn}
            aria-label="Zoom in"
          >
            <span aria-hidden="true">+</span>
          </button>
          <button
            type="button"
            className="atlas-map__ctl"
            onClick={() => zoomBy(1 / ZOOM_STEP)}
            aria-disabled={!canZoomOut}
            aria-label="Zoom out"
          >
            <span aria-hidden="true">−</span>
          </button>
          <button type="button" className="atlas-map__ctl" onClick={resetView} aria-label="Reset view">
            <span aria-hidden="true">⟲</span>
          </button>
        </div>

        <button
          type="button"
          className="atlas-map__ctl atlas-map__keys-btn"
          ref={keysButtonRef}
          onClick={() => setShowKeys(true)}
          aria-label="How to move around the map"
        >
          <span aria-hidden="true">?</span>
        </button>

        {status === 'loading' && (
          <p className="atlas-map__status" role="status">
            Getting your map ready…
          </p>
        )}
        {status === 'error' && (
          <p className="atlas-map__status" role="status">
            The coastline data is missing. Run <code>npm run fetch:geo</code> to download the Natural Earth
            outlines into <code>public/geo/</code>. Ports and routes are still shown.
          </p>
        )}
      </div>

      <dialog
        className="keys-sheet"
        ref={keysDialogRef}
        aria-labelledby={keysTitleId}
        onClose={() => {
          setShowKeys(false);
          keysButtonRef.current?.focus();
        }}
      >
        <div className="sheet__head">
          <h3 className="sheet__title" id={keysTitleId}>
            How to move around the map
          </h3>
          <button
            type="button"
            className="atlas-panel__close"
            ref={keysCloseRef}
            onClick={() => setShowKeys(false)}
          >
            <span aria-hidden="true">×</span>
            <span className="visually-hidden">Close the shortcuts list</span>
          </button>
        </div>
        <dl className="keys-sheet__list">
          <div>
            <dt>Tab / Shift + Tab</dt>
            <dd>Move between routes, ports and sites</dd>
          </div>
          <div>
            <dt>Enter / Space</dt>
            <dd>Open the selected marker</dd>
          </div>
          <div>
            <dt>Esc</dt>
            <dd>Close the panel and return focus to the marker</dd>
          </div>
          <div>
            <dt>+ / =</dt>
            <dd>Zoom in</dd>
          </div>
          <div>
            <dt>−</dt>
            <dd>Zoom out</dd>
          </div>
          <div>
            <dt>Arrow keys</dt>
            <dd>Pan the map by 40 pixels</dd>
          </div>
          <div>
            <dt>0</dt>
            <dd>Reset the view</dd>
          </div>
          <div>
            <dt>?</dt>
            <dd>Show or hide this list</dd>
          </div>
          <div>
            <dt>Scroll</dt>
            <dd>Zoom in or out with a mouse wheel or trackpad</dd>
          </div>
        </dl>
      </dialog>

      <details
        className="atlas-map__legend"
        open={legendOpen}
        onToggle={(e) => setLegendOpen(e.currentTarget.open)}
      >
        <summary>What do the colours mean?</summary>

        <div className="legend-group">
          <h4>Places</h4>
          <dl className="legend-dl">
            <div className="legend-row">
              <dt aria-hidden="true">
                <svg viewBox="0 0 20 20" width="18" height="18" focusable="false">
                  <circle cx="10" cy="10" r="7" fill="none" stroke="var(--map-port)" strokeWidth="2" />
                  <circle cx="10" cy="10" r="2.6" fill="var(--map-port)" />
                </svg>
              </dt>
              <dd>Kalinga port</dd>
            </div>
            <div className="legend-row">
              <dt aria-hidden="true">
                <svg viewBox="0 0 20 20" width="18" height="18" focusable="false">
                  <path
                    d="M10,3 L17,10 L10,17 L3,10 Z"
                    fill="var(--verdigris-300)"
                    stroke="var(--navy-900)"
                    strokeWidth="1.5"
                  />
                </svg>
              </dt>
              <dd>Archaeological site</dd>
            </div>
            <div className="legend-row">
              <dt aria-hidden="true">
                <svg viewBox="0 0 20 20" width="18" height="18" focusable="false">
                  <circle cx="10" cy="10" r="7" fill="none" stroke="var(--parchment-400)" strokeWidth="2" />
                  <circle cx="10" cy="10" r="3.2" fill="none" stroke="var(--parchment-400)" strokeWidth="1.5" />
                </svg>
              </dt>
              <dd>Trading destination outside Kalinga</dd>
            </div>
          </dl>
        </div>

        <div className="legend-group">
          <h4>How people travelled</h4>
          <dl className="legend-dl">
            {(Object.keys(MODE_LABEL) as Route['mode'][]).map((mode) => (
              <div className="legend-row" key={mode}>
                <dt aria-hidden="true">
                  <span className="legend-swatch" data-mode={mode} />
                </dt>
                <dd>{MODE_LABEL[mode]}</dd>
              </div>
            ))}
          </dl>
          <p className="legend-note">
            Dashed lines mean the route is Hypothetical — a scholarly idea, not proven.
          </p>
        </div>

        <div className="legend-group">
          <h4>How sure are we?</h4>
          <dl className="legend-dl">
            {(Object.keys(TIER) as EvidenceLevel[]).map((level) => (
              <div className="legend-row" key={level} title={TIER[level].help}>
                <dt aria-hidden="true">
                  <span className={`legend-glyph tier-${TIER[level].css}`}>{TIER[level].glyph}</span>
                </dt>
                <dd>{level}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="legend-group">
          <h4>Kind of evidence</h4>
          <dl className="legend-dl">
            {(Object.keys(TYPE) as EvidenceType[]).map((type) => (
              <div className="legend-row" key={type} title={TYPE[type].help}>
                <dt aria-hidden="true">
                  <span className={`legend-glyph type-${type}`}>{TYPE[type].glyph}</span>
                </dt>
                <dd>{TYPE[type].label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </details>

      <p id={descId} className="visually-hidden">
        {`Interactive map of the Bay of Bengal and the eastern Indian Ocean, from the Arabian Sea to Java. Land is drawn from modern Natural Earth outlines. It shows ${plural(
          markers.length,
          'place',
          'places',
        )} and ${plural(routeData.length, 'trade route', 'trade routes')}; ${plural(
          activeMarkers.length,
          'place',
          'places',
        )} and ${plural(activeRoutes.length, 'route', 'routes')} belong to ${
          period?.label ?? 'the selected period'
        }. Every place and route is also listed, with its sources, in the sections below this map.`}
      </p>
    </div>
  );
}
