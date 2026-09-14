/**
 * Timeline island — period selector. Spec: docs/design/timeline.md
 *
 * The control is a native <input type="range">, so keyboard, touch and
 * screen-reader semantics (arrows, Home/End, aria-valuetext) come for free.
 * A D3-scaled SVG axis is drawn above it: ticks at period boundaries and one
 * band per period, laid out in lanes because periods overlap. The axis is a
 * decorative duplicate of the range input, so it is aria-hidden; clicking a
 * band goes through the same onChange path as an arrow key.
 */
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { scaleLinear } from 'd3-scale';
import type { Period } from '@data/schema';

export interface TimelineProps {
  periods: Period[];
  activePeriod: string;
  onChange?: (periodId: string) => void;
}

const AXIS_PAD = 8;
const BAND_H = 20;
const LANE_GAP = 4;
const TICK_H = 18;
const LANE_MIN_GAP_PX = 3;
/** Minimum horizontal room a year label needs before the next one is dropped. */
const TICK_MIN_GAP_PX = 52;

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
  const [width, setWidth] = useState(720);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const w = entry.contentRect.width;
      setWidth((prev) => (Math.round(prev) === Math.round(w) ? prev : Math.max(w, 200)));
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
      const w = Math.max(s(p.end_year) - x, 2);
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

  return (
    <div className="atlas-timeline" ref={wrapRef}>
      <label className="atlas-timeline__label" htmlFor={id}>
        Explore the timeline
      </label>

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
            const showLabel = b.width > 54;
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
                {showLabel && (
                  <text className="tl-band-label" x={b.x + 5} y={y + BAND_H - 6}>
                    {b.period.label.length * 6.4 > b.width - 10
                      ? `${b.period.label.slice(0, Math.max(Math.floor((b.width - 14) / 6.4), 1))}…`
                      : b.period.label}
                  </text>
                )}
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
