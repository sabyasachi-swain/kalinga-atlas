/**
 * Merge docs/research/new-sources-*.json (written by parallel researcher runs)
 * into src/data/sources.json, de-duplicating by id. Existing entries win.
 *
 *   npm run merge:sources            merge only
 *   npm run merge:sources -- --approve "reason"   also set approved_by_human=true on merged
 *                                    entries and prefix their note with the reason
 */
import { readFileSync, writeFileSync, readdirSync, renameSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Source } from '../src/data/schema';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, '..');
const SOURCES = resolve(ROOT, 'src/data/sources.json');
const RESEARCH = resolve(ROOT, 'docs/research');
const MERGED_DIR = join(RESEARCH, 'merged');

const args = process.argv.slice(2);
const approveIdx = args.indexOf('--approve');
const approveReason = approveIdx >= 0 ? (args[approveIdx + 1] ?? 'approved under delegation') : null;

const existing: Source[] = JSON.parse(readFileSync(SOURCES, 'utf8'));
const byId = new Map(existing.map((s) => [s.id, s]));

const files = readdirSync(RESEARCH).filter((f) => /^new-sources-.*\.json$/.test(f));
if (files.length === 0) {
  console.log('merge-sources: nothing to merge');
  process.exit(0);
}

let added = 0;
let skipped = 0;
let invalid = 0;
for (const file of files) {
  const raw = JSON.parse(readFileSync(join(RESEARCH, file), 'utf8'));
  const list = Array.isArray(raw) ? raw : [];
  for (const entry of list) {
    const parsed = Source.safeParse(entry);
    if (!parsed.success) {
      invalid++;
      console.error(`  invalid in ${file}: ${entry?.id ?? '?'}: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
      continue;
    }
    const s = parsed.data;
    if (byId.has(s.id)) {
      skipped++;
      continue;
    }
    if (approveReason && !s.approved_by_human) {
      s.approved_by_human = true;
      s.note = `${approveReason}. ${s.note ?? ''}`.trim();
    }
    byId.set(s.id, s);
    added++;
  }
  if (!existsSync(MERGED_DIR)) mkdirSync(MERGED_DIR, { recursive: true });
  renameSync(join(RESEARCH, file), join(MERGED_DIR, file));
}

const out = [...byId.values()];
writeFileSync(SOURCES, `${JSON.stringify(out, null, 2)}\n`);
console.log(`merge-sources: added ${added}, skipped ${skipped} duplicates, ${invalid} invalid; sources.json now has ${out.length} entries`);
if (invalid > 0) process.exit(1);
