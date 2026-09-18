/**
 * Shared ordering for the listing pages (routes/ports/goods index) and the
 * home page's section previews — owner item 4: "confidence wise or timeline
 * wise or type wise", not raw JSON file order.
 *
 * Default is chronological (earliest period first), tie-broken alphabetically
 * — "the one a visitor can reason about on a history site". Evidence order is
 * Confirmed -> Strongly Supported -> Probable -> Hypothetical, also
 * tie-broken alphabetically. A-Z needs no helper beyond `sortAlpha`.
 */
import type { Claim, EvidenceLevel, Period } from '@data/schema';

export type SortKey = 'time' | 'evidence' | 'az';

export const SORT_LABEL: Record<SortKey, string> = {
  time: 'Time (earliest first)',
  evidence: 'Evidence (strongest first)',
  az: 'A–Z',
};

const EVIDENCE_RANK: Record<EvidenceLevel, number> = {
  Confirmed: 0,
  'Strongly Supported': 1,
  Probable: 2,
  Hypothetical: 3,
  UNVERIFIED: 4,
};

/** The entity's earliest period, by `periods.json`'s own `order`. Null if
 * none of its `periods` ids resolve (shouldn't happen for published data,
 * but `noUncheckedIndexedAccess` means we still have to say what then). */
export function earliestPeriod(entity: Pick<Claim, 'periods'>, periodsById: Map<string, Period>): Period | null {
  let best: Period | null = null;
  for (const pid of entity.periods) {
    const p = periodsById.get(pid);
    if (!p) continue;
    if (!best || p.order < best.order) best = p;
  }
  return best;
}

function byName<T extends { name: string }>(a: T, b: T): number {
  return a.name.localeCompare(b.name);
}

export function sortChronological<T extends Pick<Claim, 'periods'> & { name: string }>(
  items: T[],
  periods: Period[],
): T[] {
  const byId = new Map(periods.map((p) => [p.id, p]));
  return [...items].sort((a, b) => {
    const oa = earliestPeriod(a, byId)?.order ?? Number.POSITIVE_INFINITY;
    const ob = earliestPeriod(b, byId)?.order ?? Number.POSITIVE_INFINITY;
    return oa !== ob ? oa - ob : byName(a, b);
  });
}

export function evidenceRank(level: EvidenceLevel): number {
  return EVIDENCE_RANK[level] ?? 99;
}

export function sortByEvidence<T extends Pick<Claim, 'evidence_level'> & { name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const ra = EVIDENCE_RANK[a.evidence_level] ?? 99;
    const rb = EVIDENCE_RANK[b.evidence_level] ?? 99;
    return ra !== rb ? ra - rb : byName(a, b);
  });
}

export function sortAlpha<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort(byName);
}

export function sortBy<T extends Pick<Claim, 'periods' | 'evidence_level'> & { name: string }>(
  items: T[],
  key: SortKey,
  periods: Period[],
): T[] {
  if (key === 'evidence') return sortByEvidence(items);
  if (key === 'az') return sortAlpha(items);
  return sortChronological(items, periods);
}
