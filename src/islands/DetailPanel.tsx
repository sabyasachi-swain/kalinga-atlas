/**
 * DetailPanel — the complementary column (right column >= 900px, bottom sheet
 * below that) showing whatever the map has selected.
 * Specs: docs/design/port-card.md, port-panel.md, cargo-manifest.md
 *
 * Every claim it renders carries an evidence badge and its sources, exactly as
 * EvidenceBadge.astro + SourcePopover.astro do on static pages. Citation
 * strings come from @data/cite so there is one formatting implementation.
 */
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { Good, Period, Port, Route, Site, Source, SourceRef } from '@data/schema';
import { formatFull, formatShort } from '@data/cite';
import { getRouteStops } from '@lib/route-stops';
import { Badge } from './Badge';

export type SelectedEntity =
  | { kind: 'port'; entity: Port }
  | { kind: 'site'; entity: Site }
  | { kind: 'route'; entity: Route };

export interface DetailPanelProps {
  selected: SelectedEntity | null;
  sources: Source[];
  goods: Good[];
  periods: Period[];
  onClose: () => void;
  /** improvement-plan-2026-09-16.md §1.2b(b): "Show only this route" — true
   * when the selected route is the one the map is currently isolating.
   * State lives in Atlas.tsx (shared with AtlasMap, which does the actual
   * filtering) since it must survive this panel re-rendering. */
  showOnlyRoute?: boolean;
  onToggleShowOnlyRoute?: () => void;
  /** improvement-plan §1.3: needed to match a route's waypoints against
   * published places for the ordered stop list — see @lib/route-stops. */
  ports: Port[];
  sites: Site[];
  onSelectEntity?: (kind: 'port' | 'site', id: string) => void;
  /**
   * True while this panel is portaled into the phone full-screen map dialog
   * (Atlas.tsx), rendering as a bottom sheet over the map rather than the
   * right-hand column. Changes what Escape and the panel's own dismiss do:
   * both collapse the sheet without clearing the map's selection, instead of
   * fully closing (`onClose`). See Atlas.tsx's `onDismissSheet`.
   */
  sheetMode?: boolean;
  /** Only meaningful when `sheetMode` — true while the visitor has
   * dismissed the sheet but the selection (and the dialog) persists. */
  sheetCollapsed?: boolean;
  onDismissSheet?: () => void;
}

const KIND_WORD: Record<SelectedEntity['kind'], string> = {
  port: 'Port',
  site: 'Site',
  route: 'Trade route',
};

const SECTION_PATH: Record<SelectedEntity['kind'], string> = {
  port: '/ports',
  site: '/sites',
  route: '/routes',
};

const DIRECTION: Record<Good['direction'], { glyph: string; label: string; short: string }> = {
  export: { glyph: '→', label: 'Leaves Kalinga (export)', short: 'leaves Kalinga' },
  import: { glyph: '←', label: 'Arrives in Kalinga (import)', short: 'arrives in Kalinga' },
  both: { glyph: '↔', label: 'Both directions', short: 'travels both ways' },
};

/**
 * Good icons are optional original SVGs in src/assets/goods/. The glob is
 * empty until the designer adds them, and then each file is hashed and emitted
 * by Vite automatically. `_template.svg` is excluded by the leading-letter glob.
 */
const GOOD_ICONS = import.meta.glob<string>('/src/assets/goods/[a-z]*.svg', {
  query: '?url',
  import: 'default',
  eager: true,
});

function iconUrl(icon: string | undefined): string | undefined {
  if (!icon) return undefined;
  return GOOD_ICONS[`/src/assets/goods/${icon}`];
}

function CrateGlyph() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round">
        <rect x="10" y="18" width="44" height="34" />
        <path d="M10,28 L54,28 M10,42 L54,42 M24,18 L24,52 M40,18 L40,52" />
      </g>
    </svg>
  );
}

