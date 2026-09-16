/**
 * Timeline island — period selector. Spec: docs/design/timeline.md,
 * docs/design/atlas-layout.md §2 (period chips).
 *
 * The control is a native <input type="range">, so keyboard, touch and
 * screen-reader semantics (arrows, Home/End, aria-valuetext) come for free.
 * A D3-scaled SVG axis is drawn above it: an unlabelled proportional ruler
 * with tick marks — period *names* live in a separate, ordinary HTML chip
 * row above the ruler (atlas-layout.md §2), because trying to fit prose
 * inside a fixed-width SVG <rect> was what produced the "blank chip" bug
 * (a label was dropped entirely below a width threshold, rather than
 * truncated). Chips are real, individually focusable buttons; clicking a
 * band or a chip goes through the same onChange path as an arrow key.
 */
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { scaleLinear } from 'd3-scale';
import type { Period } from '@data/schema';

export interface TimelineProps {
  periods: Period[];
  activePeriod: string;
  onChange?: (periodId: string) => void;
}

const AXIS_PAD = 8;
/** atlas-layout.md §2: bands no longer need room for text, so they can be
 * far shorter — was 20px. */
const BAND_H = 10;
const LANE_GAP = 4;
const TICK_H = 18;
const LANE_MIN_GAP_PX = 3;
/** Minimum horizontal room a year label needs before the next one is dropped. */
const TICK_MIN_GAP_PX = 52;
/** atlas-layout.md §2: invisible click/tap target height for a band, same
 * as --hit-min (44px) for any interactive element — independent of the
 * band's own (now much shorter) visual height. */
const BAND_HIT_H = 44;

export function formatYear(y: number): string {
  return y < 0 ? `${Math.abs(y)} BCE` : `${y} CE`;
}

interface Band {
  period: Period;
  x: number;
  width: number;
  lane: number;
  alt: number;
}

