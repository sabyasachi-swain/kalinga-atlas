/**
 * Build-time validator for src/data/*.json.
 *
 * Enforces the Hallucination Prevention Protocol (master prompt §4):
 *   schema  – every file parses against src/data/schema.ts
 *   H1      – source_refs non-empty (except UNVERIFIED drafts)
 *   H2      – Confirmed / Strongly Supported cite >= 2 distinct sources
 *   H3      – ids unique across all data files
 *   H4      – every period id exists in periods.json
 *   H5      – UNVERIFIED never leaves draft
 *   H6      – every source_id resolves to sources.json
 *   H8      – published entries cite only human-approved sources
 *   refs    – route.from/to, goods, related_ids, coordinate_source resolve
 *
 * Severity: schema failures are always errors. Semantic failures are errors for
 * `reviewed` and `published` entries and warnings for `draft` entries, so
 * research-in-progress never blocks a build but can never ship either.
 *
 * Exit code 1 when any error exists. Runs automatically as `prebuild`.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ZodTypeAny } from 'zod';
import { Collections, MIN_SOURCES, type CollectionName, type Status } from '../src/data/schema';

const here = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(here, '../src/data');

type Severity = 'error' | 'warning';
interface Finding {
  rule: string;
  severity: Severity;
  file: string;
  id: string;
  message: string;
}

const findings: Finding[] = [];
const counts: Record<string, Record<Status, number>> = {};

function report(rule: string, severity: Severity, file: string, id: string, message: string): void {
  findings.push({ rule, severity, file, id, message });
}

/** Semantic rule failures block the build only once an entry is past draft. */
function severityFor(status: Status): Severity {
  return status === 'draft' ? 'warning' : 'error';
}

function load<T>(name: CollectionName, schema: ZodTypeAny & { element: ZodTypeAny }): T[] {
  const file = `${name}.json`;
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(resolve(DATA_DIR, file), 'utf8'));
  } catch (err) {
    report('json', 'error', file, '-', `cannot read or parse: ${(err as Error).message}`);
    return [];
  }
  if (!Array.isArray(raw)) {
    report('json', 'error', file, '-', 'top-level value must be an array');
    return [];
  }
  const valid: T[] = [];
  raw.forEach((entry: unknown, i: number) => {
    const parsed = schema.element.safeParse(entry);
    const maybeId = (entry as { id?: unknown } | null)?.id;
    const id = typeof maybeId === 'string' ? maybeId : `#${i}`;
    if (parsed.success) {
      valid.push(parsed.data as T);
    } else {
      for (const issue of parsed.error.issues) {
        report('schema', 'error', file, id, `${issue.path.join('.') || '(root)'}: ${issue.message}`);
      }
    }
  });
  return valid;
}

// ---------------------------------------------------------------------------
// Load everything
// ---------------------------------------------------------------------------

interface AnyEntity {
  id: string;
  status: Status;
  evidence_level?: keyof typeof MIN_SOURCES;
  source_refs?: { source_id: string }[];
  periods?: string[];
  coordinate_source?: string;
  goods?: string[];
  from?: string;
  to?: string;
  related_ids?: string[];
  edition_ref?: { source_id: string };
  finds?: { name: string; source_refs: { source_id: string }[] }[];
}

const sources = load<{ id: string; approved_by_human: boolean }>('sources', Collections.sources);
const periods = load<AnyEntity>('periods', Collections.periods);
const entityFiles: CollectionName[] = ['ports', 'routes', 'goods', 'sites', 'inscriptions', 'facts'];
const entities: Record<string, AnyEntity[]> = {};
for (const name of entityFiles) entities[name] = load<AnyEntity>(name, Collections[name]);

const sourceIds = new Set(sources.map((s) => s.id));
const periodIds = new Set(periods.map((p) => p.id));
const allIds = new Map<string, string>(); // id -> file
const placeIds = new Set<string>();
const goodIds = new Set((entities.goods ?? []).map((g) => g.id));

// ---------------------------------------------------------------------------
// H3: unique ids across every file (sources and periods included)
// ---------------------------------------------------------------------------

function registerId(id: string, file: string): void {
  const prev = allIds.get(id);
  if (prev) report('H3-unique-id', 'error', file, id, `duplicate id, first seen in ${prev}`);
  else allIds.set(id, file);
}
sources.forEach((s) => registerId(s.id, 'sources.json'));
periods.forEach((p) => registerId(p.id, 'periods.json'));
for (const name of entityFiles) {
  for (const e of entities[name] ?? []) {
    registerId(e.id, `${name}.json`);
    if (name === 'ports' || name === 'sites') placeIds.add(e.id);
  }
}

