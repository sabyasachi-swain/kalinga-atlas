/**
 * Matches a route's bare waypoints against published ports/sites, so the
 * drawn line can show *where it passes near* without ever claiming a ship
 * stopped there. improvement-plan-2026-09-16.md §1.3 / §1.2b.
 *
 * The data has no stop labels (Route.waypoints is just `{lat, lng}[]`, see
 * src/data/schema.ts) — this is a cartographic labelling pass over existing
 * line geometry, never a data change and never a new historical claim.
 * Shared by AtlasMap.tsx (dots + "show only this route" filtering) and
 * DetailPanel.tsx (the "Places along the way" list).
 *
 * Coordinator-confirmed sourcing violation, fixed here (16 Sept follow-up):
 * the original 25km tolerance, with no endpoint exclusion and no check of
 * the route's own caveats, produced invented stops — e.g. a 19th-century
 * canal route (`route-cuttack-chandbali-canal`, whose own `caveats` says its
 * waypoints were "read off a modern map") was rendered as visiting a
 * Buddhist monastery complex. Three changes fix this; see each constant's
 * own comment.
 */
import type { Port, Route, Site } from '@data/schema';

/**
 * Tolerance for "this waypoint is really this port/site", in kilometres.
 * Was 25km; the real, defensible hits in this dataset are 0.0–2.8km (a
 * waypoint placed exactly at, or immediately beside, a published place).
 * 14–25km is coastline-simplification noise that happened to land nearer
 * one place than any other, not evidence of a stop. 5km is comfortably
 * above the genuine hits and comfortably below the ~40km+ gap between any
 * two distinct published places on this coast, so it cannot straddle both
 * failure modes.
 */
export const STOP_MATCH_TOLERANCE_KM = 5;

/**
 * A route whose own `caveats` says this is what its course is — a
 * schematic line, traced off a modern map, or otherwise not a surveyed
 * itinerary — must never have its intermediate waypoints named, however
 * close one happens to sit to a real place: proximity to an unrelated
 * place is not evidence the route passed through it on purpose. This is a
 * deliberately blunt, conservative text match (false positives just mean
 * an extra route shows endpoints-only, which is always safe; a false
 * negative would let an unsourced course keep an invented stop, which is
 * not) — reviewed case by case is better, but this is the honest
 * mechanical proxy available from data an agent must not edit.
 */
const UNSOURCED_COURSE_PATTERN = /schematic|read off a modern map|not a surveyed|inference|approximate/i;

