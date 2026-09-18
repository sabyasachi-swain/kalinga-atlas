/**
 * Citation formatting shared by Astro components and the Sources page.
 * Short form matches the editorial convention in .claude/rules/content.md:
 *   [Author, Year, p.XX]
 *
 * Owner fix, item 7: `year()` used to return only the year, so two distinct
 * registered sources sharing a surname and year rendered an identical short
 * citation — confirmed for `patnaik-2014-odisha-review` /
 * `patnaik-2014-radhanagar` (both "[Patnaik, 2014, …]") and
 * `kingwell-banham-2018-ancient-asia` / `kingwell-banham-2018-antiquity-mantai`
 * (both "[Kingwell-Banham, 2018, …]"). `formatShort`/`formatFull` now take
 * the *whole* source list so they can disambiguate: when two or more sources
 * share a surname and a plain numeric year, each gets a stable "a"/"b"/...
 * suffix, ordered by `id` (never by array order, which can vary) so the
 * letters never shuffle between builds. `original_date_text`/"n.d." years
 * are left alone — there is no useful id-independent way to disambiguate two
 * sources that already disagree on what their own year even is.
 */
import type { Source, SourceRef } from './schema';

function surname(s: Source): string {
  const names = s.author ?? s.editor ?? s.translator;
  const first = names?.[0];
  if (!first) return s.title.split(':')[0] ?? s.title;
  if (first.literal) return first.literal;
  return first.family ?? first.given ?? s.title;
}

function rawYear(s: Source): string {
  const y = s.issued?.['date-parts']?.[0]?.[0];
  if (y !== undefined) return String(y);
  return s.original_date_text ?? 'n.d.';
}

/**
 * `surname|year` -> source id -> "a"/"b"/... Only built for groups of two or
 * more sources sharing both; ids within a group are sorted before assigning
 * letters, so the mapping is stable regardless of `sources`' own order.
 */
function buildYearSuffixes(sources: Source[]): Map<string, string> {
  const groups = new Map<string, string[]>();
  for (const s of sources) {
    const y = rawYear(s);
    if (!/^\d+$/.test(y)) continue; // only plain numeric years are disambiguated
    const key = `${surname(s)}|${y}`;
    const ids = groups.get(key);
    if (ids) ids.push(s.id);
    else groups.set(key, [s.id]);
  }
  const suffixById = new Map<string, string>();
  for (const ids of groups.values()) {
    if (ids.length < 2) continue;
    const sorted = [...ids].sort();
    sorted.forEach((id, i) => suffixById.set(id, String.fromCharCode(97 + i)));
  }
  return suffixById;
}

/** The year as shown to a reader: plain, or with its disambiguating suffix
 * ("2014a") when `sources` contains another entry with the same surname and
 * year. Pass the full registry, not just `s` — this is what every call site
 * has to do differently now (see the module doc comment). */
export function displayYear(s: Source, sources: Source[]): string {
  const suffix = buildYearSuffixes(sources).get(s.id);
  return suffix ? `${rawYear(s)}${suffix}` : rawYear(s);
}

export function formatShort(s: Source, sources: Source[], ref?: SourceRef): string {
  const page = ref?.page ? `, ${ref.page}` : '';
  return `[${surname(s)}, ${displayYear(s, sources)}${page}]`;
}

function people(list: Source['author']): string | undefined {
  if (!list || list.length === 0) return undefined;
  return list
    .map((n) => n.literal ?? [n.given, n.family].filter(Boolean).join(' '))
    .join(', ');
}

export function formatFull(s: Source, sources: Source[]): string {
  const parts: string[] = [];
  const authors = people(s.author);
  if (authors) parts.push(authors);
  parts.push(`*${s.title}*`);
  const translators = people(s.translator);
  if (translators) parts.push(`trans. ${translators}`);
  const editors = people(s.editor);
  if (editors) parts.push(`ed. ${editors}`);
  if (s['container-title']) parts.push(`in ${s['container-title']}${s.volume ? ` ${s.volume}` : ''}`);
  if (s.publisher) parts.push(`${s['publisher-place'] ? `${s['publisher-place']}: ` : ''}${s.publisher}`);
  parts.push(displayYear(s, sources));
  if (s.public_domain) parts.push('public domain');
  return parts.join('. ').replace(/\.\./g, '.');
}
