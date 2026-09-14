/**
 * Flesch-Kincaid grade check for public copy in src/content/.
 *
 * Target (master prompt §15): grade <= 7 so a 10-year-old can follow.
 * Files with `scholar: true` in their frontmatter are exempt (Scholar mode).
 * Override the ceiling with READABILITY_MAX=8 for a one-off check.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import rs from 'text-readability';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, '..');
const CONTENT_DIR = resolve(ROOT, 'src/content');
const MAX_GRADE = Number(process.env.READABILITY_MAX ?? 7);

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  let out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out = out.concat(walk(p));
    else if (p.endsWith('.md') || p.endsWith('.mdx')) out.push(p);
  }
  return out;
}

/** Strip frontmatter, code, citations and markdown syntax so only prose is scored. */
function toProse(md: string): { prose: string; scholar: boolean } {
  let scholar = false;
  let body = md;
  const fm = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (fm) {
    scholar = /^scholar:\s*true\s*$/m.test(fm[1] ?? '');
    body = md.slice(fm[0].length);
  }
  const prose = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\[[^\]]*?,\s*\d{4}[^\]]*\]/g, ' ') // inline citations [Author, Year, p.XX]
    .replace(/\[NEEDS VERIFICATION\]/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#+\s+/gm, '')
    .replace(/[*_`>|#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return { prose, scholar };
}

const files = walk(CONTENT_DIR).filter((f) => !f.endsWith('README.md'));
if (files.length === 0) {
  console.log('readability: no content files yet in src/content/ (nothing to check)');
  process.exit(0);
}

let failed = 0;
console.log(`readability: Flesch-Kincaid grade ceiling ${MAX_GRADE}\n`);
for (const file of files) {
  const { prose, scholar } = toProse(readFileSync(file, 'utf8'));
  const rel = relative(ROOT, file);
  if (prose.split(' ').length < 30) {
    console.log(`  -  ${rel}: too short to score`);
    continue;
  }
  const grade = rs.fleschKincaidGrade(prose);
  const ease = rs.fleschReadingEase(prose);
  if (scholar) {
    console.log(`  ~  ${rel}: grade ${grade.toFixed(1)} (scholar mode, exempt)`);
  } else if (grade > MAX_GRADE) {
    failed++;
    console.log(`  X  ${rel}: grade ${grade.toFixed(1)}, ease ${ease.toFixed(0)} - too hard; shorten sentences and simplify words`);
  } else {
    console.log(`  OK ${rel}: grade ${grade.toFixed(1)}, ease ${ease.toFixed(0)}`);
  }
}

if (failed > 0) {
  console.error(`\nFAIL: ${failed} file(s) above grade ${MAX_GRADE}`);
  process.exit(1);
}
console.log('\nOK: all public copy within reading level');
