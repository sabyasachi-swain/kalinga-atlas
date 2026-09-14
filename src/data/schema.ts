/**
 * Canonical data schema for Kalinga: Ancient Trade Routes.
 *
 * Every historical entity extends `Claim`. The rules below mirror the
 * Hallucination Prevention Protocol in kalinga-website-master-prompt.md §4:
 *
 *  H1  source_refs is never empty.
 *  H2  Confirmed / Strongly Supported need >= 2 distinct sources (checked in validate-data.ts).
 *  H3  ids are unique across every data file (checked in validate-data.ts).
 *  H4  periods must resolve to periods.json (checked in validate-data.ts).
 *  H5  UNVERIFIED entries can never be `published` (refined below).
 *  H7  only `published` entries render.
 */
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const EVIDENCE_LEVELS = [
  'Confirmed',
  'Strongly Supported',
  'Probable',
  'Hypothetical',
  'UNVERIFIED',
] as const;
export const EvidenceLevel = z.enum(EVIDENCE_LEVELS);
export type EvidenceLevel = z.infer<typeof EvidenceLevel>;

export const EVIDENCE_TYPES = ['archaeological', 'scholarly', 'traditional'] as const;
export const EvidenceType = z.enum(EVIDENCE_TYPES);
export type EvidenceType = z.infer<typeof EvidenceType>;

export const STATUSES = ['draft', 'reviewed', 'published'] as const;
export const Status = z.enum(STATUSES);
export type Status = z.infer<typeof Status>;

export const ROUTE_MODES = ['maritime', 'coastal', 'river', 'land'] as const;
export const RouteMode = z.enum(ROUTE_MODES);

export const GOOD_DIRECTIONS = ['export', 'import', 'both'] as const;

// ---------------------------------------------------------------------------
// Shared building blocks
// ---------------------------------------------------------------------------

/** kebab-case, stable, unique across all data files. */
export const Id = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'id must be kebab-case (a-z, 0-9, hyphens)');

export const Coordinates = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type Coordinates = z.infer<typeof Coordinates>;

/** A pointer into sources.json. `page` is a page, folio, plate or section reference. */
export const SourceRef = z.object({
  source_id: Id,
  page: z.string().min(1).optional(),
  note: z.string().max(300).optional(),
});
export type SourceRef = z.infer<typeof SourceRef>;

/**
 * Fields shared by every historical entity.
 * `summary` is the kid-facing line (target Flesch-Kincaid grade <= 7).
 */
const ClaimBase = z.object({
  id: Id,
  name: z.string().min(1),
  summary: z.string().min(1).max(400),
  evidence_level: EvidenceLevel,
  evidence_type: EvidenceType,
  /** May be empty ONLY for an UNVERIFIED draft (a research to-do). See claimRules(). */
  source_refs: z.array(SourceRef),
  periods: z.array(Id).min(1, 'H4: every entry must belong to at least one period'),
  status: Status,
  /** Free-text caveats shown in Scholar mode, e.g. "identification of Palura with Palur is debated". */
  caveats: z.string().max(600).optional(),
});

/**
 * Claim-level rules that must survive `.extend()`. Applied via superRefine on
 * every entity schema below.
 */
function claimRules(c: z.infer<typeof ClaimBase>, ctx: z.RefinementCtx): void {
  const isUnverifiedDraft = c.evidence_level === 'UNVERIFIED' && c.status === 'draft';
  if (c.source_refs.length === 0 && !isUnverifiedDraft) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'H1: every entry needs at least one source_ref (only UNVERIFIED drafts may be empty)',
      path: ['source_refs'],
    });
  }
  if (c.evidence_level === 'UNVERIFIED' && c.status !== 'draft') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'H5: an UNVERIFIED entry must stay in draft; it can never be reviewed or published',
      path: ['status'],
    });
  }
}

export const Claim = ClaimBase.superRefine(claimRules);
export type Claim = z.infer<typeof ClaimBase>;

// ---------------------------------------------------------------------------
// Sources (CSL-JSON subset) and periods do not extend Claim.
// ---------------------------------------------------------------------------

const CslName = z.object({
  family: z.string().optional(),
  given: z.string().optional(),
  literal: z.string().optional(),
});

const CslDate = z.object({
  'date-parts': z.array(z.array(z.number())).min(1),
});

/**
 * Bibliographic entry, a practical subset of CSL-JSON so the bibliography page
 * and BibTeX export can be generated with standard tooling.
 */
export const Source = z.object({
  id: Id,
  type: z.enum([
    'book',
    'chapter',
    'article-journal',
    'report',
    'manuscript',
    'map',
    'entry-encyclopedia',
    'document',
    'classic',
  ]),
  title: z.string().min(1),
  author: z.array(CslName).optional(),
  editor: z.array(CslName).optional(),
  translator: z.array(CslName).optional(),
  'container-title': z.string().optional(),
  publisher: z.string().optional(),
  'publisher-place': z.string().optional(),
  issued: CslDate.optional(),
  /** Original composition date for classical texts, e.g. "1st century CE". */
  original_date_text: z.string().optional(),
  volume: z.string().optional(),
  page: z.string().optional(),
  URL: z.string().url().optional(),
  DOI: z.string().optional(),
  ISBN: z.string().optional(),
  /** Which registry category this source belongs to (master prompt §8). */
  registry_category: z.enum(['primary', 'secondary', 'site-report', 'early-modern', 'geospatial']),
  /** true when the work itself is public domain and may be quoted or reproduced freely. */
  public_domain: z.boolean().default(false),
  /** Set when a source was added outside the original registry and has been approved by a human. */
  approved_by_human: z.boolean().default(false),
  /** Provenance note: why the source is credible, what was actually read. */
  note: z.string().max(1200).optional(),
});
export type Source = z.infer<typeof Source>;