/** Mirrors SourcePopover.astro: short form in the summary, full form inside. */
export function Sources({
  refs,
  sources,
  onToggle,
}: {
  refs: SourceRef[];
  sources: Source[];
  onToggle?: (open: boolean) => void;
}) {
  if (refs.length === 0) return null;
  const byId = new Map(sources.map((s) => [s.id, s]));
  return (
    <details className="panel-sources" onToggle={(e) => onToggle?.(e.currentTarget.open)}>
      {/* Coordinator-confirmed fix: `summary` is `display: flex` (to
          vertically-centre its min-height touch target), which used to make
          every `.short` span its own flex item — in a narrow column that
          rendered as ragged side-by-side text instead of one wrapping line.
          A single wrapping span here means the summary has only one flex
          item, so the citation text wraps normally regardless of width. */}
      <summary>
        <span className="visually-hidden">Sources: </span>
        <span className="panel-sources__short-wrap">
          {refs.map((r, i) => {
            const s = byId.get(r.source_id);
            return (
              <span className="short" key={`${r.source_id}-${i}`}>
                {s ? formatShort(s, sources, r) : `[unknown source ${r.source_id}]`}
                {i < refs.length - 1 ? '; ' : ''}
              </span>
            );
          })}
        </span>
      </summary>
      <ol>
        {refs.map((r, i) => {
          const s = byId.get(r.source_id);
          return (
            <li key={`${r.source_id}-full-${i}`}>
              {s ? formatFull(s, sources) : `Unresolved source id "${r.source_id}"`}
              {r.page && <span>, {r.page}</span>}
              {r.note && <em> ({r.note})</em>}
            </li>
          );
        })}
      </ol>
    </details>
  );
}

