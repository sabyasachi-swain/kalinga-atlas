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
import { feature as topoFeature, mesh as topoMesh } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import type { Feature, FeatureCollection, GeoJsonProperties, Geometry } from 'geojson';
import type { EvidenceLevel, EvidenceType, Period, Port, Route, Site } from '@data/schema';
import { TIER, TYPE } from './Badge';
import { withBase } from '@lib/base-url';
import { classifyWaypoints, getRouteStopIds } from '@lib/route-stops';

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
  /** atlas-layout.md §6: fetched lazily, only once the borders layer's own
   * zoom threshold is first crossed — never on first paint. */
  countriesUrl?: string;
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
  /**
   * improvement-plan-2026-09-16.md §1.2b: "Show only this route" — set (in
   * Atlas.tsx, shared with DetailPanel's toggle) to a route id to hide every
   * other route and every marker that isn't one of that route's own stops.
   * Cleared automatically by Atlas.tsx when the selection stops being that
   * route.
   */
  showOnlyRouteId?: string | null;
  /**
   * True when the phone dialog's detail sheet (Atlas.tsx) is currently open
   * over the map — i.e. `fullscreen` and a selection exists and the visitor
   * hasn't dismissed the sheet. Escape's first press dismisses that sheet
   * (via `onDismissSheet`) instead of clearing the selection or falling
   * through to the native dialog close, so the two-stage Escape (sheet, then
   * dialog) the owner asked for doesn't collide with the plain "Escape
   * clears the selection" behaviour used outside the dialog.
   */
  dialogSheetOpen?: boolean;
  /** Dismiss the phone dialog's detail sheet without clearing the selection. */
  onDismissSheet?: () => void;
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
/** improvement-plan §1.5: "Tap a glowing dot" — a first-load nudge at a real
 * marker (kid-experience.md's own suggested line), separate key from the
 * scroll/drag hint above but the same once-per-visitor localStorage pattern. */
const MARKER_HINT_KEY = 'kalinga-map-marker-hint-dismissed';
const MARKER_HINT_AUTO_MS = 6000;
/** Give the opening zoom (if any) and the initial fit time to settle before
 * pointing at a marker — otherwise the nudge would appear mid-animation,
 * pointing at a screen position the marker is about to leave. */
const MARKER_HINT_DELAY_MS = 1800;
/** improvement-plan §1.5: once-per-visitor "overview to detail" opening zoom. */
const OPENING_ZOOM_KEY = 'kalinga-map-opening-zoom-shown';
/** improvement-plan §1.2: "Show other centuries faintly" toggle. */
const FAINT_KEY = 'kalinga-map-show-faint';

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

/**
 * improvement-plan §1.4: economical map orientation labels. These anchor
 * points are cartographic placements only — chosen so the label sits inside
 * the named country/sea on this projection at typical zooms — never a
 * historical claim about a boundary, which is why they carry no evidence
 * badge and are not read from any published entity. Kept to four, per the
 * brief's "label economically".
 */
const REGION_LABELS: ReadonlyArray<{ id: string; text: string; lat: number; lng: number; sea: boolean }> = [
  { id: 'india', text: 'INDIA', lat: 21, lng: 79, sea: false },
  { id: 'sri-lanka', text: 'SRI LANKA', lat: 7.3, lng: 80.7, sea: false },
  { id: 'myanmar', text: 'MYANMAR', lat: 21, lng: 96, sea: false },
  { id: 'bay-of-bengal', text: 'BAY OF BENGAL', lat: 14, lng: 88, sea: true },
];
/** Region labels fully showing at/below this committed scale, fully faded
 * out at/above it — broad-geography context that would only crowd the
 * Odisha coast once a visitor has zoomed that far in. */
const REGION_LABEL_FADE_K0 = 2.2;
const REGION_LABEL_FADE_K1 = 4.5;

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

/** improvement-plan §1.2b(e): "6 routes" when nothing is filtered out of the
 * period, "3 of 6 routes" the moment the manual filter hides any of them —
 * never lets the live count disagree with what is actually drawn. */
function countLabel(shown: number, total: number, one: string, many: string): string {
  if (shown === total) return plural(total, one, many);
  return `${shown} of ${plural(total, one, many)}`;
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
  /** True for a site well outside the Odisha coast (e.g. the Ashoka-edict
   * destination sites Ujjayini and Takshashila) — unlike ports, sites carry
   * no `region` field to tell "Kalinga" from "elsewhere" apart, so this is a
   * generous bounding-box check (see KALINGA_COAST_BBOX). Excluded from the
   * coast-view fit the same way a foreign port (`shape === 'destination'`)
   * already is — see `coastFitPoints`. */
  farFromCoast?: boolean;
}

/**
 * Generous Odisha-coast bounding box for classifying a *site* (which has no
 * `region` field the way a port does) as local vs. a distant edict
 * destination, for the coast-view fit only. Comfortably contains every
 * published Kalinga site (lat 19.5-20.7, lng 84.8-86.3) with margin; both
 * Ujjayini (23.18, 75.79) and Takshashila (33.75, 72.79) fall well outside it.
 */
