/**
 * Citation formatting shared by Astro components and the Sources page.
 * Short form matches the editorial convention in .claude/rules/content.md:
 *   [Author, Year, p.XX]
 */
import type { Source, SourceRef } from './schema';

function surname(s: Source): string {
  const names = s.author ?? s.editor ?? s.translator;
  const first = names?.[0];
  if (!first) return s.title.split(':')[0] ?? s.title;
  if (first.literal) return first.literal;
  return first.family ?? first.given ?? s.title;
}

function year(s: Source): string {
  const y = s.issued?.['date-parts']?.[0]?.[0];
  if (y !== undefined) return String(y);
  return s.original_date_text ?? 'n.d.';
}

export function formatShort(s: Source, ref?: SourceRef): string {
  const page = ref?.page ? `, ${ref.page}` : '';
  return `[${surname(s)}, ${year(s)}${page}]`;
}

function people(list: Source['author']): string | undefined {
  if (!list || list.length === 0) return undefined;
  return list
    .map((n) => n.literal ?? [n.given, n.family].filter(Boolean).join(' '))
    .join(', ');
}

export function formatFull(s: Source): string {
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
  parts.push(year(s));
  if (s.public_domain) parts.push('public domain');
  return parts.join('. ').replace(/\.\./g, '.');
}