// ---------------------------------------------------------------------------
// Per-entry semantic rules
// ---------------------------------------------------------------------------

function checkSourceRefs(file: string, e: AnyEntity, refs: { source_id: string }[] | undefined, label: string): void {
  const sev = severityFor(e.status);
  for (const ref of refs ?? []) {
    if (!sourceIds.has(ref.source_id)) {
      report('H6-source-resolves', sev, file, e.id, `${label}: source_id "${ref.source_id}" is not in sources.json`);
    }
  }
}

function checkEntry(file: string, e: AnyEntity): void {
  const sev = severityFor(e.status);
  counts[file] ??= { draft: 0, reviewed: 0, published: 0 };
  counts[file]![e.status]++;

  checkSourceRefs(file, e, e.source_refs, 'source_refs');
  if (e.edition_ref) checkSourceRefs(file, e, [e.edition_ref], 'edition_ref');
  for (const find of e.finds ?? []) checkSourceRefs(file, e, find.source_refs, `finds[${find.name}]`);

  // H2: distinct sources per evidence level
  if (e.evidence_level) {
    const distinct = new Set((e.source_refs ?? []).map((r) => r.source_id)).size;
    const min = MIN_SOURCES[e.evidence_level];
    if (distinct < min) {
      report(
        'H2-no-tier-upgrade',
        sev,
        file,
        e.id,
        `evidence_level "${e.evidence_level}" needs >= ${min} distinct sources, found ${distinct}. Downgrade the tier or add a source.`,
      );
    }
  }

  // H4: periods resolve
  for (const p of e.periods ?? []) {
    if (!periodIds.has(p)) report('H4-period-resolves', sev, file, e.id, `period "${p}" is not in periods.json`);
  }

  // coordinate_source must be a source
  if (e.coordinate_source && !sourceIds.has(e.coordinate_source)) {
    report('ref-coordinate-source', sev, file, e.id, `coordinate_source "${e.coordinate_source}" is not in sources.json`);
  }

  // goods resolve
  for (const g of e.goods ?? []) {
    if (!goodIds.has(g)) report('ref-good', sev, file, e.id, `good "${g}" is not in goods.json`);
  }

  // route endpoints resolve to a port or site
  for (const key of ['from', 'to'] as const) {
    const v = e[key];
    if (v && !placeIds.has(v)) report('ref-route-endpoint', sev, file, e.id, `${key} "${v}" is not a port or site id`);
  }

  // fact.related_ids resolve to anything
  for (const r of e.related_ids ?? []) {
    if (!allIds.has(r)) report('ref-related', sev, file, e.id, `related_id "${r}" does not exist in any data file`);
  }

  // H8: published entries may only cite human-approved sources
  if (e.status === 'published') {
    for (const ref of e.source_refs ?? []) {
      const src = sources.find((s) => s.id === ref.source_id);
      if (src && !src.approved_by_human) {
        report('H8-source-approved', 'error', file, e.id, `source "${ref.source_id}" has not been approved by a human`);
      }
    }
  }
}

periods.forEach((p) => checkEntry('periods.json', p));
for (const name of entityFiles) for (const e of entities[name] ?? []) checkEntry(`${name}.json`, e);

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const errors = findings.filter((f) => f.severity === 'error');
const warnings = findings.filter((f) => f.severity === 'warning');

function printGroup(list: Finding[], heading: string): void {
  if (list.length === 0) return;
  console.log(`\n${heading}`);
  const byRule = new Map<string, Finding[]>();
  for (const f of list) byRule.set(f.rule, [...(byRule.get(f.rule) ?? []), f]);
  for (const [rule, items] of byRule) {
    console.log(`  [${rule}] (${items.length})`);
    for (const f of items) console.log(`    ${f.file} > ${f.id}: ${f.message}`);
  }
}

console.log('Kalinga Atlas data validation');
console.log('  sources: %d  periods: %d', sources.length, periods.length);
for (const name of entityFiles) {
  const c = counts[`${name}.json`] ?? { draft: 0, reviewed: 0, published: 0 };
  console.log(
    '  %s %d (draft %d, reviewed %d, published %d)',
    `${name}:`.padEnd(14),
    entities[name]?.length ?? 0,
    c.draft,
    c.reviewed,
    c.published,
  );
}

printGroup(errors, `ERRORS (${errors.length}) - build blocked`);
printGroup(warnings, `WARNINGS (${warnings.length}) - drafts that cannot be published yet`);

if (errors.length > 0) {
  console.error(`\nFAIL: ${errors.length} error(s). Fix them or move the entry back to draft.`);
  process.exit(1);
}
console.log(`\nOK: data valid${warnings.length ? ` (${warnings.length} draft warning(s))` : ''}`);