interface Place {
  kind: 'port' | 'site';
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface WaypointInfo {
  index: number;
  lat: number;
  lng: number;
  /** The endpoints (index 0 and the last) always resolve to a place by id —
   * they are `route.from`/`route.to`, which are always a port or site id. */
  isEndpoint: boolean;
  /** The matched place, or null for an unlabelled geometric bend. Never the
   * route's own `from`/`to` place — see `classifyWaypoints`. */
  place: Place | null;
  /** Distance in km to `place`, for the reporting table; undefined when
   * `place` is null. */
  km?: number;
}

export interface RouteStop {
  kind: 'port' | 'site';
  id: string;
  name: string;
  lat: number;
  lng: number;
  attested: boolean;
}

export interface RouteStopsResult {
  /** Ordered: from-endpoint, then attested intermediate stops (empty when
   * the route's course is unsourced — see `courseUnsourced`), then
   * to-endpoint. */
  stops: RouteStop[];
  /** True whenever the panel must show "The drawn course is approximate" —
   * because at least one intermediate waypoint is an unlabelled bend, or
   * because the whole course is unsourced and every intermediate name was
   * suppressed regardless of how well it happened to match. Always true
   * when `courseUnsourced` is true. */
  hasBend: boolean;
  /** This route's own `caveats` matched UNSOURCED_COURSE_PATTERN — every
   * intermediate waypoint is suppressed unconditionally. */
  courseUnsourced: boolean;
  /** True only when `stops` contains at least one *named intermediate* —
   * i.e. more than just the two (sourced) endpoints. Coordinator-confirmed
   * fix (16 Sept, third round): the panel's heading and note read
   * differently depending on this — "these are places the line passes
   * near" is only true when something other than the endpoints is listed;
   * with today's data (every route's course is either unsourced or has no
   * intermediate within tolerance) this is `false` for all 32 routes, so
   * the panel must not claim otherwise. */
  hasNamedIntermediate: boolean;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance in km (haversine). Good enough at this scale — not
 * used for anything requiring survey-grade precision. */
function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

function placeById(id: string, ports: Port[], sites: Site[]): Place | null {
  const p = ports.find((x) => x.id === id);
  if (p) return { kind: 'port', id: p.id, name: p.name, lat: p.coordinates.lat, lng: p.coordinates.lng };
  const s = sites.find((x) => x.id === id);
  if (s) return { kind: 'site', id: s.id, name: s.name, lat: s.coordinates.lat, lng: s.coordinates.lng };
  return null;
}

/** Nearest place to `point`, excluding `excludeIds` — an intermediate
 * waypoint that is simply near the route's own endpoint is a bend on the
 * approach to that endpoint, never a distinct stop of its own. */
function nearestPlace(
  point: { lat: number; lng: number },
  ports: Port[],
  sites: Site[],
  excludeIds: ReadonlySet<string>,
): { place: Place; km: number } | null {
  let best: { place: Place; km: number } | null = null;
  for (const p of ports) {
    if (excludeIds.has(p.id)) continue;
    const km = haversineKm(point, p.coordinates);
    if (!best || km < best.km) {
      best = { place: { kind: 'port', id: p.id, name: p.name, lat: p.coordinates.lat, lng: p.coordinates.lng }, km };
    }
  }
  for (const s of sites) {
    if (excludeIds.has(s.id)) continue;
    const km = haversineKm(point, s.coordinates);
    if (!best || km < best.km) {
      best = { place: { kind: 'site', id: s.id, name: s.name, lat: s.coordinates.lat, lng: s.coordinates.lng }, km };
    }
  }
  return best;
}

/**
 * Classifies every waypoint of a route: the two endpoints always resolve
 * (they're `route.from`/`route.to`, always a port/site id); each
 * intermediate waypoint resolves to the nearest *other* published place
 * only when that place is within STOP_MATCH_TOLERANCE_KM, otherwise it's an
 * unlabelled bend (`place: null`). This is pure geometric classification —
 * it does not know about `UNSOURCED_COURSE_PATTERN`; `getRouteStops`
 * applies that suppression on top.
 */
export function classifyWaypoints(route: Route, ports: Port[], sites: Site[]): WaypointInfo[] {
  const last = route.waypoints.length - 1;
  const endpointIds = new Set([route.from, route.to]);
  return route.waypoints.map((wp, index) => {
    const isEndpoint = index === 0 || index === last;
    if (isEndpoint) {
      const id = index === 0 ? route.from : route.to;
      return { index, lat: wp.lat, lng: wp.lng, isEndpoint, place: placeById(id, ports, sites) };
    }
    const hit = nearestPlace(wp, ports, sites, endpointIds);
    if (hit && hit.km <= STOP_MATCH_TOLERANCE_KM) {
      return { index, lat: wp.lat, lng: wp.lng, isEndpoint, place: hit.place, km: hit.km };
    }
    return { index, lat: wp.lat, lng: wp.lng, isEndpoint, place: null };
  });
}

/** Ordered stops for one route: endpoints always included; intermediate
 * waypoints included only when matched to a published place *and* the
 * route's own course isn't flagged unsourced (§1.3 fix — see
 * UNSOURCED_COURSE_PATTERN); consecutive duplicates collapsed. */
export function getRouteStops(route: Route, ports: Port[], sites: Site[]): RouteStopsResult {
  const courseUnsourced = UNSOURCED_COURSE_PATTERN.test(route.caveats ?? '');
  const classified = classifyWaypoints(route, ports, sites);
  const stops: RouteStop[] = [];
  let hasBend = false;
  let hasNamedIntermediate = false;
  for (const w of classified) {
    if (w.isEndpoint) {
      if (w.place) stops.push({ ...w.place, attested: true });
      continue;
    }
    if (!w.place || courseUnsourced) {
      hasBend = true;
      continue;
    }
    const lastStop = stops[stops.length - 1];
    if (lastStop && lastStop.id === w.place.id) continue; // same place as the one just added
    stops.push({ ...w.place, attested: true });
    hasNamedIntermediate = true;
  }
  return { stops, hasBend: hasBend || courseUnsourced, courseUnsourced, hasNamedIntermediate };
}

/** Every id (port or site) that counts as one of this route's own stops —
 * used to filter the map down to "just this route" (improvement-plan
 * §1.2b: "Show only this route"). Endpoints only when the course is
 * unsourced, since no intermediate is shown in that case either. */
export function getRouteStopIds(route: Route, ports: Port[], sites: Site[]): Set<string> {
  return new Set(getRouteStops(route, ports, sites).stops.map((s) => s.id));
}