export function DetailPanel({
  selected,
  sources,
  goods,
  periods,
  onClose,
  showOnlyRoute = false,
  onToggleShowOnlyRoute,
  ports,
  sites,
  onSelectEntity,
  sheetMode = false,
  sheetCollapsed = false,
  onDismissSheet,
}: DetailPanelProps) {
  const uid = useId();
  const headingId = `panel-title-${uid}`;
  const cargoTitleId = `cargo-title-${uid}`;
  const panelRef = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const cargoCloseRef = useRef<HTMLButtonElement | null>(null);
  const [cargoOpen, setCargoOpen] = useState(false);

  const selectedId = selected?.entity.id ?? null;

  // Opening the panel moves focus into it; Escape sends focus back to the map
  // marker (Atlas.tsx bumps AtlasMap's focusReturnToken).
  useEffect(() => {
    if (!selectedId) return;
    panelRef.current?.focus();
  }, [selectedId]);

  // Selecting something else closes the cargo sheet.
  useEffect(() => {
    setCargoOpen(false);
  }, [selectedId]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (cargoOpen && !dialog.open && typeof dialog.showModal === 'function') {
      dialog.showModal();
      cargoCloseRef.current?.focus();
    }
    if (!cargoOpen && dialog.open) dialog.close();
  }, [cargoOpen]);

  const onPanelKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape' && !cargoOpen) {
      event.preventDefault();
      // In the phone dialog, Escape's first press collapses the sheet only
      // (map selection, and the dialog itself, stay put) — see Atlas.tsx.
      if (sheetMode) onDismissSheet?.();
      else onClose();
    }
  };

  const goodIds = selected && selected.kind !== 'site' ? selected.entity.goods : [];
  const cargo = goodIds
    .map((gid) => goods.find((g) => g.id === gid))
    .filter((g): g is Good => g !== undefined)
    // cargo-manifest.md: category then name; tier is never a ranking.
    .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));

  const activeIn = selected
    ? selected.entity.periods
        .map((pid) => periods.find((p) => p.id === pid))
        .filter((p): p is Period => p !== undefined)
    : [];

  // improvement-plan §1.3: "Manikapatna → Palur → Kalingapatnam → …" — only
  // attested stops (endpoints plus any intermediate waypoint matched to a
  // published port/site), never a named geometric bend.
  const routeStops = useMemo(
    () => (selected?.kind === 'route' ? getRouteStops(selected.entity, ports, sites) : null),
    [selected, ports, sites],
  );

  return (
    <aside
      ref={panelRef}
      className="atlas-panel"
      role="complementary"
      aria-labelledby={headingId}
      data-open={String(selected !== null && !(sheetMode && sheetCollapsed))}
      data-sheet={String(sheetMode)}
      tabIndex={-1}
      onKeyDown={onPanelKeyDown}
    >
      {!selected ? (
        <>
          <h3 className="atlas-panel__title" id={headingId}>
            Details
          </h3>
          <p className="atlas-panel__hint">
            Tap a dot on the map to find out its story. You can also use Tab and Enter.
          </p>
        </>
      ) : (
        <>
          {sheetMode && (
            <button
              type="button"
              className="atlas-panel__sheet-dismiss"
              onClick={onDismissSheet}
            >
              <span aria-hidden="true">▾</span> Back to map
            </button>
          )}
          <div className="atlas-panel__head">
            <h3 className="atlas-panel__title" id={headingId}>
              <span className="atlas-panel__kind">{KIND_WORD[selected.kind]}</span>
              {selected.entity.name}
            </h3>
            <button type="button" className="atlas-panel__close" onClick={onClose}>
              <span aria-hidden="true">×</span>
              <span className="visually-hidden">Close details</span>
            </button>
          </div>

          {selected.kind === 'site' && <p className="atlas-panel__subtitle">{selected.entity.site_type}</p>}

          <p className="atlas-panel__summary">
            {selected.kind === 'route' && selected.entity.kid_line
              ? selected.entity.kid_line
              : selected.entity.summary}
          </p>

          <p className="atlas-panel__badges">
            <Badge level={selected.entity.evidence_level} type={selected.entity.evidence_type} />
          </p>

          <Sources refs={selected.entity.source_refs} sources={sources} />

          {selected.kind === 'route' && selected.entity.kid_line && (
            <p className="atlas-panel__summary">{selected.entity.summary}</p>
          )}

          {/* improvement-plan §1.2b(b): plain-words label, direct answer to
              "too many lines overlapping". */}
          {selected.kind === 'route' && (
            <p className="atlas-panel__action">
              <button type="button" className="atlas-btn" onClick={onToggleShowOnlyRoute} aria-pressed={showOnlyRoute}>
                {showOnlyRoute ? 'Show the others again' : 'Show only this route'}
              </button>
            </p>
          )}

          {/* Coordinator-confirmed sourcing fix (16 Sept, third round):
              named only where the line genuinely passes near a published
              place — never presented as evidence a ship stopped there —
              and the heading/note now say something true in *both* cases:
              with a named intermediate, this is "places the line passes
              near" (a geometry statement, no evidence badge needed); with
              endpoints only (today, every one of the 32 routes), the list
              is just the two sourced termini, so it reads as "Route" with
              a note about the *course between them*, not about invented
              waypoints. */}
          {selected.kind === 'route' && routeStops && routeStops.stops.length > 0 && (
            <div className="atlas-panel__section">
              <h4>{routeStops.hasNamedIntermediate ? 'Places along the way' : 'Route'}</h4>
              <ol className="atlas-panel__stops">
                {routeStops.stops.map((s, i) => (
                  <li key={`${s.kind}:${s.id}`}>
                    <button
                      type="button"
                      className="atlas-panel__stop-btn"
                      onClick={() => onSelectEntity?.(s.kind, s.id)}
                    >
                      {s.name}
                    </button>
                    {i < routeStops.stops.length - 1 && <span aria-hidden="true"> → </span>}
                  </li>
                ))}
              </ol>
              {routeStops.hasBend && (
                <p className="atlas-panel__note">
                  {routeStops.hasNamedIntermediate
                    ? 'The drawn course is approximate. These are places the line passes near.'
                    : 'The drawn course between them is approximate.'}
                </p>
              )}
            </div>
          )}

          {activeIn.length > 0 && (
            <div className="atlas-panel__section">
              <h4>Active in</h4>
              <ul className="chip-list">
                {activeIn.map((p) => (
                  <li className="chip chip--neutral" key={p.id}>
                    {p.label}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {selected.kind === 'port' && selected.entity.also_known_as && selected.entity.also_known_as.length > 0 && (
            <p className="atlas-panel__aka">Also known as: {selected.entity.also_known_as.join('; ')}</p>
          )}

          {cargo.length > 0 && (
            <div className="atlas-panel__section">
              <h4>{selected.kind === 'route' ? 'Cargo' : 'What was traded here'}</h4>
              <ul className="chip-list">
                {cargo.map((g) => (
                  <li className="chip" key={g.id}>
                    {iconUrl(g.icon) ? <img src={iconUrl(g.icon)} alt="" width={20} height={20} /> : null}
                    {g.name}
                  </li>
                ))}
              </ul>
              {selected.kind === 'route' && (
                <p className="atlas-panel__action">
                  <button type="button" className="atlas-btn" onClick={() => setCargoOpen(true)}>
                    What&rsquo;s in the ship?
                  </button>
                </p>
              )}
            </div>
          )}

          {(selected.entity.caveats || (selected.kind === 'site' && selected.entity.finds.length > 0)) && (
            <details className="panel-notes atlas-panel__section">
              <summary>
                Scholar notes
                {selected.kind === 'site' && selected.entity.finds.length > 0
                  ? ` (${selected.entity.finds.length} finds)`
                  : ''}
              </summary>
              {selected.entity.caveats && <p>{selected.entity.caveats}</p>}
              {selected.kind === 'site' && selected.entity.finds.length > 0 && (
                <ul className="finds-list">
                  {selected.entity.finds.map((f) => (
                    <li key={f.name}>
                      <strong>{f.name}</strong> — {f.significance}
                      <Sources refs={f.source_refs} sources={sources} />
                    </li>
                  ))}
                </ul>
              )}
            </details>
          )}

          <a className="atlas-panel__more" href={`${SECTION_PATH[selected.kind]}/${selected.entity.id}`}>
            Learn more about {selected.entity.name}
          </a>

          <dialog
            className="cargo-sheet"
            ref={dialogRef}
            aria-labelledby={cargoTitleId}
            onClose={() => setCargoOpen(false)}
          >
            <div className="cargo-sheet__sticky">
              <div className="sheet__head">
                <h3 className="sheet__title" id={cargoTitleId}>
                  What&rsquo;s in the ship?
                </h3>
                <button
                  type="button"
                  className="atlas-panel__close"
                  ref={cargoCloseRef}
                  onClick={() => setCargoOpen(false)}
                >
                  <span aria-hidden="true">×</span>
                  <span className="visually-hidden">Close the cargo list</span>
                </button>
              </div>
              <p className="cargo-sheet__sub">Goods carried on {selected.entity.name}.</p>
              <p className="cargo-sheet__legend">
                {(Object.keys(DIRECTION) as Good['direction'][]).map((d) => (
                  <span key={d}>
                    <span aria-hidden="true">{DIRECTION[d].glyph}</span> {DIRECTION[d].label}
                  </span>
                ))}
              </p>
            </div>
            <ul className="cargo-grid">
              {cargo.map((g) => {
                const url = iconUrl(g.icon);
                const dir = DIRECTION[g.direction];
                return (
                  <li
                    className="cargo-cell"
                    key={g.id}
                    aria-label={`${g.name}, ${dir.short}, ${g.evidence_level}, ${g.evidence_type}. ${g.kid_line}`}
                  >
                    <span className="cargo-cell__icon" aria-hidden="true">
                      {url ? <img src={url} alt="" width={48} height={48} /> : <CrateGlyph />}
                    </span>
                    <span className="cargo-cell__dir" aria-hidden="true">
                      {dir.glyph}
                    </span>
                    <h4 className="cargo-cell__name">{g.name}</h4>
                    <p className="cargo-cell__kid">{g.kid_line}</p>
                    <p className="cargo-cell__badges">
                      <Badge level={g.evidence_level} type={g.evidence_type} compact />
                    </p>
                    <Sources refs={g.source_refs} sources={sources} />
                  </li>
                );
              })}
            </ul>
          </dialog>
        </>
      )}
    </aside>
  );
}