const KALINGA_COAST_BBOX = { latMin: 17, latMax: 23, lngMin: 82, lngMax: 88 };

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
  countriesUrl = withBase('geo/countries-50m.json'),
  onSelect,
  selection = null,
  onClear,
  focusReturnToken = 0,
  fullscreen = false,
  showOnlyRouteId = null,
  dialogSheetOpen = false,
  onDismissSheet,
}: AtlasMapProps) {
  const uid = useId().replace(/[^a-zA-Z0-9-]/g, '');
  const figureRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const shipRef = useRef<SVGGElement | null>(null);
  const keysDialogRef = useRef<HTMLDialogElement | null>(null);
  const keysButtonRef = useRef<HTMLButtonElement | null>(null);
  const keysCloseRef = useRef<HTMLButtonElement | null>(null);
  /** atlas-layout.md §3+4: "Map key" popover — same mechanics as the keys
   * dialog above. */
  const legendDialogRef = useRef<HTMLDialogElement | null>(null);
  const legendButtonRef = useRef<HTMLButtonElement | null>(null);
  const legendCloseRef = useRef<HTMLButtonElement | null>(null);
  /** improvement-plan §1.2b: "Show on the map" filter popover — same
   * mechanics as the keys/legend dialogs above, mutually exclusive with
   * both. */
  const filterDialogRef = useRef<HTMLDialogElement | null>(null);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);
  const filterCloseRef = useRef<HTMLButtonElement | null>(null);
  /** A1 fix: measured to exclude the overlay chrome from every view fit. */
  const topbarRef = useRef<HTMLDivElement | null>(null);
  const zoomColRef = useRef<HTMLDivElement | null>(null);
  const zoomRef = useRef<ZoomBehavior<HTMLDivElement, unknown> | null>(null);
  const nodeRefs = useRef<Map<string, SVGGElement>>(new Map());
  /** Render budget fix: label placement is written straight to these DOM
   * nodes (see the labelInfo effect below), the same "direct DOM write,
   * commit React state at most once per gesture" pattern the live zoom
   * transform already uses — going through `setState` here added a whole
   * extra render per committed transform, pushing a 20-step wheel zoom's
   * render count from 2 to 4. */
  const labelRefs = useRef<Map<string, SVGTextElement>>(new Map());
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
  /** improvement-plan §1.5: "Tap a glowing dot" first-load nudge — own
   * shown/timer refs, same once-per-visitor shape as the scroll hint above. */
  const markerHintShownRef = useRef(false);
  const markerHintTimerRef = useRef(0);
  const markerHintDelayRef = useRef(0);
  const [markerHintTarget, setMarkerHintTarget] = useState<{ key: string; x: number; y: number } | null>(null);

  const [size, setSize] = useState({ width: SSR_WIDTH, height: SSR_HEIGHT });
  const [transform, setTransform] = useState({ k: 1, x: 0, y: 0 });
  const [geo, setGeo] = useState<GeoData>({ land: null, rivers: [] });
  /** atlas-layout.md §6: modern-borders mesh, fetched lazily — see the
   * effect below. */
  const [borders, setBorders] = useState<Feature<Geometry, GeoJsonProperties> | null>(null);
  const bordersFetchedRef = useRef(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [showKeys, setShowKeys] = useState(false);
  /** atlas-layout.md §3+4: "Map key" is now a popover (same pattern as the
   * keyboard-shortcuts dialog), not a persistent in-figure legend, so it
   * no longer needs a width-driven open state. */
  const [showLegend, setShowLegend] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  /** improvement-plan §1.2: "Show other centuries faintly" — off by default
   * (the documented timeline-slider failure mode this phase fixes), one
   * explicit opt-in, persisted like the existing HINT_KEY. */
  const [showFaint, setShowFaint] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.localStorage.getItem(FAINT_KEY) === '1';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(FAINT_KEY, showFaint ? '1' : '0');
    } catch {
      /* storage may be unavailable (private mode); faint stays session-only */
    }
  }, [showFaint]);
  /** improvement-plan §1.2b: manual "Show on the map" filter — hidden ids
   * and hidden route modes. Deliberately NOT persisted to localStorage (per
   * brief); reset to "all shown" whenever the period changes (§1.2b(d)), so
   * a filter never silently survives a period switch. */
  const [hiddenRouteIds, setHiddenRouteIds] = useState<Set<string>>(new Set());
  const [hiddenPortIds, setHiddenPortIds] = useState<Set<string>>(new Set());
  const [hiddenSiteIds, setHiddenSiteIds] = useState<Set<string>>(new Set());
  const [hiddenModes, setHiddenModes] = useState<Set<Route['mode']>>(new Set());
  useEffect(() => {
    setHiddenRouteIds(new Set());
    setHiddenPortIds(new Set());
    setHiddenSiteIds(new Set());
    setHiddenModes(new Set());
  }, [activePeriod]);
  const [reducedMotion, setReducedMotion] = useState(false);
  /** A1: which of the two view buttons (if either) matches the current
   * transform. Any manually-triggered zoom/pan event clears it to 'manual'. */
  const [viewMode, setViewMode] = useState<'coast' | 'ocean' | 'manual'>('coast');
  /** Coordinator-confirmed bug fix: the last view a button actually named
   * (never 'manual') — survives a manual pan/zoom so a later size change
   * still has something sensible to refit to. Updated only by
   * showCoast/showOcean. */
  const lastNamedViewRef = useRef<'coast' | 'ocean'>('coast');
  /** A1: both view buttons are aria-disabled for the length of a transition. */
  const [viewTransitioning, setViewTransitioning] = useState(false);
  /** A2: dismissible "scroll to zoom" hint, mouse pointers only. */
  const [hintVisible, setHintVisible] = useState(false);
  /** A1 fix: the caption collapses behind a summary below 600px so the top
   * chrome a view fit has to avoid is shorter on a phone screen; open by
   * default at wider widths. Independent of the media query after mount,
   * same pattern as `legendOpen`, so a manual toggle isn't fought back. */
  // Coordinator-confirmed fix: was `true` (open by default on wide screens).
  // Borders now paint in both views (§1.4), so the caveat text is
  // routinely three sentences long and, open by default, wrapped across
  // the drawing area — India, the route lines, the "Ujjayini" label. Closed
  // by default at every width now; a visitor who wants it clicks "About
  // this map". Still independent of the media query after mount, same as
  // before, so a manual toggle isn't fought by a later resize.
  const [caveatOpen, setCaveatOpen] = useState(false);

  const period = periods.find((p) => p.id === activePeriod);

  // -- Media queries -------------------------------------------------------
  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const applyMotion = () => setReducedMotion(motion.matches);
    applyMotion();
    motion.addEventListener('change', applyMotion);
    return () => {
      motion.removeEventListener('change', applyMotion);
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

  // Coordinator-confirmed bug fix: the "Did you know?" toast used a fixed
  // `top: var(--space-3)` offset from the map card's own top-right corner,
  // which only happened to clear the topbar (period label + view-toggle
  // buttons, wrapping onto a second line at some widths/captions) by
  // coincidence. Measuring the topbar's real height and writing it to a CSS
  // var — the same direct-DOM-write pattern as `--map-counter` above,
  // so this never adds a React render — lets the toast's own CSS position
  // itself just below the actual chrome instead of guessing a fixed gap.
  useEffect(() => {
    const topbar = topbarRef.current;
    const figure = figureRef.current;
    if (!topbar || !figure) return;
    const apply = () => {
      figure.style.setProperty('--map-chrome-top', `${Math.ceil(topbar.getBoundingClientRect().height)}px`);
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(topbar);
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

  // -- Country borders (atlas-layout.md §6 / improvement-plan §1.4) --------
  // improvement-plan §1.4: painted in *both* views now (the "no regions"
  // complaint), so this can no longer wait for the ocean view's own zoom
  // threshold to be crossed. Still lazy-but-unconditional rather than
  // blocking first paint: kicked off once, after the base map itself has
  // painted (`status === 'ready'`), on requestIdleCallback where available
  // — the trimmed file is still ~67KB (measured; see the report), not worth
  // delaying FCP for.
  useEffect(() => {
    if (status !== 'ready' || bordersFetchedRef.current) return;
    bordersFetchedRef.current = true;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(countriesUrl);
        if (!res.ok) throw new Error(`countries ${res.status}`);
        const topology = (await res.json()) as Topology;
        const countriesObject = topology.objects['countries'];
        if (!countriesObject) throw new Error('countries-50m.json has no "countries" object');
        // mesh(), not feature(): a country-to-country shared-arc line, not
        // filled polygons — (a, b) => a !== b keeps only interior borders,
        // excluding the outer coastal edge the land layer already draws.
        const meshed = topoMesh(topology, countriesObject as GeometryCollection, (a, b) => a !== b);
        if (cancelled) return;
        setBorders({ type: 'Feature', properties: {}, geometry: meshed });
      } catch {
        // Orientation-only decoration; the map is still fully usable without it.
      }
    };
    const ric = (window as { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
    const handle = ric ? ric(() => void load()) : window.setTimeout(() => void load(), 300);
    return () => {
      cancelled = true;
      if (ric && typeof handle === 'number') {
        (window as { cancelIdleCallback?: (h: number) => void }).cancelIdleCallback?.(handle);
      } else {
        window.clearTimeout(handle as number);
      }
    };
  }, [status, countriesUrl]);

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
  // Renamed `allMarkers`: unfiltered by the manual "Show on the map" filter
  // (§1.2b) or the "show other centuries faintly" toggle (§1.2) — every
  // fit/ceiling calculation that must stay stable regardless of what the
  // visitor has manually hidden reads this array. `markers` (below) is the
  // filtered, actually-rendered set.
  const allMarkers = useMemo<MarkerDatum[]>(() => {
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
      const farFromCoast =
        s.coordinates.lat < KALINGA_COAST_BBOX.latMin ||
        s.coordinates.lat > KALINGA_COAST_BBOX.latMax ||
        s.coordinates.lng < KALINGA_COAST_BBOX.lngMin ||
        s.coordinates.lng > KALINGA_COAST_BBOX.lngMax;
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
        farFromCoast,
      });
    }

    for (const p of ports) if (p.region !== 'kalinga') pushPort(p, 'destination');

    return out;
  }, [ports, sites, projection, activePeriod]);

  // Renamed `allRouteData`, same reasoning as `allMarkers` above.
  const allRouteData = useMemo<RouteDatum[]>(() => {
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

  // -- improvement-plan §1.2 / §1.2b: what's actually drawn ----------------
  //
  // `markers`/`routeData` (below) are what every downstream consumer in this
  // file already used before this phase — clustering, labelling, JSX,
  // keyboard order (DOM order = tab order, so an item simply absent here is
  // absent from the a11y tree and the tab order too, with no separate
  // bookkeeping needed) and the live counts. Renaming the raw arrays to
  // `allMarkers`/`allRouteData` (above) and filtering back down to these
  // names means none of that downstream code has to change.
  //
  // Precedence, deliberately in this order:
  //   1. "Show only this route" (showOnlyRouteId) — an override, not a
  //      togglable member of the persistent filter state; turning it off
  //      changes nothing else, so it is never written into hiddenRouteIds
  //      etc. (§1.2b(b): "restores the filter to whatever it was").
  //   2. The manual per-item / per-mode filter (§1.2b(c)).
  //   3. The period filter, softened only by "show other centuries
  //      faintly" (§1.2) — never soft by default, which is the failure
  //      mode this phase exists to fix.
  const showOnlyStopIds = useMemo(() => {
    if (!showOnlyRouteId) return null;
    const route = routes.find((r) => r.id === showOnlyRouteId);
    if (!route) return null;
    return getRouteStopIds(route, ports, sites);
  }, [showOnlyRouteId, routes, ports, sites]);

  const markers = useMemo<MarkerDatum[]>(() => {
    return allMarkers.filter((m) => {
      if (showOnlyStopIds) {
        // deepseek/deepseek-v4.1-flash review (verified): "show only this
        // route" is an override, so one of the route's own stops being
        // manually hidden (or period-inactive) must not silently drop its
        // endpoint marker while the route line itself still draws — the
        // whole point is a clean line-plus-its-own-stops, never a line with
        // a missing endpoint and no explanation.
        return showOnlyStopIds.has(m.id);
      }
      const hiddenManually = m.kind === 'site' ? hiddenSiteIds.has(m.id) : hiddenPortIds.has(m.id);
      if (hiddenManually) return false;
      if (m.inactive && !showFaint) return false;
      return true;
    });
  }, [allMarkers, showOnlyStopIds, hiddenSiteIds, hiddenPortIds, showFaint]);

  const routeData = useMemo<RouteDatum[]>(() => {
    return allRouteData.filter((r) => {
      if (showOnlyRouteId) return r.id === showOnlyRouteId;
      if (hiddenModes.has(r.mode)) return false;
      if (hiddenRouteIds.has(r.id)) return false;
      if (r.inactive && !showFaint) return false;
      return true;
    });
  }, [allRouteData, showOnlyRouteId, hiddenModes, hiddenRouteIds, showFaint]);

  /** Nothing at all is showing (§1.2b(f)): the empty-map dead end. */
  const nothingShowing = markers.length === 0 && routeData.length === 0;

  const clearAllFilters = useCallback(() => {
    setHiddenRouteIds(new Set());
    setHiddenPortIds(new Set());
    setHiddenSiteIds(new Set());
    setHiddenModes(new Set());
  }, []);

  const hideAllFilters = useCallback(() => {
    setHiddenRouteIds(new Set(routes.map((r) => r.id)));
    setHiddenPortIds(new Set(ports.map((p) => p.id)));
    setHiddenSiteIds(new Set(sites.map((s) => s.id)));
    // deepseek/deepseek-v4.1-flash review (verified): without this, "Hide
    // all" left every route-mode chip reading pressed/on while every route
    // was in fact hidden by id — the two mechanisms must agree.
    setHiddenModes(new Set(Object.keys(MODE_LABEL) as Route['mode'][]));
  }, [routes, ports, sites]);

  /** improvement-plan §1.2b(c): the filter panel only ever lists what the
   * period already shows (§1.2b(d)) — each list sorted by name so a visitor
   * scanning it can find an entry quickly. */
  const filterableRoutes = useMemo(
    () => routes.filter((r) => r.periods.includes(activePeriod)).sort((a, b) => a.name.localeCompare(b.name)),
    [routes, activePeriod],
  );
  const filterablePorts = useMemo(
    () =>
      ports
        .filter((p) => p.periods.includes(activePeriod))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [ports, activePeriod],
  );
  const filterableSites = useMemo(
    () =>
      sites
        .filter((s) => s.periods.includes(activePeriod))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [sites, activePeriod],
  );

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
          dismissMarkerHintRef.current();
          // improvement-plan §1.5: "cancel cleanly on interaction" — a real
          // drag/wheel/pinch starting mid-flight through the opening zoom
          // (or any other animateTo) must stop that rAF loop outright, not
          // let it keep fighting the gesture's own per-tick DOM writes.
          if (viewAnimRafRef.current) {
            cancelAnimationFrame(viewAnimRafRef.current);
            viewAnimRafRef.current = 0;
            setViewTransitioning(false);
          }
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

  /** improvement-plan §1.5: dismiss the "Tap a glowing dot" nudge — timeout,
   * close button, or any map interaction (matches the opening-zoom's own
   * "cancel cleanly on interaction" rule just below). */
  const dismissMarkerHint = useCallback(() => {
    window.clearTimeout(markerHintTimerRef.current);
    window.clearTimeout(markerHintDelayRef.current);
    setMarkerHintTarget(null);
    try {
      window.localStorage.setItem(MARKER_HINT_KEY, '1');
    } catch {
      /* storage unavailable — the nudge just reappears next visit */
    }
  }, []);
  const dismissMarkerHintRef = useRef(dismissMarkerHint);
  useEffect(() => {
    dismissMarkerHintRef.current = dismissMarkerHint;
  }, [dismissMarkerHint]);
  useEffect(
    () => () => {
      window.clearTimeout(markerHintTimerRef.current);
      window.clearTimeout(markerHintDelayRef.current);
    },
    [],
  );

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
    dismissMarkerHintRef.current();
    behavior.scaleBy(select(el), factor);
  }, []);

  const panBy = useCallback((dx: number, dy: number) => {
    const el = stageRef.current;
    const behavior = zoomRef.current;
    if (!el || !behavior) return;
    dismissMarkerHintRef.current();
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
        // Investigated per the coordinator's (unverified) finding: this
        // branch itself never sets `viewTransitioning` true, so it can't
        // get stuck from its own call — but if a *previous* call is still
        // mid-flight when this one bails out here, that previous call's
        // rAF loop is never cancelled or completed by this path, so its
        // eventual `commit()` may not run either. Clearing here removes
        // that tail risk for free rather than relying on it not mattering.
        setViewTransitioning(false);
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
    // Deliberately `allMarkers`, not the filtered `markers`: this ceiling
    // must not jump around as the visitor ticks boxes in the filter panel.
    for (let i = 0; i < allMarkers.length; i++) {
      const a = allMarkers[i]!;
      for (let j = i + 1; j < allMarkers.length; j++) {
        const b = allMarkers[j]!;
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d > 0 && d < minDist) minDist = d;
      }
    }
    if (!Number.isFinite(minDist) || minDist <= 0) return MAX_SCALE;
    const threshold = clusterThresholdPx(MARKER_R_COAST) * 1.5;
    return threshold / minDist;
  }, [allMarkers]);

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

  /**
   * Owner fix, item 5: "at first I thought it has only 2 results... there
   * are points but no linkage". The coast fit used to include only Kalinga
   * *ports* (`shape === 'port'`), so a period whose only active markers
   * otherwise were sites (Dhauli, Jaugada in Mauryan Kalinga) opened on a
   * crop that hid them, understating the period's real extent. Every active
   * *Kalinga* marker now counts — ports and sites — but not foreign
   * destinations (`shape === 'destination'`), which belong to the ocean
   * view's much larger extent and would otherwise force the "coast" view to
   * zoom out past the coast it's named for.
   */
  const coastFitPoints = useCallback(() => {
    // `allMarkers`: the default view fit is a navigation baseline driven by
    // the period, not by what the visitor has manually filtered — filtering
    // everything down to one route shouldn't re-centre the whole map.
    const isCoastCandidate = (m: MarkerDatum) => m.shape !== 'destination' && !m.farFromCoast;
    const active = allMarkers.filter((m) => isCoastCandidate(m) && !m.inactive);
    return active.length > 0 ? active : allMarkers.filter(isCoastCandidate);
  }, [allMarkers]);

  /** A1: fit to every port, Kalinga and foreign destinations alike. */
  const oceanFitPoints = useCallback(() => allMarkers.filter((m) => m.kind === 'port'), [allMarkers]);

  const showCoast = useCallback(() => {
    const pts = coastFitPoints();
    if (pts.length === 0) return;
    setViewMode('coast');
    lastNamedViewRef.current = 'coast';
    animateTo(fitWithHeadroom(pts, COAST_PADDING, minFitSpanPx));
  }, [coastFitPoints, fitWithHeadroom, minFitSpanPx, animateTo]);

  const showOcean = useCallback(() => {
    const pts = oceanFitPoints();
    if (pts.length === 0) return;
    setViewMode('ocean');
    lastNamedViewRef.current = 'ocean';
    // A4 fix: less padding than the coast fit — the ocean view already has
    // to squeeze a much taller geographic extent into the same
    // chrome-reduced safe area, so every extra percent of padding shrinks
    // the resulting scale further and makes clustering chain more markers
    // together than genuinely belong in one bubble.
    animateTo(fitWithHeadroom(pts, OCEAN_PADDING));
  }, [oceanFitPoints, fitWithHeadroom, animateTo]);

  /**
   * Coordinator-confirmed bug fix: this used to bail out entirely once
   * `viewMode === 'manual'` — but *any* real pan/zoom gesture sets that, so
   * after a single manual interaction every later size change (opening the
   * phone dialog, closing it, rotating, resizing) silently skipped the
   * refit, reintroducing the blank-map bug by another path (pan once
   * inline, then tap "Explore the map": the dialog got the old transform
   * at the new size). Fit to the last *named* view (`lastNamedViewRef`,
   * updated only by `showCoast`/`showOcean`) regardless of manual state —
   * a size change is exactly the case where the previous manual framing is
   * no longer meaningful anyway. Re-asserts `viewMode` to that named view
   * too, since the refit really did just (re)apply it. Used both for the
   * very first fit on mount and for every later stage-size change — the
   * phone dialog moves this same AtlasMap instance into a
   * differently-sized host via the portal in Atlas.tsx. Goes through
   * `animateTo` (liveTransformRef, one committed render) except the very
   * first time, which applies instantly — there is nothing to animate
   * *from* yet.
   */
  const refitCurrentView = useCallback(
    (instant: boolean) => {
      const target1 = lastNamedViewRef.current;
      const pts = target1 === 'ocean' ? oceanFitPoints() : coastFitPoints();
      if (pts.length === 0) return;
      const padPct = target1 === 'ocean' ? OCEAN_PADDING : COAST_PADDING;
      const span = target1 === 'ocean' ? 0 : minFitSpanPx;
      setViewMode(target1);
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
    [oceanFitPoints, coastFitPoints, fitWithHeadroom, minFitSpanPx, animateTo],
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
  /**
   * improvement-plan §1.5: the one-off "overview to detail" opening zoom —
   * silently establishes the whole-Bay-of-Bengal (ocean) transform first (no
   * flash: matches the existing instant-fit codepath), then animates down to
   * the real coast fit via the *same* `animateTo` this file already uses for
   * every other view transition — no second animation system. `viewMode`/
   * `lastNamedViewRef` are set to 'coast' up front, before the animation
   * even starts, so anything that interrupts it (a period change, a resize,
   * the phone dialog opening, or `animateTo`'s own cancel-on-real-gesture
   * handling above) is already bookkept as "the coast fit is current" and
   * lands on the *right* target rather than reintroducing the ocean one.
   * Returns false (do nothing, caller falls back to the plain instant fit)
   * when there's no meaningful zoom to show — no coast points, no separate
   * ocean extent, or reduced motion, which per the brief goes instant.
   */
  const runOpeningZoom = useCallback(() => {
    const el = stageRef.current;
    const behavior = zoomRef.current;
    if (!el || !behavior || reducedMotion) return false;
    const coastPts = coastFitPoints();
    const oceanPts = oceanFitPoints();
    if (coastPts.length === 0 || oceanPts.length === 0) return false;
    const oceanTarget = fitWithHeadroom(oceanPts, OCEAN_PADDING);
    const coastTarget = fitWithHeadroom(coastPts, COAST_PADDING, minFitSpanPx);
    behavior.transform(select(el), zoomIdentity.translate(oceanTarget.x, oceanTarget.y).scale(oceanTarget.k));
    liveTransformRef.current = oceanTarget;
    setViewMode('coast');
    lastNamedViewRef.current = 'coast';
    animateTo(coastTarget);
    return true;
  }, [coastFitPoints, oceanFitPoints, fitWithHeadroom, minFitSpanPx, reducedMotion, animateTo]);

  useEffect(() => {
    if (!sizeMeasuredRef.current) return;
    if (size.width < 2 || size.height < 2) return;
    const instant = !didInitialFitRef.current;
    didInitialFitRef.current = true;
    if (instant) {
      let openingZoomShown = true;
      try {
        openingZoomShown = window.localStorage.getItem(OPENING_ZOOM_KEY) === '1';
      } catch {
        openingZoomShown = true; // storage unavailable — skip the animation, never block the fit
      }
      if (!openingZoomShown && runOpeningZoom()) {
        try {
          window.localStorage.setItem(OPENING_ZOOM_KEY, '1');
        } catch {
          /* best effort only — worst case it plays again next visit */
        }
        return;
      }
    }
    refitCurrentViewRef.current(instant);
  }, [size, runOpeningZoom]);

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
    graticule: readVar(figure, '--map-graticule', 'rgba(26,26,26,0.08)'),
    land: readVar(figure, '--map-land', '#f2eee6'),
    edge: readVar(figure, '--map-land-edge', '#4a6b78'),
    river: readVar(figure, '--map-river', '#4a85a0'),
    borderModern: readVar(figure, '--map-border-modern', 'rgba(55,65,81,0.8)'),
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
      const { graticule, land, edge, river, borderModern } = readColours(figure);

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
        ctx.lineWidth = 1.1 / k; // coordinator-verified --map-land-edge: 1–1.25px
        ctx.strokeStyle = edge;
        ctx.stroke();
      }

      // atlas-layout.md §6 / improvement-plan §1.4: modern borders — behind
      // rivers/routes/markers, above land/graticule. Painted in both views
      // now (a hairline, subordinate to everything drawn on top of it); the
      // visible caption below adds a sentence whenever this layer is
      // present, in either view, not just the ocean one.
      if (borders) {
        ctx.beginPath();
        p(borders);
        ctx.lineWidth = 0.5 / k;
        ctx.strokeStyle = borderModern;
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
    [geo, borders, projection, size, readColours],
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
      dismissMarkerHintRef.current();
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

  // -- improvement-plan §1.3: named stops on the selected route ------------
  // Only intermediate waypoints — the two endpoints are always a port/site
  // id already drawn (and labelled) as a regular marker, so giving them a
  // second dot here would be a duplicate, not a new stop.
  interface StopDatum {
    key: string;
    x: number;
    y: number;
    name: string | null;
    attested: boolean;
  }
  const selectedRouteStops = useMemo<StopDatum[]>(() => {
    if (selection?.kind !== 'route') return [];
    const route = routes.find((r) => r.id === selection.id);
    if (!route) return [];
    const classified = classifyWaypoints(route, ports, sites);
    const out: StopDatum[] = [];
    for (const w of classified) {
      if (w.isEndpoint) continue;
      const xy = projection([w.lng, w.lat]);
      if (!xy) continue;
      out.push({
        key: `stop:${route.id}:${w.index}`,
        x: xy[0],
        y: xy[1],
        name: w.place?.name ?? null,
        attested: w.place !== null,
      });
    }
    return out;
  }, [selection, routes, ports, sites, projection]);
  const stopLabelRefs = useRef<Map<string, SVGTextElement>>(new Map());
  const setStopLabelRef = useCallback((key: string, el: SVGTextElement | null) => {
    if (el) stopLabelRefs.current.set(key, el);
    else stopLabelRefs.current.delete(key);
  }, []);

  // -- improvement-plan §1.4: orientation labels ----------------------------
  const regionLabelPoints = useMemo(() => {
    const out: Array<{ id: string; text: string; sea: boolean; x: number; y: number }> = [];
    for (const r of REGION_LABELS) {
      // deepseek/deepseek-v4.1-flash review (verified): a failed projection
      // (outside the projection's clip extent) must drop the label, not
      // default it to (0,0) — a valid on-screen point that would otherwise
      // draw a stray "INDIA" in the map's top-left corner.
      const xy = projection([r.lng, r.lat]);
      if (!xy) continue;
      out.push({ id: r.id, text: r.text, sea: r.sea, x: xy[0], y: xy[1] });
    }
    return out;
  }, [projection]);
  const regionLabelRefs = useRef<Map<string, SVGTextElement>>(new Map());
  const setRegionLabelRef = useCallback((id: string, el: SVGTextElement | null) => {
    if (el) regionLabelRefs.current.set(id, el);
    else regionLabelRefs.current.delete(id);
  }, []);

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
      // Owner fix, item 1: the ship art is a side-view hull with the mast
      // drawn "up" (small y). A plain `rotate(angle)` is directionally
      // correct — the bow does point along the tangent — but past ±90°
      // (any westward route) it also carries the mast past horizontal and
      // down past vertical, i.e. upside down. The standard side-sprite fix:
      // in the left half-plane, mirror the glyph about its own origin
      // (`scale(1,-1)`) *before* the rotation instead of letting the
      // rotation alone carry it past vertical — the two compose to put the
      // bow at the same heading with the mast still pointing up. See the
      // symbols' own art (mast at low y) for why "up" means small y here.
      const flip = Math.abs(angle) > 90;
      const transform = flip
        ? `translate(${here.x},${here.y}) rotate(${angle}) scale(1,-1)`
        : `translate(${here.x},${here.y}) rotate(${angle})`;
      g.setAttribute('transform', transform);
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
      if (showLegend) setShowLegend(false);
      if (showFilter) setShowFilter(false);
      dialog.showModal();
      keysCloseRef.current?.focus();
    }
    if (!showKeys && dialog.open) dialog.close();
  }, [showKeys, showLegend, showFilter]);

  // -- "Map key" popover (atlas-layout.md §3+4) ----------------------------
  // Mutually exclusive with the keys/filter dialogs by convention (all three
  // are modal dialogs sharing --z-popover, so only the topmost is ever
  // meaningfully open) — opening one closes the others rather than stacking.
  useEffect(() => {
    const dialog = legendDialogRef.current;
    if (!dialog) return;
    if (showLegend && !dialog.open && typeof dialog.showModal === 'function') {
      if (showKeys) setShowKeys(false);
      if (showFilter) setShowFilter(false);
      dialog.showModal();
      legendCloseRef.current?.focus();
    }
    if (!showLegend && dialog.open) dialog.close();
  }, [showLegend, showKeys, showFilter]);

  // -- "Show on the map" filter popover (improvement-plan §1.2b) ----------
  // Non-modal (`.show()`) below 37.4375rem: a modal <dialog> always covers
  // whatever is behind it, but the brief is explicit that this panel must
  // not cover the map while the visitor is ticking boxes at phone widths —
  // `.atlas-map__filter`'s own narrow-width CSS docks it in normal flow
  // below the map stage instead. Escape is handled explicitly (below) since
  // a non-modal dialog doesn't get that for free the way showModal() does.
  useEffect(() => {
    const dialog = filterDialogRef.current;
    if (!dialog) return;
    const narrow = typeof window !== 'undefined' && window.matchMedia('(max-width: 37.4375rem)').matches;
    if (showFilter && !dialog.open) {
      if (narrow) {
        dialog.show();
      } else if (typeof dialog.showModal === 'function') {
        if (showKeys) setShowKeys(false);
        if (showLegend) setShowLegend(false);
        dialog.showModal();
      }
      filterCloseRef.current?.focus();
    }
    if (!showFilter && dialog.open) dialog.close();
  }, [showFilter, showKeys, showLegend]);

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
          // The keys/legend dialogs are modal and close themselves natively.
          // deepseek/deepseek-v4.1-flash review (verified): the filter
          // dialog is non-modal below 37.4375rem (§1.2b), so an Escape with
          // focus still on the map figure itself (not inside the open
          // filter sheet) would otherwise fall through to here and clear
          // the selection instead of closing the filter — guarded the same
          // way as showKeys/showLegend.
          if (showKeys || showFilter) break;
          // Owner fix: inside the phone dialog, Escape is two stages — the
          // sheet, then the dialog — so it must never collapse straight to
          // "clear the selection" the way it does outside the dialog, and it
          // must never fight the dialog's own native Escape-closes-it
          // default either. First press (sheet still open) dismisses the
          // sheet only, preventing the native dialog close. Second press
          // (sheet already dismissed, or nothing selected) does nothing here
          // and is left to bubble to the <dialog>'s native `cancel` handling,
          // which Atlas.tsx's onClose already turns into setMapDialogOpen(false).
          if (fullscreen && dialogSheetOpen) {
            event.preventDefault();
            event.stopPropagation();
            onDismissSheet?.();
            break;
          }
          if (fullscreen) break;
          if (selection) {
            event.preventDefault();
            event.stopPropagation();
            onClear?.();
          }
          break;
        default:
          break;
      }
    },
    [
      zoomBy,
      panBy,
      resetView,
      onClear,
      selection,
      showKeys,
      showFilter,
      fullscreen,
      dialogSheetOpen,
      onDismissSheet,
    ],
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

  /** improvement-plan §1.4: region labels fade with the committed zoom (not
   * the live gesture — same cadence as every other label placement in this
   * file), never re-triggers the offscreen-canvas redraw path. */
  const regionLabelOpacity =
    k <= REGION_LABEL_FADE_K0
      ? 1
      : k >= REGION_LABEL_FADE_K1
        ? 0
        : 1 - (k - REGION_LABEL_FADE_K0) / (REGION_LABEL_FADE_K1 - REGION_LABEL_FADE_K0);

  /** improvement-plan §1.4: scale bar, recomputed on the committed transform
   * only. Measures two points 100px apart at the stage's own centre and
   * snaps to the nearest "nice" round distance. */
  const scaleBarInfo = useMemo<{ km: number; px: number } | null>(() => {
    const invert = projection.invert;
    if (!invert) return null;
    const cx = (size.width / 2 - x) / k;
    const cy = (size.height / 2 - y) / k;
    const g0 = invert([cx, cy]);
    const g1 = invert([cx + 100 / k, cy]);
    if (!g0 || !g1) return null;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(g1[1] - g0[1]);
    const dLng = toRad(g1[0] - g0[0]);
    const a =
      Math.sin(dLat / 2) ** 2 + Math.cos(toRad(g0[1])) * Math.cos(toRad(g1[1])) * Math.sin(dLng / 2) ** 2;
    const km100px = 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
    if (!Number.isFinite(km100px) || km100px <= 0) return null;
    const kmPerPx = km100px / 100;
    const niceSteps = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000];
    let chosen = niceSteps[0]!;
    for (const step of niceSteps) {
      chosen = step;
      if (step / kmPerPx >= 40) break;
    }
    const px = chosen / kmPerPx;
    // improvement-plan §1.4: "if the scale bar can't fit [at 380px], shrink
    // rather than hide" — clamped to a sane on-screen range; a very tight
    // zoom (each px worth many km) still reads as a short, legible bar
    // rather than being suppressed.
    return { km: chosen, px: Math.max(20, Math.min(px, 140)) };
  }, [projection, size, k, x, y]);
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
  const legendTitleId = `atlas-legend-title-${uid}`;
  const filterTitleId = `atlas-filter-title-${uid}`;
  const descId = `atlas-map-desc-${uid}`;
  // Coordinator-confirmed fix: under "show only this route" a period-
  // inactive endpoint is still forced onto the map (see the `markers` memo
  // above), but `!m.inactive` alone excluded it from this count — the
  // acceptance test is "the count matches what is drawn", so anything
  // forced visible by the override must count too.
  const activeMarkers = markers.filter((m) => !m.inactive || (showOnlyStopIds !== null && showOnlyStopIds.has(m.id)));
  const activeRoutes = routeData.filter((r) => !r.inactive || r.id === showOnlyRouteId);
  /** improvement-plan §1.2b(e): the period total, ignoring the manual
   * filter — compared against `activeMarkers`/`activeRoutes` (drawn, i.e.
   * already filtered) to render "3 of 6 routes" only when they actually
   * differ. */
  const periodActiveMarkers = allMarkers.filter((m) => !m.inactive);
  const periodActiveRoutes = allRouteData.filter((r) => !r.inactive);
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

  // improvement-plan §1.5: "Tap a glowing dot" — a one-off first-load nudge
  // at a *real* marker. Attempted exactly once per visitor (never re-tried
  // on a later period change): a short delay after mount lets the opening
  // zoom (if any) and the initial coast fit settle, then the first marker
  // that is both active and not folded into a cluster bubble becomes the
  // target. If nothing qualifies — everything hidden by the period or the
  // "Show on the map" filter, or every active marker clustered away — no
  // target is set and the hint simply never renders (see `markerHintTarget`
  // below, `null` unless a real candidate exists).
  useEffect(() => {
    if (markerHintShownRef.current) return;
    let dismissed = false;
    try {
      dismissed = window.localStorage.getItem(MARKER_HINT_KEY) === '1';
    } catch {
      dismissed = false;
    }
    if (dismissed) {
      markerHintShownRef.current = true;
      return;
    }
    window.clearTimeout(markerHintDelayRef.current);
    const tryShow = () => {
      if (markerHintShownRef.current) return;
      // deepseek/deepseek-v3.2-exp review (verified, fixed): if the opening
      // zoom (or any other view animation) is still running when the delay
      // elapses, wait for it — otherwise the nudge would point at the
      // marker's *destination* screen position while the map is still
      // mid-flight to it, which reads as pointing at nothing.
      if (viewAnimRafRef.current) {
        markerHintDelayRef.current = window.setTimeout(tryShow, 250);
        return;
      }
      const target = markers.find((m) => !m.inactive && !clusteredKeys.has(m.key));
      if (!target) return; // nothing eligible right now — try again once more is available
      markerHintShownRef.current = true;
      setMarkerHintTarget({ key: target.key, x: target.x, y: target.y });
      markerHintTimerRef.current = window.setTimeout(dismissMarkerHintRef.current, MARKER_HINT_AUTO_MS);
    };
    markerHintDelayRef.current = window.setTimeout(tryShow, MARKER_HINT_DELAY_MS);
    return () => window.clearTimeout(markerHintDelayRef.current);
    // Deliberately re-checks on every `markers`/`clusteredKeys` change (period
    // switch, filter change) until it succeeds once — "not hidden by the
    // period or filter" only has a stable answer once those are known, and a
    // visitor's first paint may still be on a period with nothing eligible.
    // `markerHintShownRef` (not state) makes every check after the first
    // success a no-op, so this never re-triggers once the nudge has shown.
  }, [markers, clusteredKeys]);

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
  // Coordinator-confirmed bug fix: a fixed `charW` estimate under-measures
  // real text at a larger browser font size or a zoomed page, so
  // `collidesAny` below could pass a box that genuinely overlaps — exactly
  // for the visitors who most need it not to. Measured for real via a
  // hidden SVG <text> probe (same `.marker-label` class, so the same
  // computed font) and `getComputedTextLength()`, one call per marker name
  // per pass — cheap at this marker count. Written straight to each label
  // `<text>` node via `labelRefs` (see below) rather than through
  // `setState`, for the same reason the live zoom transform is written
  // straight to the DOM: a `setState` here added a whole extra React
  // render on top of the one the committed transform already causes,
  // which is what pushed a 20-step wheel zoom's render count from 2 to 4.
  // Still only ever runs on the same "committed transform changed"
  // cadence as before (same dependency list as the old render-phase
  // useMemo this replaced), so it stays off the per-frame gesture path —
  // it just now runs after paint, which is what makes a real
  // `getComputedTextLength()` measurement possible at all.
  const labelProbeRef = useRef<SVGTextElement | null>(null);

  useEffect(() => {
    const probe = labelProbeRef.current;
    const measureWidth = (name: string): number => {
      if (probe) {
        probe.textContent = name;
        try {
          const w = probe.getComputedTextLength();
          if (Number.isFinite(w) && w > 0) return w + 4;
        } catch {
          /* fall through to the estimate below */
        }
      }
      return name.length * 6.4 + 4; // pre-paint / probe-unavailable fallback only
    };
    const map = new Map<string, { show: boolean; dx: number; dy: number; anchor: 'start' | 'end' | 'middle' }>();
    const safe = getSafeRect();
    const visible = markers.filter((m) => !clusteredKeys.has(m.key));
    const priority = [...visible].sort((a, b) => {
      const aScore = (selectedKey === a.key ? 2 : 0) + (a.inactive ? 0 : 1);
      const bScore = (selectedKey === b.key ? 2 : 0) + (b.inactive ? 0 : 1);
      return bScore - aScore;
    });
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

    // improvement-plan §1.3: the selected route's own stop dots are also
    // obstacles no marker/stop label may sit on — computed here so the
    // existing marker-label loop below already avoids them.
    const stopDotR = 5;
    const stopBoxes = selectedRouteStops.map((s) => {
      const px = s.x * k + x;
      const py = s.y * k + y;
      return { x0: px - stopDotR, y0: py - stopDotR, x1: px + stopDotR, y1: py + stopDotR };
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
      if (stopBoxes.some((p) => intersects(b, p))) return true;
      for (const [key, mb] of markerBoxes) {
        if (key !== selfKey && intersects(b, mb)) return true;
      }
      return false;
    };

    for (const m of priority) {
      const px = m.x * k + x;
      const py = m.y * k + y;
      const textWidth = measureWidth(m.name);
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

    // improvement-plan §1.3: label the selected route's attested stops the
    // same way — first-fit against the same obstacle set (which by now
    // includes every placed marker label too), never forced (unlike a
    // permanent Kalinga-port label): a stop that can't find a clear slot is
    // suppressed rather than drawn over something else. Bends never reach
    // this loop at all (they have no name to place — see the JSX below).
    const stopMap = new Map<string, { show: boolean; dx: number; dy: number; anchor: 'start' | 'end' | 'middle' }>();
    for (const s of selectedRouteStops) {
      if (!s.attested || !s.name) continue;
      const px = s.x * k + x;
      const py = s.y * k + y;
      const textWidth = measureWidth(s.name);
      const gap = stopDotR + 6;
      const candidates: Array<{ dx: number; dy: number; anchor: 'start' | 'end' | 'middle' }> = [
        { dx: gap, dy: 4, anchor: 'start' },
        { dx: -gap, dy: 4, anchor: 'end' },
        { dx: 0, dy: -gap - 3, anchor: 'middle' },
        { dx: 0, dy: gap + 10, anchor: 'middle' },
      ];
      let chosen: (typeof candidates)[number] | null = null;
      let chosenBox: { x0: number; y0: number; x1: number; y1: number } | null = null;
      for (const c of candidates) {
        const b = boxFor(px, py, c.dx, c.dy, c.anchor, textWidth);
        if (fitsChrome(b) && !collidesAny(b, s.key)) {
          chosen = c;
          chosenBox = b;
          break;
        }
      }
      if (!chosen || !chosenBox) {
        stopMap.set(s.key, { show: false, dx: gap, dy: 4, anchor: 'start' });
        continue;
      }
      placedBoxes.push(chosenBox);
      stopMap.set(s.key, { show: true, dx: chosen.dx, dy: chosen.dy, anchor: chosen.anchor });
    }

    // improvement-plan §1.4: orientation labels are placed dead last and
    // never forced — "drop any label that would collide with a pin or
    // another label" (never the reverse: a region label must never bump a
    // marker/stop label out of the way). Centred on their anchor point
    // (anchor="middle"), no directional candidates to try — either the
    // centred box is clear, or the label doesn't show this frame.
    const regionMap = new Map<string, { show: boolean }>();
    if (regionLabelOpacity > 0) {
      for (const r of regionLabelPoints) {
        const px = r.x * k + x;
        const py = r.y * k + y;
        const textWidth = measureWidth(r.text);
        const b = boxFor(px, py, 0, 4, 'middle', textWidth);
        if (fitsChrome(b) && !collidesAny(b, r.id)) {
          placedBoxes.push(b);
          regionMap.set(r.id, { show: true });
        } else {
          regionMap.set(r.id, { show: false });
        }
      }
    }

    // Direct DOM write, no setState: see the comment above this effect.
    for (const [key, el] of labelRefs.current) {
      const info = map.get(key);
      if (!info || !info.show) {
        el.style.display = 'none';
        continue;
      }
      el.style.display = '';
      el.setAttribute('x', String(info.dx));
      el.setAttribute('y', String(info.dy));
      el.setAttribute('text-anchor', info.anchor);
    }
    for (const [key, el] of stopLabelRefs.current) {
      const info = stopMap.get(key);
      if (!info || !info.show) {
        el.style.display = 'none';
        continue;
      }
      el.style.display = '';
      el.setAttribute('x', String(info.dx));
      el.setAttribute('y', String(info.dy));
      el.setAttribute('text-anchor', info.anchor);
    }
    for (const [id, el] of regionLabelRefs.current) {
      const info = regionMap.get(id);
      el.style.display = info?.show ? '' : 'none';
    }
  }, [
    markers,
    k,
    x,
    y,
    selectedKey,
    markerRadius,
    clusters,
    clusteredKeys,
    viewMode,
    getSafeRect,
    selectedRouteStops,
    regionLabelPoints,
    regionLabelOpacity,
  ]);

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

          {/* Hidden measuring probe for label placement (see the labelInfo
              effect) — same .marker-label class so its computed font
              matches the real labels exactly; getComputedTextLength() on
              this element is what replaces the old fixed-charW estimate.
              Never visible: 0-opacity and outside the counter-scaled root
              group, so it never affects layout or hit-testing. */}
          <text ref={labelProbeRef} className="marker-label" aria-hidden="true" style={{ opacity: 0 }} x={-9999} y={-9999} />

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
                  // improvement-plan §1.2b(a) "focus-on-select": once a route
                  // is selected, every other route fades (but stays visible
                  // and clickable — this is how a visitor reaches the next
                  // route). Moot once "show only this route" is on, since
                  // the others aren't rendered at all then.
                  data-dimmed={String(
                    selection?.kind === 'route' && selection.id !== r.id && !showOnlyRouteId,
                  )}
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

            {/* improvement-plan §1.4: economical orientation labels — never
                a historical claim (see REGION_LABELS's own comment), so no
                evidence badge and aria-hidden; the surrounding map already
                has its own accessible description (figcaption below). */}
            <g className="region-labels" aria-hidden="true" style={{ opacity: regionLabelOpacity }}>
              {regionLabelPoints.map((r) => (
                <g key={r.id} transform={`translate(${r.x},${r.y})`}>
                  <g className="marker-scale">
                    <text
                      ref={(el) => setRegionLabelRef(r.id, el)}
                      className={r.sea ? 'region-label region-label--sea' : 'region-label region-label--land'}
                      x={0}
                      y={4}
                      textAnchor="middle"
                    >
                      {r.text}
                    </text>
                  </g>
                </g>
              ))}
            </g>

            <g className="markers">
              {markers.map((m) => {
                if (clusteredKeys.has(m.key)) return null;
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
                    data-hint={String(markerHintTarget?.key === m.key)}
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
                      {/* Always rendered; the labelInfo effect writes
                          x/y/text-anchor/display straight to this node
                          (labelRefs) rather than through React state — see
                          the comment on that effect. Starts hidden so
                          nothing flashes at the default 11,4 position
                          before the first measurement pass runs. */}
                      <text
                        ref={(el) => {
                          if (el) labelRefs.current.set(m.key, el);
                          else labelRefs.current.delete(m.key);
                        }}
                        className="marker-label"
                        x={11}
                        y={4}
                        style={{ display: 'none' }}
                      >
                        {m.name}
                      </text>
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

            {/* improvement-plan §1.3: named stops on the selected route.
                Decorative (aria-hidden) — the route's own aria-label and the
                panel's ordered stop list (DetailPanel) are the accessible
                path to this same information; a dot with no text alternative
                of its own would otherwise be silent to a screen reader. */}
            {selectedRouteStops.length > 0 && (
              <g className="route-stops" aria-hidden="true">
                {selectedRouteStops.map((s) => (
                  <g key={s.key} className="marker-scale" transform={`translate(${s.x},${s.y})`}>
                    <circle
                      className={s.attested ? 'route-stop route-stop--attested' : 'route-stop route-stop--bend'}
                      r={s.attested ? 5 : 3}
                    />
                    {s.attested && s.name && (
                      <text ref={(el) => setStopLabelRef(s.key, el)} className="route-stop-label" x={11} y={4}>
                        {s.name}
                      </text>
                    )}
                  </g>
                ))}
              </g>
            )}

            {shipVisible && (
              <g className="ship" ref={shipRef} data-sailing="false" aria-hidden="true">
                <g className="marker-scale">
                  <use className="ship-glyph" href={`#${shipSymbol}`} x={-13} y={-13} width={26} height={26} />
                </g>
              </g>
            )}
          </g>
        </svg>

        {/* Period label sits on the map surface (atlas-map.md). improvement-
            plan §1.2: the route/place count is now visible (not just
            aria-only) and is the one live region for this whole cluster of
            controls — every count-changing control below (period chips,
            step buttons, Play, the filter panel) updates this same region,
            never a per-control announcement. */}
        <div className="atlas-map__topbar" ref={topbarRef}>
          <p className="atlas-map__period" role="status" aria-live="polite">
            {period?.label ?? 'All periods'}
            {periodYears !== '' && <span className="atlas-map__years"> · {periodYears}</span>}
            <span className="atlas-map__count">
              {' · '}
              {countLabel(activeRoutes.length, periodActiveRoutes.length, 'route', 'routes')}
              {', '}
              {countLabel(activeMarkers.length, periodActiveMarkers.length, 'place', 'places')}
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
            A1 fix: the caption is the same text at every width (never
            reworded) but is always collapsed behind a real, visible,
            focusable summary — coordinator-confirmed fix (16 Sept, third
            round): `caveatOpen` defaults to `false` at every width now
            (see this state's own comment), so the summary must never be
            hidden by a width media query, on pain of making the caveat
            (modern coastline, reconstruction, present-day borders)
            unreachable on desktop, which is exactly the bug that shipped
            once before. `caveatOpen` is independent of the media query
            after mount, exactly like `legendOpen` below, so toggling it by
            hand isn't fought by re-renders.
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
              {borders
                ? ' Country outlines are present-day borders, shown for orientation — Kalinga had no fixed national boundaries in this period.'
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

        {/* improvement-plan §1.5: "Tap a glowing dot" first-load nudge. The
            pointer is the pulsing marker itself (data-hint on the matching
            <g> above); this card only supplies the words, so it stays a
            plain bottom-anchored card rather than trying to track the
            target's screen position through every future pan/zoom. */}
        {markerHintTarget && (
          <div className="atlas-map__hint atlas-map__hint--marker" role="status" aria-live="polite">
            <p>
              <span aria-hidden="true">✨</span> Tap a glowing dot to find out what happened there.
            </p>
            <button
              type="button"
              className="atlas-map__hint-close"
              onClick={dismissMarkerHint}
              aria-label="Close this tip"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
        )}

        {/* improvement-plan §1.4: scale bar + north arrow — sits in the
            already-reserved bottom chrome band (getSafeRect's bottom inset
            already spans the stage's full width, driven by the zoom column
            and keys button on either side of this), so no marker label ever
            has to route around it separately. North is always screen-up:
            this Mercator projection is never rotated. */}
        <div className="atlas-map__orient">
          {scaleBarInfo && (
            <div className="atlas-map__scale">
              <span className="atlas-map__scale-bar" aria-hidden="true" style={{ width: `${scaleBarInfo.px}px` }} />
              <span className="atlas-map__scale-label">{scaleBarInfo.km} km</span>
            </div>
          )}
          <div className="atlas-map__north" aria-label="North is up">
            <span aria-hidden="true">▲</span>
            <span>N</span>
          </div>
        </div>

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
          {/* atlas-layout.md §3+4: replaces the in-figure legend. */}
          <button
            type="button"
            className="atlas-map__ctl"
            ref={legendButtonRef}
            onClick={() => setShowLegend(true)}
            aria-label="Map key"
            aria-haspopup="dialog"
            aria-expanded={showLegend}
          >
            <span aria-hidden="true">🗝</span>
          </button>
        </div>

        {/* Coordinator-confirmed fix: moved out of the left-hand zoom
            column (which was 5 buttons tall — 252px — and, combined with
            the topbar, overlapped it on the dialog's short stage) to sit
            with the keys button on the right instead. Purely a chrome
            layout choice; no behaviour change. */}
        <div className="atlas-map__keys-col">
          <button
            type="button"
            className="atlas-map__ctl"
            ref={filterButtonRef}
            onClick={() => setShowFilter(true)}
            aria-label="Show on the map"
            aria-haspopup="dialog"
            aria-expanded={showFilter}
          >
            <span aria-hidden="true">☰</span>
          </button>
          <button
            type="button"
            className="atlas-map__ctl"
            ref={keysButtonRef}
            onClick={() => setShowKeys(true)}
            aria-label="How to move around the map"
          >
            <span aria-hidden="true">?</span>
          </button>
        </div>

        {/* improvement-plan §1.2b(f): never a dead-end empty map. */}
        {nothingShowing && (
          <div className="atlas-map__empty" role="status">
            <p>
              Nothing is showing.{' '}
              <button type="button" className="atlas-btn" onClick={clearAllFilters}>
                Show all
              </button>
            </p>
          </div>
        )}

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

      <dialog
        className="keys-sheet atlas-map__legend"
        ref={legendDialogRef}
        aria-labelledby={legendTitleId}
        onClose={() => {
          setShowLegend(false);
          legendButtonRef.current?.focus();
        }}
      >
        <div className="sheet__head">
          <h3 className="sheet__title" id={legendTitleId}>
            What do the colours mean?
          </h3>
          <button
            type="button"
            className="atlas-panel__close"
            ref={legendCloseRef}
            onClick={() => setShowLegend(false)}
          >
            <span aria-hidden="true">×</span>
            <span className="visually-hidden">Close the map key</span>
          </button>
        </div>

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

        {/* atlas-layout.md §6: modern borders are context, not a historical
            claim — a separate group, grey swatch not used anywhere else. */}
        <div className="legend-group">
          <h4>Orientation</h4>
          <dl className="legend-dl">
            <div className="legend-row">
              <dt aria-hidden="true">
                <span className="legend-swatch legend-swatch--border-modern" />
              </dt>
              <dd>Modern country borders — shown for orientation only, not a historical boundary.</dd>
            </div>
          </dl>
        </div>
      </dialog>

      {/* improvement-plan §1.2b(c): "Show on the map" filter panel. A sheet
          at narrow widths (docked below the map, never covering it while
          ticking boxes) and a popover at wide ones — same `keys-sheet`
          mechanics/class as the other two dialogs, width behaviour handled
          entirely by CSS. */}
      <dialog
        className="keys-sheet atlas-map__filter"
        ref={filterDialogRef}
        aria-labelledby={filterTitleId}
        onClose={() => {
          setShowFilter(false);
          filterButtonRef.current?.focus();
        }}
        onKeyDown={(e) => {
          // The modal (wide-width) case already closes natively on Escape
          // via the dialog's own `cancel` event; this is what the non-modal
          // narrow-width `.show()` case needs, since that gets no such
          // behaviour for free. Harmless to also run in the modal case.
          if (e.key === 'Escape') {
            e.stopPropagation();
            setShowFilter(false);
            filterButtonRef.current?.focus();
          }
        }}
      >
        <div className="sheet__head">
          <h3 className="sheet__title" id={filterTitleId}>
            Show on the map
          </h3>
          <button
            type="button"
            className="atlas-panel__close"
            ref={filterCloseRef}
            onClick={() => setShowFilter(false)}
          >
            <span aria-hidden="true">×</span>
            <span className="visually-hidden">Close the filter</span>
          </button>
        </div>

        <p className="atlas-filter__global">
          <button type="button" className="atlas-btn" onClick={clearAllFilters}>
            Show all
          </button>
          <button type="button" className="atlas-btn atlas-btn--ghost" onClick={hideAllFilters}>
            Hide all
          </button>
        </p>

        <label className="atlas-filter__faint">
          <input type="checkbox" checked={showFaint} onChange={(e) => setShowFaint(e.currentTarget.checked)} />
          Show other centuries faintly
        </label>

        {/* §1.2b(c): route-mode quick chips. */}
        <div className="atlas-filter__group">
          <h4>How people travelled</h4>
          <ul className="atlas-filter__chips" role="list">
            {(Object.keys(MODE_LABEL) as Route['mode'][]).map((mode) => {
              const on = !hiddenModes.has(mode);
              return (
                <li key={mode}>
                  <button
                    type="button"
                    className="atlas-filter__chip"
                    aria-pressed={on}
                    onClick={() =>
                      setHiddenModes((prev) => {
                        const next = new Set(prev);
                        if (next.has(mode)) next.delete(mode);
                        else next.add(mode);
                        return next;
                      })
                    }
                  >
                    {MODE_LABEL[mode]}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {(
          [
            { title: 'Routes', items: filterableRoutes, hidden: hiddenRouteIds, setHidden: setHiddenRouteIds },
            { title: 'Ports', items: filterablePorts, hidden: hiddenPortIds, setHidden: setHiddenPortIds },
            { title: 'Sites', items: filterableSites, hidden: hiddenSiteIds, setHidden: setHiddenSiteIds },
          ] as const
        ).map((group) => (
          <div className="atlas-filter__group" key={group.title}>
            <div className="atlas-filter__group-head">
              <h4>{group.title}</h4>
              <p className="atlas-filter__group-actions">
                <button
                  type="button"
                  className="atlas-filter__link"
                  onClick={() => group.setHidden(new Set())}
                >
                  Show all
                </button>
                <button
                  type="button"
                  className="atlas-filter__link"
                  onClick={() => group.setHidden(new Set(group.items.map((i) => i.id)))}
                >
                  Hide all
                </button>
              </p>
            </div>
            {group.items.length === 0 ? (
              <p className="atlas-filter__empty">None active this period.</p>
            ) : (
              <ul className="atlas-filter__list" role="list">
                {group.items.map((item) => {
                  const checked = !group.hidden.has(item.id);
                  return (
                    <li key={item.id}>
                      <label className="atlas-filter__row">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            group.setHidden((prev) => {
                              const next = new Set(prev);
                              if (next.has(item.id)) next.delete(item.id);
                              else next.add(item.id);
                              return next;
                            })
                          }
                        />
                        <span className="atlas-filter__row-badges" aria-hidden="true">
                          <span className={`legend-glyph tier-${TIER[item.evidence_level].css}`}>
                            {TIER[item.evidence_level].glyph}
                          </span>
                          <span className={`legend-glyph type-${item.evidence_type}`}>
                            {TYPE[item.evidence_type].glyph}
                          </span>
                        </span>
                        {item.name}
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ))}
      </dialog>

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
