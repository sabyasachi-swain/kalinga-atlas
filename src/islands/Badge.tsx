/**
 * Badge — React mirror of `src/components/EvidenceBadge.astro`.
 *
 * The islands cannot import an .astro component, so this duplicates the tier
 * and type tables verbatim: same glyphs, same labels, same help text, same
 * token class names. If EvidenceBadge.astro changes, change this with it.
 * Styles live in `src/styles/atlas.css` under the same `.badge` class names.
 */
import type { EvidenceLevel, EvidenceType } from '@data/schema';

export const TIER: Record<EvidenceLevel, { glyph: string; css: string; help: string }> = {
  Confirmed: {
    glyph: '✓✓',
    css: 'confirmed',
    help: 'Direct archaeological or inscriptional evidence, backed by at least two sources.',
  },
  'Strongly Supported': { glyph: '✓', css: 'strong', help: 'Several independent sources agree.' },
  Probable: { glyph: '~', css: 'probable', help: 'One credible source, or a strong inference from evidence.' },
  Hypothetical: { glyph: '?', css: 'hypothetical', help: 'A scholarly idea or a traditional story. Not proven.' },
  UNVERIFIED: { glyph: '!', css: 'unverified', help: 'Not yet checked. Should never appear on the live site.' },
};

export const TYPE: Record<EvidenceType, { glyph: string; label: string; help: string }> = {
  archaeological: { glyph: '◆', label: 'Archaeology', help: 'Something dug up, found, or carved in stone.' },
  scholarly: { glyph: '■', label: 'Scholars say', help: 'What historians conclude from the evidence.' },
  traditional: {
    glyph: '●',
    label: 'Tradition',
    help: 'A story passed down, not proven by digging or inscriptions.',
  },
};

export interface BadgeProps {
  level: EvidenceLevel;
  type: EvidenceType;
  /** Compact mode hides the long label but keeps it for screen readers. */
  compact?: boolean;
}

export function Badge({ level, type, compact = false }: BadgeProps) {
  const tier = TIER[level];
  const kind = TYPE[type];
  const labelClass = compact ? 'visually-hidden' : undefined;

  return (
    <>
      <span className={`badge tier-${tier.css}`} title={tier.help}>
        <span aria-hidden="true">{tier.glyph}</span>
        <span className={labelClass}>{level}</span>
      </span>
      <span className={`badge type-${type}`} title={kind.help}>
        <span aria-hidden="true">{kind.glyph}</span>
        <span className={labelClass}>{kind.label}</span>
      </span>
    </>
  );
}
