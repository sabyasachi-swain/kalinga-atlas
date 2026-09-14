/**
 * The human promotion step, made explicit and logged.
 *
 *   npm run status -- published ports goods        promote every entry in those files
 *   npm run status -- reviewed ports:palur          promote one entry
 *   npm run status -- draft goods:diamonds          demote one entry
 *
 * Rules enforced here (the validator enforces them again at build):
 *   - UNVERIFIED entries are never promoted.
 *   - Promotion to `published` requires every cited source to be approved_by_human.
 * Every change is appended to docs/research/status-log.md.
 */
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STATUSES, type Status } from '../src/data/schema';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, '..');
const DATA = resolve(ROOT, 'src/data');
const LOG = resolve(ROOT, 'docs/research/status-log.md');
const FILES = ['periods', 'ports', 'routes', 'goods', 'sites', 'inscriptions', 'facts'] as const;

const [target, ...selectors] = process.argv.slice(2);
if (!target || !(STATUSES as readonly string[]).includes(target) || selectors.length === 0) {
  console.error('usage: npm run status -- <draft|reviewed|published> <file|file:id> ...');
  process.exit(2);
}
const status = target as Status;

const sources: { id: string; approved_by_human?: boolean }[] = JSON.parse(readFileSync(resolve(DATA, 'sources.json'), 'utf8'));
const approved = new Set(sources.filter((s) => s.approved_by_human).map((s) => s.id));

const changes: string[] = [];
const refused: string[] = [];

for (const sel of selectors) {
  const [file, id] = sel.split(':');
  if (!file || !(FILES as readonly string[]).includes(file)) {
    console.error(`unknown file "${file}"; expected one of ${FILES.join(', ')}`);
    process.exit(2);
  }
  const path = resolve(DATA, `${file}.json`);
  const list: Record<string, unknown>[] = JSON.parse(readFileSync(path, 'utf8'));
  for (const e of list) {
    if (id && e.id !== id) continue;
    if (e.status === status) continue;
    if (status !== 'draft') {
      if (e.evidence_level === 'UNVERIFIED') {
        refused.push(`${file}:${e.id} is UNVERIFIED`);
        continue;
      }
      if (status === 'published') {
        const refs = (e.source_refs as { source_id: string }[] | undefined) ?? [];
        const bad = refs.filter((r) => !approved.has(r.source_id)).map((r) => r.source_id);
        if (bad.length > 0) {
          refused.push(`${file}:${e.id} cites unapproved source(s): ${bad.join(', ')}`);
          continue;
        }
      }
    }
    changes.push(`${file}:${e.id} ${e.status} -> ${status}`);
    e.status = status;
  }
  writeFileSync(path, `${JSON.stringify(list, null, 2)}\n`);
}

const stamp = new Date().toISOString().slice(0, 10);
if (changes.length > 0) {
  appendFileSync(LOG, `\n## ${stamp}: set ${status} (${selectors.join(' ')})\n\n${changes.map((c) => `- ${c}`).join('\n')}\n`);
}
console.log(`${changes.length} entries set to ${status}`);
for (const c of changes) console.log(`  ${c}`);
if (refused.length > 0) {
  console.log(`${refused.length} refused:`);
  for (const r of refused) console.log(`  ${r}`);
}