export const Period = z.object({
  id: Id,
  label: z.string().min(1),
  /** Negative for BCE, positive for CE: 300 BCE = -300, 1900 CE = 1900. */
  start_year: z.number().int(),
  end_year: z.number().int(),
  summary: z.string().min(1).max(400),
  source_refs: z.array(SourceRef).min(1),
  status: Status,
  order: z.number().int().nonnegative(),
});
export type Period = z.infer<typeof Period>;

// ---------------------------------------------------------------------------
// Historical entities
// ---------------------------------------------------------------------------

export const Port = ClaimBase
  .extend({
    coordinates: Coordinates,
    /** The source the coordinates were taken from (ASI gazetteer, site report, etc.). */
    coordinate_source: Id,
    modern_name: z.string().optional(),
    /**
     * Where the port is. "kalinga" for the Odisha / north-Andhra coast; other values
     * mark trading destinations that routes point to (they render differently).
     */
    region: z
      .enum(['kalinga', 'bengal', 'south-india', 'sri-lanka', 'southeast-asia', 'east-asia', 'west-asia', 'other'])
      .default('kalinga'),
    /** Alternative names in classical texts, e.g. "Palura" (Ptolemy). Each needs its own source in `caveats` or notes. */
    also_known_as: z.array(z.string()).optional(),
    /** Ids of goods documented at this port. */
    goods: z.array(Id).default([]),
  })
  .superRefine(claimRules);
export type Port = z.infer<typeof Port>;

export const Route = ClaimBase
  .extend({
    mode: RouteMode,
    /** Port or site id where the route starts. */
    from: Id,
    /** Port, site or destination id where the route ends. May be a foreign destination declared in ports.json. */
    to: Id,
    /** Ordered lat/lng list including endpoints. At least 2 points. */
    waypoints: z.array(Coordinates).min(2),
    goods: z.array(Id).default([]),
    /** Sourced one-liner for the sailing-ship animation caption. */
    kid_line: z.string().max(160).optional(),
  })
  .superRefine(claimRules);
export type Route = z.infer<typeof Route>;

export const Good = ClaimBase
  .extend({
    category: z.enum(['textile', 'spice', 'gem', 'metal', 'animal-product', 'foodstuff', 'timber', 'ceramic', 'other']),
    direction: z.enum(GOOD_DIRECTIONS),
    /** One fun, sourced sentence for the "What's in the ship?" manifest. */
    kid_line: z.string().min(1).max(160),
    /** Path to an original SVG in src/assets/goods/, e.g. "pepper.svg". */
    icon: z.string().regex(/^[a-z0-9-]+\.svg$/).optional(),
  })
  .superRefine(claimRules);
export type Good = z.infer<typeof Good>;

export const Site = ClaimBase
  .extend({
    coordinates: Coordinates,
    coordinate_source: Id,
    modern_name: z.string().optional(),
    /** e.g. "fortified urban centre", "port settlement", "Buddhist monastery". */
    site_type: z.string().min(1),
    /** Key finds relevant to trade, each with its own source ref. */
    finds: z
      .array(
        z.object({
          name: z.string().min(1),
          significance: z.string().max(300),
          source_refs: z.array(SourceRef).min(1),
        }),
      )
      .default([]),
    excavated_by: z.string().optional(),
  })
  .superRefine(claimRules);
export type Site = z.infer<typeof Site>;

export const Inscription = ClaimBase
  .extend({
    location: z.string().min(1),
    coordinates: Coordinates.optional(),
    language: z.string().min(1),
    script: z.string().min(1),
    /** Date as given by the scholarly source, e.g. "c. 1st century BCE". */
    date_text: z.string().min(1),
    /** What the inscription says about trade, movement or ports, in plain words. */
    trade_relevance: z.string().min(1).max(600),
    /** Reference to the published edition, e.g. "Epigraphia Indica XX, pp. 71–89". */
    edition_ref: SourceRef,
  })
  .superRefine(claimRules);
export type Inscription = z.infer<typeof Inscription>;

/** "Did you know?" tooltip content. */
export const Fact = ClaimBase
  .extend({
    /** The fact itself, <= 140 chars, FK grade <= 7. `summary` may repeat it. */
    text: z.string().min(1).max(140),
    /** Ids of ports, routes, goods, sites or inscriptions this fact is about. */
    related_ids: z.array(Id).default([]),
  })
  .superRefine(claimRules);
export type Fact = z.infer<typeof Fact>;

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------

export const Collections = {
  sources: z.array(Source),
  periods: z.array(Period),
  ports: z.array(Port),
  routes: z.array(Route),
  goods: z.array(Good),
  sites: z.array(Site),
  inscriptions: z.array(Inscription),
  facts: z.array(Fact),
} as const;
export type CollectionName = keyof typeof Collections;

/** Minimum number of distinct sources required per evidence level (H2). */
export const MIN_SOURCES: Record<EvidenceLevel, number> = {
  Confirmed: 2,
  'Strongly Supported': 2,
  Probable: 1,
  Hypothetical: 1,
  UNVERIFIED: 0,
};
