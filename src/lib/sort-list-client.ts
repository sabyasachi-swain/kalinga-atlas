/**
 * Progressive enhancement for the routes/ports/goods listing pages (owner
 * item 4). Not an island — no React, no hydration directive. The server
 * already renders the list in the chronological default, with the sort keys
 * needed for the other two orders as `data-sort-*` attributes (see
 * EntityCard.astro / @lib/sort-entities); this only re-orders the existing
 * <li> elements already in the DOM when the visitor changes the <select>.
 * Without JS the page still shows a legible, meaningful order.
 */
type SortAttr = 'sortTime' | 'sortEvidence' | 'sortName';

const ATTR_FOR_KEY: Record<string, SortAttr> = {
  time: 'sortTime',
  evidence: 'sortEvidence',
  az: 'sortName',
};

function reorder(list: HTMLElement, key: string): void {
  const attr = ATTR_FOR_KEY[key] ?? 'sortTime';
  const items = Array.from(list.children).filter((n): n is HTMLElement => n instanceof HTMLElement);
  items.sort((a, b) => {
    if (attr === 'sortName') return (a.dataset.sortName ?? '').localeCompare(b.dataset.sortName ?? '');
    const av = Number(a.dataset[attr]);
    const bv = Number(b.dataset[attr]);
    const an = Number.isFinite(av) ? av : Number.POSITIVE_INFINITY;
    const bn = Number.isFinite(bv) ? bv : Number.POSITIVE_INFINITY;
    if (an !== bn) return an - bn;
    return (a.dataset.sortName ?? '').localeCompare(b.dataset.sortName ?? '');
  });
  for (const item of items) list.appendChild(item);
}

export function initSortList(): void {
  const form = document.querySelector<HTMLFormElement>('[data-sort-form]');
  const list = document.querySelector<HTMLElement>('[data-sort-list]');
  const select = form?.querySelector<HTMLSelectElement>('select');
  if (!form || !list || !select) return;
  select.addEventListener('change', () => reorder(list, select.value));
}