export function Timeline({ periods, activePeriod, onChange }: TimelineProps) {
  const id = useId();
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const chipsRef = useRef<HTMLUListElement | null>(null);
  const [width, setWidth] = useState(720);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReducedMotion(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  // useLayoutEffect (not useEffect): the real width is almost always narrower
  // than the SSR default, and changing it re-packs periods into lanes that
  // can change the SVG's height. Measuring and correcting before the browser
  // paints avoids a visible reflow (a measured CLS source on first load).
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const apply = (w: number) => setWidth((prev) => (Math.round(prev) === Math.round(w) ? prev : Math.max(w, 200)));
    apply(el.getBoundingClientRect().width);
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      apply(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const ordered = useMemo(() => [...periods].sort((a, b) => a.order - b.order), [periods]);
  const foundIndex = ordered.findIndex((p) => p.id === activePeriod);
  const index = foundIndex >= 0 ? foundIndex : 0;
  const current = ordered[index];

  const { bands, lanes, ticks, scale } = useMemo(() => {
    if (ordered.length === 0) {
      return { bands: [] as Band[], lanes: 1, ticks: [] as number[], scale: null };
    }
    const minYear = Math.min(...ordered.map((p) => p.start_year));
    const maxYear = Math.max(...ordered.map((p) => p.end_year));
    const s = scaleLinear()
      .domain([minYear, maxYear === minYear ? minYear + 1 : maxYear])
      .range([AXIS_PAD, Math.max(width - AXIS_PAD, AXIS_PAD + 1)]);

    // Greedy lane packing: overlapping periods stack instead of colliding.
    const laneEnds: number[] = [];
    const laid: Band[] = [];
    const byStart = [...ordered].sort((a, b) => a.start_year - b.start_year);
    byStart.forEach((p, i) => {
      const x = s(p.start_year);
      // atlas-layout.md §2: 12px minimum visual width (was tied to label fit).
      const w = Math.max(s(p.end_year) - x, 12);
      let lane = laneEnds.findIndex((end) => x >= end + LANE_MIN_GAP_PX);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(0);
      }
      laneEnds[lane] = x + w;
      laid.push({ period: p, x, width: w, lane, alt: i % 2 });
    });

    // timeline.md: a tick per period boundary, thinned so labels never collide.
    const boundaries = [...new Set(ordered.flatMap((p) => [p.start_year, p.end_year]))].sort(
      (a, b) => a - b,
    );
    const kept: number[] = [];
    let lastX = Number.NEGATIVE_INFINITY;
    for (const year of boundaries) {
      const px = s(year);
      if (px - lastX >= TICK_MIN_GAP_PX) {
        kept.push(year);
        lastX = px;
      }
    }
    const lastBoundary = boundaries[boundaries.length - 1];
    if (lastBoundary !== undefined && kept[kept.length - 1] !== lastBoundary) {
      if (kept.length > 0) kept[kept.length - 1] = lastBoundary;
      else kept.push(lastBoundary);
    }

    return { bands: laid, lanes: Math.max(laneEnds.length, 1), ticks: kept, scale: s };
  }, [ordered, width]);

  const height = lanes * (BAND_H + LANE_GAP) + TICK_H;
  const axisY = lanes * (BAND_H + LANE_GAP);
  const currentBand = bands.find((b) => b.period.id === activePeriod);

  // atlas-layout.md §2: auto-scroll the current chip into view on settle
  // (mirrors the toast's settle-debounce concept, so a fast drag doesn't
  // thrash the scroll position) — a convenience, not required for
  // correctness, since the callout below always shows the full name too.
  useEffect(() => {
    const list = chipsRef.current;
    if (!list || !current) return;
    const timer = window.setTimeout(() => {
      const btn = list.querySelector<HTMLElement>(`[data-period-id="${CSS.escape(current.id)}"]`);
      btn?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: reducedMotion ? 'auto' : 'smooth' });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [current, reducedMotion]);

  return (
    <div className="atlas-timeline" ref={wrapRef}>
      <label className="atlas-timeline__label" htmlFor={id}>
        Explore the timeline
      </label>

      {/* atlas-layout.md §2: real HTML chips carry the period names — the
          SVG axis below is an unlabelled, decorative proportional ruler. */}
      <ul className="atlas-timeline__chips" role="list" ref={chipsRef}>
        {ordered.map((p) => {
          const isCurrent = p.id === activePeriod;
          const fullLabel = `${p.label} · ${formatYear(p.start_year)} – ${formatYear(p.end_year)}`;
          return (
            <li key={p.id}>
              <button
                type="button"
                className="atlas-timeline__chip"
                data-period-id={p.id}
                aria-pressed={isCurrent}
                title={fullLabel}
                aria-label={fullLabel}
                onClick={() => onChange?.(p.id)}
              >
                {p.label}
              </button>
            </li>
          );
        })}
      </ul>

      {scale !== null && (
        <svg
          className="atlas-timeline__axis"
          viewBox={`0 0 ${Math.max(width, 1)} ${height}`}
          width={Math.max(width, 1)}
          height={height}
          aria-hidden="true"
          focusable="false"
        >
          {bands.map((b) => {
            const isCurrent = b.period.id === activePeriod;
            const y = b.lane * (BAND_H + LANE_GAP);
            return (
              <g
                key={b.period.id}
                className="tl-band"
                data-current={String(isCurrent)}
                data-alt={String(b.alt)}
                onClick={() => onChange?.(b.period.id)}
              >
                <title>{`${b.period.label}: ${formatYear(b.period.start_year)} to ${formatYear(b.period.end_year)}`}</title>
                <rect className="tl-band-rect" x={b.x} y={y} width={b.width} height={BAND_H} />
                {/* Invisible 44px-tall hit target, independent of the
                    band's own short visual height (atlas-layout.md §2). */}
                <rect
                  className="tl-band-hit"
                  x={b.x}
                  y={y + BAND_H / 2 - BAND_HIT_H / 2}
                  width={b.width}
                  height={BAND_HIT_H}
                  fill="transparent"
                />
              </g>
            );
          })}

          {/* Active-band marker slides between bands rather than re-laying out. */}
          {currentBand && (
            <rect
              className="tl-marker"
              x={0}
              y={0}
              width={currentBand.width}
              height={2}
              transform={`translate(${currentBand.x},${currentBand.lane * (BAND_H + LANE_GAP)})`}
            />
          )}

          <line className="tl-axis-line" x1={AXIS_PAD} y1={axisY} x2={Math.max(width - AXIS_PAD, AXIS_PAD)} y2={axisY} />
          {ticks.map((t) => (
            <g key={t}>
              <line className="tl-tick" x1={scale(t)} y1={axisY} x2={scale(t)} y2={axisY + 5} />
              <text className="tl-tick-label" x={scale(t)} y={axisY + 15}>
                {formatYear(t)}
              </text>
            </g>
          ))}
        </svg>
      )}

      <input
        id={id}
        className="atlas-timeline__range"
        type="range"
        min={0}
        max={Math.max(0, ordered.length - 1)}
        step={1}
        value={index}
        aria-valuetext={
          current ? `${current.label}, ${formatYear(current.start_year)} to ${formatYear(current.end_year)}` : ''
        }
        onChange={(e) => {
          const next = ordered[Number(e.currentTarget.value)];
          if (next) onChange?.(next.id);
        }}
      />

      <div className="atlas-timeline__now" aria-live="polite">
        {current ? (
          // Keyed so the cross-fade replays whenever the period changes.
          <div className="atlas-timeline__callout" key={current.id}>
            <strong>{current.label}</strong> · {formatYear(current.start_year)} – {formatYear(current.end_year)}
            <p>{current.summary}</p>
          </div>
        ) : (
          'No periods loaded'
        )}
      </div>
    </div>
  );
}
