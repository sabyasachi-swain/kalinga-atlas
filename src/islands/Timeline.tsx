/**
 * Timeline island — period selector backed by a native range input so keyboard
 * and screen-reader semantics come for free (arrow keys, Home/End, aria-valuetext).
 *
 * STUB with a working native control. The engineer agent adds the D3 axis,
 * period bands and the manuscript page-turn transition in Phase 3.
 */
import { useId } from 'react';
import type { Period } from '@data/schema';

export interface TimelineProps {
  periods: Period[];
  activePeriod: string;
  onChange?: (periodId: string) => void;
}

function formatYear(y: number): string {
  return y < 0 ? `${Math.abs(y)} BCE` : `${y} CE`;
}

export function Timeline({ periods, activePeriod, onChange }: TimelineProps) {
  const id = useId();
  const ordered = [...periods].sort((a, b) => a.order - b.order);
  const index = Math.max(0, ordered.findIndex((p) => p.id === activePeriod));
  const current = ordered[index];

  return (
    <div style={{ padding: 'var(--space-4) 0' }}>
      <label htmlFor={id} style={{ display: 'block', fontFamily: 'var(--font-heading)', fontSize: 'var(--text-lg)' }}>
        Explore the timeline
      </label>
      <input
        id={id}
        type="range"
        min={0}
        max={Math.max(0, ordered.length - 1)}
        step={1}
        value={index}
        aria-valuetext={current ? `${current.label}, ${formatYear(current.start_year)} to ${formatYear(current.end_year)}` : ''}
        onChange={(e) => {
          const next = ordered[Number(e.currentTarget.value)];
          if (next) onChange?.(next.id);
        }}
        style={{ width: '100%', accentColor: 'var(--highlight)' }}
      />
      <p aria-live="polite" style={{ margin: 'var(--space-2) 0 0' }}>
        {current ? (
          <>
            <strong>{current.label}</strong> · {formatYear(current.start_year)} – {formatYear(current.end_year)}
          </>
        ) : (
          'No periods loaded'
        )}
      </p>
    </div>
  );
}
