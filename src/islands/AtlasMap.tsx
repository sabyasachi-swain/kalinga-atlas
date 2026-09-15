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
  /** Path to the TopoJSON land file, default /geo/land-50m.json */
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
const MIN_SCALE = 1;
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
/**
 * Minimum screen-space gap between two visible labels. The Kalinga coast has
 * a dozen ports within a degree of each other, so at low zoom their names
 * overlap into an unreadable smear; culling by distance keeps the map legible
 * and zooming in reveals the rest. Every marker keeps its aria-label either
 * way, so nothing is lost to a screen reader.
 */
const LABEL_MIN_PX = 58;
/** Wide screens show the legend expanded (atlas-map.md, 56.25rem boundary). */
const WIDE_QUERY = '(min-width: 56.25rem)';

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
  landUrl = '/geo/land-50m.json',
  riversUrl = '/geo/rivers-50m.json',
  onSelect,
  selection = null,
  onClear,
  focusReturnToken = 0,
}: AtlasMapProps) {
  const uid = useId().replace(/[^a-zA-Z0-9-]/g, '');
  const figureRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const shipRef = useRef<SVGGElement | null>(null);
  const keysDialogRef = useRef<HTMLDialogElement | null>(null);
  const keysButtonRef = useRef<HTMLButtonElement | null>(null);
  const keysCloseRef = useRef<HTMLButtonElement | null>(null);
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

  const [size, setSize] = useState({ width: SSR_WIDTH, height: SSR_HEIGHT });
  const [transform, setTransform] = useState({ k: 1, x: 0, y: 0 });
  const [geo, setGeo] = useState<GeoData>({ land: null, rivers: [] });
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [showKeys, setShowKeys] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const period = periods.find((p) => p.id === activePeriod);

  // -- Media queries -------------------------------------------------------
  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const wide = window.matchMedia(WIDE_QUERY);
    const applyMotion = () => setReducedMotion(motion.matches);
    const applyWide = () => setLegendOpen(wide.matches);
    applyMotion();
    applyWide();
    motion.addEventListener('change', applyMotion);
    wide.addEventListener('change', applyWide);
    return () => {
      motion.removeEventListener('change', applyMotion);
      wide.removeEventListener('change', applyWide);
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
      .filter((event: Event) => {
        // Plain wheel scrolls the page; ctrl/cmd + wheel (and trackpad pinch,
        // which the browser reports as ctrl + wheel) zooms the map.
        if (event.type === 'wheel') {
          const we = event as WheelEvent;
          return we.ctrlKey || we.metaKey;
        }
        if (event.type === 'dblclick') return false;
        const me = event as MouseEvent;
        return !me.button;
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
    // d3-zoom sets touch-action:none, which would also swallow page scrolling.
    sel.style('touch-action', 'pan-y');
    zoomRef.current = behavior;

    return () => {
      sel.on('.zoom', null);
      zoomRef.current = null;
    };
  }, []);

  const zoomBy = useCallback((factor: number) => {
    const el = stageRef.current;
    const behavior = zoomRef.current;
    if (!el || !behavior) return;
    behavior.scaleBy(select(el), factor);
  }, []);

  const panBy = useCallback((dx: number, dy: number) => {
    const el = stageRef.current;
    const behavior = zoomRef.current;
    if (!el || !behavior) return;
    // Live k, not the committed state value: correct even mid-gesture.
    const k = liveTransformRef.current.k;
    behavior.translateBy(select(el), dx / k, dy / k);
  }, []);

  const resetView = useCallback(() => {
    const el = stageRef.current;
    const behavior = zoomRef.current;
    if (!el || !behavior) return;
    behavior.transform(select(el), zoomIdentity);
  }, []);

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

  const readColours = useCallback((figure: Element | null) => ({
    graticule: readVar(figure, '--map-graticule', 'rgba(217,201,163,0.14)'),
    land: readVar(figure, '--map-land', '#2a2418'),
    edge: readVar(figure, '--map-land-edge', '#5a4b2e'),
    river: readVar(figure, '--map-river', '#244a63'),
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
          if (!showKeys && selection) {
            event.preventDefault();
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
  const canZoomIn = k < MAX_SCALE - 0.001;
  const canZoomOut = k > MIN_SCALE + 0.001;

  // Which markers may show their name at this zoom. Active-in-period markers
  // and the current selection win ties; everything else yields.
  const labelled = useMemo(() => {
    const priority = [...markers].sort((a, b) => {
      const aScore = (selectedKey === a.key ? 2 : 0) + (a.inactive ? 0 : 1);
      const bScore = (selectedKey === b.key ? 2 : 0) + (b.inactive ? 0 : 1);
      return bScore - aScore;
    });
    const placed: Array<{ x: number; y: number }> = [];
    const keys = new Set<string>();
    for (const m of priority) {
      const px = m.x * k;
      const py = m.y * k;
      if (placed.every((q) => Math.hypot(q.x - px, q.y - py) >= LABEL_MIN_PX)) {
        keys.add(m.key);
        placed.push({ x: px, y: py });
      }
    }
    return keys;
  }, [markers, k, selectedKey]);

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
              {markers.map((m) => (
                <g
                  key={m.key}
                  ref={(el) => setNodeRef(m.key, el)}
                  className="marker"
                  role="button"
                  tabIndex={0}
                  aria-label={m.label}
                  data-kind={m.shape}
                  data-inactive={String(m.inactive)}
                  data-selected={String(selectedKey === m.key)}
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
                    <circle className="marker-glow" r={12} />
                    {m.shape === 'site' ? (
                      <path className="marker-shape" d="M0,-7 L7,0 L0,7 L-7,0 Z" />
                    ) : (
                      <>
                        <circle className="marker-shape" r={7} />
                        <circle className="marker-core" r={m.shape === 'destination' ? 3.2 : 2.6} />
                      </>
                    )}
                    {labelled.has(m.key) && (
                      <text className="marker-label" x={11} y={4}>
                        {m.name}
                      </text>
                    )}
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
        <div className="atlas-map__topbar">
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
          <p className="atlas-map__caveat">
            Modern coastline (Natural Earth); historical shorelines differ.
            {showReconstructionCaveat
              ? ' Approximate reconstruction — coastlines and some routes are drawn from historical and scholarly sources, not satellite survey.'
              : ''}
          </p>
        </div>

        <div className="atlas-map__zoom">
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
          aria-label="Map keyboard shortcuts"
        >
          <span aria-hidden="true">?</span>
        </button>

        {status === 'loading' && (
          <p className="atlas-map__status" role="status">
            Drawing the coastline…
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
            Map keyboard shortcuts
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
            <dt>Ctrl + scroll</dt>
            <dd>Zoom with a mouse wheel or trackpad</dd>
          </div>
        </dl>
      </dialog>

      <details
        className="atlas-map__legend"
        open={legendOpen}
        onToggle={(e) => setLegendOpen(e.currentTarget.open)}
      >
        <summary>Map key</summary>

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
