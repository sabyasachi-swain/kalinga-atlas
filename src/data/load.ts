/**
 * Build-time data access. Pages import from here, never from the JSON directly,
 * so the "only published entries render" rule (H7) has exactly one enforcement
 * point. Draft and reviewed entries are visible only when PUBLIC_SHOW_DRAFTS=true
 * (local preview for reviewers), never in a production build.
 */
import type { z } from 'zod';
import { Collections, type CollectionName, type Status } from './schema';
import sources from './sources.json';
import periods from './periods.json';
import ports from './ports.json';
import routes from './routes.json';
import goods from './goods.json';
import sites from './sites.json';
import inscriptions from './inscriptions.json';
import facts from './facts.json';

const RAW: Record<CollectionName, unknown> = { sources, periods, ports, routes, goods, sites, inscriptions, facts };

type Parsed<K extends CollectionName> = z.infer<(typeof Collections)[K]>;

const showDrafts = import.meta.env.PUBLIC_SHOW_DRAFTS === 'true' && import.meta.env.DEV;

function parse<K extends CollectionName>(name: K): Parsed<K> {
  // Parsing again here is cheap and guarantees pages never see malformed data
  // even if someone bypasses the prebuild validator.
  return Collections[name].parse(RAW[name]) as Parsed<K>;
}

function published<T extends { status: Status }>(list: T[]): T[] {
  return list.filter((e) => showDrafts || e.status === 'published');
}

export function getSources(): Parsed<'sources'> {
  return parse('sources');
}

export function getPeriods(): Parsed<'periods'> {
  return published(parse('periods')).sort((a, b) => a.order - b.order);
}

export const getPorts = (): Parsed<'ports'> => published(parse('ports'));
export const getRoutes = (): Parsed<'routes'> => published(parse('routes'));
export const getGoods = (): Parsed<'goods'> => published(parse('goods'));
export const getSites = (): Parsed<'sites'> => published(parse('sites'));
export const getInscriptions = (): Parsed<'inscriptions'> => published(parse('inscriptions'));
export const getFacts = (): Parsed<'facts'> => published(parse('facts'));
