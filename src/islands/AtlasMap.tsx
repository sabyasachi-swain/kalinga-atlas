/**
 * AtlasMap island — the centrepiece.
 *
 * STUB. The engineer agent implements this following
 * .claude/skills/atlas-engineering/map-architecture.md. The props contract
 * below is the agreed interface between the data layer and the map and must
 * not change without updating that document.
 *
 * Rendering plan (see the skill for detail):
 *   - <canvas> for Natural Earth land/rivers (cheap, no DOM per polygon)
 *   - <svg> overlay for routes and ports so each is a focusable, labelled element
 *   - d3-zoom on the container with keyboard equivalents (+ / - / arrows / 0)
 *   - Period changes animate opacity over --dur-page with the page-turn easing
 */
import type { Port, Route, Period, Site } from '@data/schema';

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
  onSelect?: (selection: { kind: 'port' | 'route' | 'site'; id: string }) => void;
}

export function AtlasMap({ ports, routes, sites, periods, activePeriod }: AtlasMapProps) {
  const period = periods.find((p) => p.id === activePeriod);
  const visiblePorts = ports.filter((p) => p.periods.includes(activePeriod));
  const visibleRoutes = routes.filter((r) => r.periods.includes(activePeriod));
  const visibleSites = sites.filter((s) => s.periods.includes(activePeriod));

  return (
    <figure
      role="group"
      aria-label={`Map of Kalinga trade routes, ${period?.label ?? 'all periods'}`}
      style={{
        background: 'var(--map-sea)',
        color: 'var(--map-label)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-6)',
        minHeight: '24rem',
        display: 'grid',
        placeItems: 'center',
        textAlign: 'center',
        margin: 0,
      }}
    >
      <div>
        <p style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-xl)' }}>
          Atlas map placeholder
        </p>
        <p>
          {period?.label ?? 'No period selected'} · {visiblePorts.length} ports · {visibleRoutes.length} routes ·{' '}
          {visibleSites.length} sites
        </p>
        <p style={{ fontSize: 'var(--text-sm)', opacity: 0.8 }}>
          The interactive map is built in Phase 3. Run <code>/phase build</code>.
        </p>
      </div>
      <figcaption className="visually-hidden">
        Interactive map showing ports, sites and trade routes for the selected period. Each port is listed in the
        Ports section below with its sources.
      </figcaption>
    </figure>
  );
}
