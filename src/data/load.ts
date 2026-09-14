/**
 * Build-time data access. Pages import from here, never from the JSON directly,
 * so the "only published entries render" rule (H7) has exactly one enforcement
 * point. Draft and reviewed entries are visible only when PUBLIC_SHOW_DRAFTS=true
 * (local preview for reviewers), never in a production build.
 */
import { Collections, type CollectionName } from './schema';
import sources from './sources.json';
import periods from './periods.json';
import ports from './ports.json';
import routes from './routes.json';
import goods from './goods.json';
import sites from './sites.json';
import inscriptions from './inscriptions.json';
import facts from './facts.json';

const RAW: Record<CollectionName, unknown> = { sources, periods, ports, routes, goods, sites, inscriptions, facts };

const showDrafts = import.meta.env.PUBLIC_SHOW_DRAFTS === 'true' && import.meta.env.DEV;

function parse<K extends CollectionName>(name: K) {
  // Parsing again here is cheap and guarantees pages never see malformed data
  // even if someone bypasses the prebuild validator.
  return Collections[name].parse(RAW[name]);
}

export function getSources() {
  return parse('sources');
}

export function getPeriods() {
  return parse('periods')
    .filter((p) => showDrafts || p.status === 'published')
    .sort((a, b) => a.order - b.order);
}

function published<T extends { status: string }>(list: T[]): T[] {
  return list.filter((e) => showDrafts || e.status === 'published');
}

export const getPorts = () => published(parse('ports'));
export const getRoutes = () => published(parse('routes'));
export const getGoods = () => published(parse('goods'));
export const getSites = () => published(parse('sites'));
export const getInscriptions = () => published(parse('inscriptions'));
export const getFacts = () => published(parse('facts'));
