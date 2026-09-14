/**
 * Astro 5 content layer configuration.
 *
 * Narrative Markdown written by the editor agent, one file per entity,
 * mirroring `src/data/`. See `src/content/README.md` for the authoring
 * contract. Every collection uses the same frontmatter shape and must
 * build cleanly even when its directory is empty (only `.gitkeep` present) —
 * the loader agent still expects a passing build with zero entries.
 */
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/** entity_id must match the id of the corresponding entry in src/data/*.json. */
const entitySchema = z.object({
  entity_id: z.string(),
  title: z.string(),
  /** Scholar-mode-only text; excluded from the kid-facing readability gate. */
  scholar: z.boolean().optional(),
});

function entityCollection(dir: string) {
  return defineCollection({
    loader: glob({ pattern: '*.md', base: `./src/content/${dir}` }),
    schema: entitySchema,
  });
}

const ports = entityCollection('ports');
const routes = entityCollection('routes');
const goods = entityCollection('goods');
const sites = entityCollection('sites');
const inscriptions = entityCollection('inscriptions');

/** Intro copy for each site section (slug: routes | ports | goods | evidence). */
const sections = entityCollection('sections');

/**
 * Miscellaneous project Markdown (e.g. a future docs/attribution.md) rendered
 * through Astro's built-in markdown pipeline instead of a hand-rolled
 * markdown-to-HTML pass or an extra dependency. Frontmatter is optional
 * because files here are not editor-authored entity narratives.
 */
const docs = defineCollection({
  loader: glob({ pattern: '*.md', base: './docs' }),
  schema: z.object({ title: z.string().optional() }),
});

export const collections = { ports, routes, goods, sites, inscriptions, sections, docs };
