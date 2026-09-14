/**
 * Atlas — composes the map, the timeline, the detail panel and the
 * "Did you know?" toast so they share the active period and the selection.
 * This is the single island mounted on the home page.
 *
 * Focus model:
 *   marker/route (Enter or Space) → selection → focus moves into the panel
 *   panel (Esc or close button)   → selection cleared → focus returns to the
 *                                   marker via AtlasMap's focusReturnToken.
 */
import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { Fact, Good, Period, Port, Route, Site, Source } from '@data/schema';
import { AtlasMap, type MapSelection } from './AtlasMap';
import { Timeline } from './Timeline';
import { DetailPanel, Sources, type SelectedEntity } from './DetailPanel';
import { Badge } from './Badge';
import '@styles/atlas.css';

export interface AtlasProps {
  ports: Port[];
  routes: Route[];
  sites: Site[];
  periods: Period[];
  goods: Good[];
  facts: Fact[];
  sources: Source[];
  initialPeriod?: string;
}

/** did-you-know.md: auto-dismiss after 12s of no interaction. */
const FACT_TIMEOUT_MS = 12_000;

function readMs(el: Element | null, name: string, fallback: number): number {
  if (!el || typeof window === 'undefined') return fallback;
  const raw = window.getComputedStyle(el).getPropertyValue(name).trim();
  if (raw === '') return fallback;
  if (raw.endsWith('ms')) return Number.parseFloat(raw) || 0;
  if (raw.endsWith('s')) return (Number.parseFloat(raw) || 0) * 1000;
  return fallback;
}

