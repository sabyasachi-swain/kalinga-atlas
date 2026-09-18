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
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
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
/** atlas-layout.md §1: one fact per *settled* period, not one per period
 * crossed while dragging. Mirrors --dur-toast-settle (tokens.css); read
 * from the root, not the map figure, since the toast may not be mounted
 * yet when this is first needed. */
const FACT_SETTLE_MS = 500;
/** atlas-layout.md §5 / improvement-plan 1.1: the grid's own breakpoint
 * (--atlas-breakpoint in atlas.css) — matched here in JS so the fact card's
 * portal target can follow the same column-vs-stacked layout switch the
 * CSS grid already makes. Repeated as a literal on both sides deliberately
 * (see atlas.css's own comment on --atlas-breakpoint). */
const WIDE_QUERY = '(min-width: 56.25rem)';
/** improvement-plan §1.2: Play walks the periods roughly this often. */
const PLAY_STEP_MS = 2500;

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
  // Coordinator fix, 18 September: on phones the map opens in a modal
  // <dialog> (top layer); the detail panel used to stay rendered in the page
  // column behind it, so selecting a marker looked like it did nothing until
  // the dialog closed. `sheetDismissed` tracks whether the visitor has
  // collapsed the in-dialog sheet without clearing the selection — see
  // `onDismissSheet` and the portal wiring below.
  const [sheetDismissed, setSheetDismissed] = useState(false);
  useEffect(() => {
    setSheetDismissed(false);
  }, [selection?.kind, selection?.id]);
  const onDismissSheet = useCallback(() => {
    setSheetDismissed(true);
    setFocusReturnToken((n) => n + 1);
  }, []);
  const [turning, setTurning] = useState(false);
  const [dismissedFact, setDismissedFact] = useState<string | null>(null);
  const [factHeld, setFactHeld] = useState(false);
  const [factSourcesOpen, setFactSourcesOpen] = useState(false);

  // -- improvement-plan §1.2: Play/step -------------------------------------
  // Owned here (not Timeline.tsx) because it has to stop the moment *any*
  // manual interaction happens, including ones Timeline knows nothing about
  // (selecting a marker/route on the map). `changePeriod` is what every
  // manual path (chips, slider, step buttons) goes through; Play's own
  // interval calls `setActivePeriod` directly so starting Play doesn't
  // immediately stop itself.
  const [isPlaying, setIsPlaying] = useState(false);
  const changePeriod = useCallback((id: string) => {
    setIsPlaying(false);
    setActivePeriod(id);
  }, []);
  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => {
      setActivePeriod((cur) => {
        const idx = ordered.findIndex((p) => p.id === cur);
        const next = ordered[idx + 1];
        if (!next) {
          setIsPlaying(false);
          return cur;
        }
        return next.id;
      });
    }, PLAY_STEP_MS);
    return () => window.clearInterval(timer);
  }, [isPlaying, ordered]);

  // -- improvement-plan §1.2b(b): "Show only this route" -------------------
  // Shared between AtlasMap (does the actual filtering) and DetailPanel
  // (renders the toggle) — see AtlasMap's own comment on the prop for why
  // this is an overlay on top of the persistent filter, not a member of it.
  const [showOnlyRouteId, setShowOnlyRouteId] = useState<string | null>(null);
  useEffect(() => {
    setShowOnlyRouteId((cur) => {
      if (cur && selection?.kind === 'route' && selection.id === cur) return cur;
      return null;
    });
  }, [selection, activePeriod]);

  /** Any map interaction (marker/route select, or clearing) is manual and
   * stops Play, same as changePeriod above. */
  const selectFromMap = useCallback((sel: MapSelection) => {
    setIsPlaying(false);
    setSelection(sel);
  }, []);

  const rootRef = useRef<HTMLElement | null>(null);
  const firstRender = useRef(true);

  // -- A3: phone full-screen map (docs/design/kid-experience.md) -----------
  //
  // AtlasMap is a single React element, portalled between an inline host
  // (normal page flow, visible >= 600px) and a host inside a native
  // <dialog> (full screen, phones only). Only one D3 zoom instance ever
  // exists — moving the portal target relocates its DOM subtree instead of
  // unmounting and remounting the island.
  const inlineMapHostRef = useRef<HTMLDivElement | null>(null);
  const dialogMapHostRef = useRef<HTMLDivElement | null>(null);
  const mapDialogRef = useRef<HTMLDialogElement | null>(null);
  const exploreMapBtnRef = useRef<HTMLButtonElement | null>(null);
  const mapCloseBtnRef = useRef<HTMLButtonElement | null>(null);
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const [mapPortalTarget, setMapPortalTarget] = useState<HTMLElement | null>(null);

  // -- improvement-plan-2026-09-16.md §1.1: the fact card is a document-flow
  // sibling, never absolutely positioned over the map. Three possible hosts,
  // exactly one ever the live portal target (never two — same single-portal
  // discipline as `mapPortalTarget` above):
  //   - factHostWideRef:   >= 56.25rem, stacked above DetailPanel in the
  //                        right-hand column (read before the panel: the
  //                        toast is transient/ambient, the panel is what the
  //                        visitor asked for by selecting something, so the
  //                        more deliberate content sits below the ambient one).
  //   - factHostNarrowRef: < 56.25rem, in-flow inside .atlas__main, below the
  //                        map card and above the timeline.
  //   - factHostDialogRef: inside the phone full-screen dialog, docked above
  //                        that dialog's own Timeline copy.
  const factHostWideRef = useRef<HTMLDivElement | null>(null);
  const factHostNarrowRef = useRef<HTMLDivElement | null>(null);
  const factHostDialogRef = useRef<HTMLDivElement | null>(null);
  const [factPortalTarget, setFactPortalTarget] = useState<HTMLElement | null>(null);

  // -- Coordinator fix, 18 September: DetailPanel follows the same
  // single-instance portal discipline as AtlasMap and the fact card above —
  // one mounted element moved between hosts, never a second copy (two live
  // panels would duplicate `headingId`/ARIA). Normally it lives in the
  // right-hand column (`panelHostSideRef`); while the phone dialog is open it
  // moves inside the dialog (`dialogPanelHostRef`) so it renders in the same
  // top-layer stacking context as the map, instead of behind it.
  const panelHostSideRef = useRef<HTMLDivElement | null>(null);
  const dialogPanelHostRef = useRef<HTMLDivElement | null>(null);
  const [panelPortalTarget, setPanelPortalTarget] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    setPanelPortalTarget(mapDialogOpen ? dialogPanelHostRef.current : panelHostSideRef.current);
  }, [mapDialogOpen]);
  const [isWideGrid, setIsWideGrid] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(WIDE_QUERY).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(WIDE_QUERY);
    const apply = () => setIsWideGrid(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  useLayoutEffect(() => {
    if (mapDialogOpen) {
      setFactPortalTarget(factHostDialogRef.current);
    } else if (isWideGrid) {
      setFactPortalTarget(factHostWideRef.current);
    } else {
      setFactPortalTarget(factHostNarrowRef.current);
    }
  }, [mapDialogOpen, isWideGrid]);

  const [isNarrowPreview, setIsNarrowPreview] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 37.4375rem)').matches,
  );

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 37.4375rem)');
    const apply = () => setIsNarrowPreview(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  // Coordinator-confirmed bug fix: this used to always target
  // `inlineMapHostRef` whenever the dialog was closed — but
  // `.atlas-map-slot__inline` is `display: none` below 600px (A3's static
  // preview replaces it there), so the live AtlasMap sat mounted inside a
  // hidden container before "Explore the map" was ever tapped. A hidden
  // host reports 0×0 to AtlasMap's own ResizeObserver, `size` never
  // becomes real, `offscreenReadyRef` never turns true, and the *first*
  // gesture once the dialog finally opens has to run AtlasMap's expensive
  // full-redraw-per-frame path instead of the cached-bitmap one — on the
  // weakest devices, for the very first thing a phone visitor does. Mount
  // only when there is a genuinely visible host: the dialog when it's
  // open, the inline host at >=600px, otherwise nowhere (`null`, so the
  // portal — and the whole AtlasMap subtree with it — simply doesn't
  // render until one becomes true). `isNarrowPreview` is lazily
  // initialised from matchMedia (see above), so this already has the
  // right answer on the very first layout effect, before paint.
  useLayoutEffect(() => {
    if (mapDialogOpen) {
      setMapPortalTarget(dialogMapHostRef.current);
    } else if (!isNarrowPreview) {
      setMapPortalTarget(inlineMapHostRef.current);
    } else {
      setMapPortalTarget(null);
    }
  }, [mapDialogOpen, isNarrowPreview]);

  useEffect(() => {
    const dialog = mapDialogRef.current;
    if (!dialog) return;
    if (mapDialogOpen && !dialog.open && typeof dialog.showModal === 'function') {
      dialog.showModal();
      mapCloseBtnRef.current?.focus();
    }
    if (!mapDialogOpen && dialog.open) dialog.close();
  }, [mapDialogOpen]);

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

  // atlas-layout.md §1: the toast's *period*-driven fact is gated by a
  // settle debounce — dragging from one period to another used to swap the
  // fact card once per period crossed. A fact triggered by a marker/route
  // click is a discrete action, not a scrub gesture, and bypasses the
  // debounce entirely (it uses `activePeriod`/`selected` directly, below,
  // never `settledPeriod`).
  const [settledPeriod, setSettledPeriod] = useState(activePeriod);
  useEffect(() => {
    const timer = window.setTimeout(() => setSettledPeriod(activePeriod), FACT_SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, [activePeriod]);

  // One "Did you know?" at a time: prefer a fact about the selected entity
  // (or one of its goods), otherwise a fact about the settled period.
  const fact = useMemo<Fact | null>(() => {
    if (facts.length === 0) return null;
    if (selected) {
      const related = new Set<string>([selected.entity.id]);
      if (selected.kind !== 'site') for (const g of selected.entity.goods) related.add(g);
      const hit = facts.find((f) => f.related_ids.some((rid) => related.has(rid)));
      if (hit) return hit;
    }
    return facts.find((f) => f.periods.includes(settledPeriod)) ?? facts[0] ?? null;
  }, [facts, selected, settledPeriod]);

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

  const factCard = fact && (
    <>
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
      <button type="button" className="atlas-fact__close" onClick={() => setDismissedFact(fact.id)}>
        <span aria-hidden="true">×</span>
        <span className="visually-hidden">Hide this fact</span>
      </button>
    </>
  );

  // atlas-layout.md §1: never calls .focus() and never traps focus — stays
  // role="status"/aria-live="polite" so a keyboard user stepping the
  // slider with arrow keys is never interrupted.
  const factNode: ReactNode = showFact && fact ? (
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
      {factCard}
    </aside>
  ) : null;

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
          {/* kid-experience.md A3: below 600px this slot shows an inert
              preview and an "Explore the map" button instead of the live
              map; at 600px and above the inline host is what's visible and
              the preview/button are hidden by CSS. */}
          <div className="atlas-map-slot">
            <div className="atlas-map-slot__inline" ref={inlineMapHostRef} />
            <div className="atlas-map-slot__preview" aria-hidden="true">
              <div className="atlas-map-slot__preview-art" />
            </div>
            <p className="atlas-map-slot__caption">The map of Kalinga's ports</p>
            <button
              type="button"
              className="atlas-map-slot__explore"
              ref={exploreMapBtnRef}
              aria-label="Explore the map of Kalinga's ports, full screen"
              onClick={() => setMapDialogOpen(true)}
            >
              <span aria-hidden="true">🗺</span> Explore the map
            </button>
          </div>

          {mapPortalTarget &&
            createPortal(
              <AtlasMap
                ports={ports}
                routes={routes}
                sites={sites}
                periods={periods}
                activePeriod={activePeriod}
                selection={selection}
                onSelect={selectFromMap}
                onClear={closePanel}
                focusReturnToken={focusReturnToken}
                fullscreen={mapDialogOpen}
                showOnlyRouteId={showOnlyRouteId}
                dialogSheetOpen={mapDialogOpen && selection !== null && !sheetDismissed}
                onDismissSheet={onDismissSheet}
              />,
              mapPortalTarget,
            )}

          {/* kid-experience.md A3: full-screen dialog, phone-only trigger.
              Docks its own Timeline at the bottom, since period switching
              doesn't need a separate screen. The fact card, when the dialog
              is open, docks just above that timeline (improvement-plan
              §1.1) — same portal target logic as the map itself. */}
          <dialog
            className="atlas-map-dialog"
            ref={mapDialogRef}
            aria-label="Map of Kalinga's ports"
            onClose={() => {
              setMapDialogOpen(false);
              exploreMapBtnRef.current?.focus();
            }}
          >
            <button
              type="button"
              className="atlas-map-dialog__close"
              ref={mapCloseBtnRef}
              onClick={() => setMapDialogOpen(false)}
              aria-label="Close map"
            >
              <span aria-hidden="true">×</span>
            </button>
            <div className="atlas-map-dialog__host" ref={dialogMapHostRef} />
            {/* Coordinator fix, 18 September: the detail sheet's live host
                inside the dialog — see panelPortalTarget above. Position
                comes from `.atlas-panel`'s existing narrow-width bottom-sheet
                CSS (atlas.css), which is `position: fixed` and so overlays
                correctly here regardless of where this div sits in flow. */}
            <div className="atlas-map-dialog__panel-host" ref={dialogPanelHostRef} />
            <div className="atlas-fact-slot atlas-fact-slot--dialog" ref={factHostDialogRef} />
            {mapDialogOpen && (
              <div className="atlas-map-dialog__timeline">
                <Timeline
                  periods={periods}
                  activePeriod={activePeriod}
                  onChange={changePeriod}
                  isPlaying={isPlaying}
                  onTogglePlay={() => setIsPlaying((v) => !v)}
                />
              </div>
            )}
          </dialog>

          {/* improvement-plan §1.1: below 56.25rem, the fact card lives here
              — in normal flow, below the map card and above the timeline. */}
          <div className="atlas-fact-slot atlas-fact-slot--narrow" ref={factHostNarrowRef} />

          <div id="timeline">
            <Timeline
              periods={periods}
              activePeriod={activePeriod}
              onChange={changePeriod}
              isPlaying={isPlaying}
              onTogglePlay={() => setIsPlaying((v) => !v)}
            />
          </div>
        </div>

        <div className="atlas__side">
          {/* improvement-plan §1.1: >= 56.25rem, the fact card stacks above
              the detail panel in the right-hand column, in normal flow. */}
          <div className="atlas-fact-slot atlas-fact-slot--wide" ref={factHostWideRef} />
          {/* Live host for the panel outside the dialog — see panelPortalTarget. */}
          <div ref={panelHostSideRef} />
        </div>

        {/* Exactly one of the three hosts above is ever the live portal
            target (see the useLayoutEffect that sets factPortalTarget) —
            never two mounted copies of the fact card at once. Same
            discipline for the detail panel below (panelPortalTarget). */}
        {factPortalTarget && createPortal(factNode, factPortalTarget)}
        {panelPortalTarget &&
          createPortal(
            <DetailPanel
              selected={selected}
              sources={sources}
              goods={goods}
              periods={periods}
              ports={ports}
              sites={sites}
              onClose={closePanel}
              showOnlyRoute={selected?.kind === 'route' && showOnlyRouteId === selected.entity.id}
              onToggleShowOnlyRoute={() => {
                if (selected?.kind !== 'route') return;
                setShowOnlyRouteId((cur) => (cur === selected.entity.id ? null : selected.entity.id));
              }}
              onSelectEntity={(kind, id) => selectFromMap({ kind, id })}
              sheetMode={mapDialogOpen}
              sheetCollapsed={sheetDismissed}
              onDismissSheet={onDismissSheet}
            />,
            panelPortalTarget,
          )}
      </div>
    </section>
  );
}
