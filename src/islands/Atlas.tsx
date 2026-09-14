/**
 * Atlas — composes the map and timeline so they share the active period.
 * This is the single island mounted on the home page.
 */
import { useState } from 'react';
import type { Port, Route, Period, Site } from '@data/schema';
import { AtlasMap } from './AtlasMap';
import { Timeline } from './Timeline';

export interface AtlasProps {
  ports: Port[];
  routes: Route[];
  sites: Site[];
  periods: Period[];
  initialPeriod?: string;
}

export default function Atlas({ ports, routes, sites, periods, initialPeriod }: AtlasProps) {
  const first = [...periods].sort((a, b) => a.order - b.order)[0];
  const [activePeriod, setActivePeriod] = useState(initialPeriod ?? first?.id ?? '');

  return (
    <section aria-labelledby="atlas-heading">
      <h2 id="atlas-heading" className="visually-hidden">
        Interactive atlas
      </h2>
      <AtlasMap ports={ports} routes={routes} sites={sites} periods={periods} activePeriod={activePeriod} />
      <div id="timeline">
        <Timeline periods={periods} activePeriod={activePeriod} onChange={setActivePeriod} />
      </div>
    </section>
  );
}