export default function Atlas({
  ports,
  routes,
  sites,
  periods,
  goods,
  facts,
  sources,
  initialPeriod,
}: AtlasProps) {
  const ordered = useMemo(() => [...periods].sort((a, b) => a.order - b.order), [periods]);
  const first = ordered[0];
  const [activePeriod, setActivePeriod] = useState(initialPeriod ?? first?.id ?? '');
  const [selection, setSelection] = useState<MapSelection | null>(null);
  const [focusReturnToken, setFocusReturnToken] = useState(0);
  const [turning, setTurning] = useState(false);
  const [dismissedFact, setDismissedFact] = useState<string | null>(null);
  const [factHeld, setFactHeld] = useState(false);
  const [factSourcesOpen, setFactSourcesOpen] = useState(false);

  const rootRef = useRef<HTMLElement | null>(null);
  const firstRender = useRef(true);

  // Manuscript page turn: flag the wrapper for --dur-page; the animation is
  // pure CSS (see .atlas-island[data-turning] in atlas.css).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const ms = readMs(rootRef.current, '--dur-page', 700);
    if (ms <= 0) return;
    setTurning(true);
    const timer = window.setTimeout(() => setTurning(false), ms);
    return () => window.clearTimeout(timer);
  }, [activePeriod]);

  const selected = useMemo<SelectedEntity | null>(() => {
    if (!selection) return null;
    if (selection.kind === 'port') {
      const entity = ports.find((p) => p.id === selection.id);
      return entity ? { kind: 'port', entity } : null;
    }
    if (selection.kind === 'site') {
      const entity = sites.find((s) => s.id === selection.id);
      return entity ? { kind: 'site', entity } : null;
    }
    const entity = routes.find((r) => r.id === selection.id);
    return entity ? { kind: 'route', entity } : null;
  }, [selection, ports, routes, sites]);

  // One "Did you know?" at a time: prefer a fact about the selected entity
  // (or one of its goods), otherwise a fact about the period on screen.
  const fact = useMemo<Fact | null>(() => {
    if (facts.length === 0) return null;
    if (selected) {
      const related = new Set<string>([selected.entity.id]);
      if (selected.kind !== 'site') for (const g of selected.entity.goods) related.add(g);
      const hit = facts.find((f) => f.related_ids.some((rid) => related.has(rid)));
      if (hit) return hit;
    }
    return facts.find((f) => f.periods.includes(activePeriod)) ?? facts[0] ?? null;
  }, [facts, selected, activePeriod]);

  /** did-you-know.md: only offer "Show me" when the fact points somewhere. */
  const factTarget = useMemo<MapSelection | null>(() => {
    if (!fact) return null;
    for (const rid of fact.related_ids) {
      if (ports.some((p) => p.id === rid)) return { kind: 'port', id: rid };
      if (sites.some((s) => s.id === rid)) return { kind: 'site', id: rid };
      if (routes.some((r) => r.id === rid)) return { kind: 'route', id: rid };
    }
    return null;
  }, [fact, ports, sites, routes]);

  const showFact = fact !== null && dismissedFact !== fact.id;

  // A new fact starts its own timer; hover, focus or an open citation holds it.
  useEffect(() => {
    if (!showFact || !fact) return;
    if (factHeld || factSourcesOpen) return;
    const timer = window.setTimeout(() => setDismissedFact(fact.id), FACT_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [showFact, fact, factHeld, factSourcesOpen]);

  useEffect(() => {
    setFactHeld(false);
    setFactSourcesOpen(false);
  }, [fact?.id]);

  const closePanel = () => {
    setSelection(null);
    setFocusReturnToken((n) => n + 1);
  };

  const onFactKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape' && fact) {
      event.stopPropagation();
      setDismissedFact(fact.id);
    }
  };

  return (
    <section
      className="atlas-island"
      ref={rootRef}
      aria-labelledby="atlas-heading"
      data-turning={String(turning)}
    >
      <h2 id="atlas-heading" className="visually-hidden">
        Interactive atlas
      </h2>

      <div className="atlas__grid">
        <div className="atlas__main">
          <AtlasMap
            ports={ports}
            routes={routes}
            sites={sites}
            periods={periods}
            activePeriod={activePeriod}
            selection={selection}
            onSelect={setSelection}
            onClear={closePanel}
            focusReturnToken={focusReturnToken}
          />

          <div id="timeline">
            <Timeline periods={periods} activePeriod={activePeriod} onChange={setActivePeriod} />
          </div>

          {showFact && fact && (
            <aside
              className="atlas-fact"
              role="status"
              aria-live="polite"
              aria-label="Did you know?"
              onMouseEnter={() => setFactHeld(true)}
              onMouseLeave={() => setFactHeld(false)}
              onFocus={() => setFactHeld(true)}
              onBlur={() => setFactHeld(false)}
              onKeyDown={onFactKeyDown}
            >
              <div className="atlas-fact__body">
                <h3 className="atlas-fact__title">
                  <span aria-hidden="true">ⓘ</span> Did you know?
                </h3>
                <p className="atlas-fact__text">{fact.text}</p>
                {/* A <div>, not a <p>: it contains the <details> citation. */}
                <div className="atlas-fact__cite">
                  <Badge level={fact.evidence_level} type={fact.evidence_type} compact />
                  <Sources refs={fact.source_refs} sources={sources} onToggle={setFactSourcesOpen} />
                </div>
                {factTarget && (
                  <p className="atlas-fact__action">
                    <button
                      type="button"
                      className="atlas-btn"
                      onClick={() => {
                        setSelection(factTarget);
                        setDismissedFact(fact.id);
                      }}
                    >
                      Show me <span aria-hidden="true">→</span>
                    </button>
                  </p>
                )}
              </div>
              <button
                type="button"
                className="atlas-fact__close"
                onClick={() => setDismissedFact(fact.id)}
              >
                <span aria-hidden="true">×</span>
                <span className="visually-hidden">Hide this fact</span>
              </button>
            </aside>
          )}
        </div>

        <DetailPanel
          selected={selected}
          sources={sources}
          goods={goods}
          periods={periods}
          onClose={closePanel}
        />
      </div>
    </section>
  );
}
