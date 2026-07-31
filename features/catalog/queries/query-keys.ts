import type { CatalogListParams } from '@/types/catalog';

/**
 * Hierarchical query keys for the catalog domain.
 *
 * Invalidation strategy: keys nest under `['catalog', entity]`, so
 * `invalidateQueries({ queryKey: catalogQueryKeys.root })` clears the whole
 * catalog, an entity key clears one catalog, and a list or detail key can be
 * invalidated precisely. Write flows (saved configurations, quotes, admin
 * publishing) invalidate through these keys after their mutations succeed.
 */
function entityKeys<TEntity extends string>(entity: TEntity) {
  const all = ['catalog', entity] as const;
  return {
    all,
    lists: () => [...all, 'list'] as const,
    list: (params: CatalogListParams) => [...all, 'list', params] as const,
    details: () => [...all, 'detail'] as const,
    detail: (id: string) => [...all, 'detail', id] as const,
  };
}

export const catalogQueryKeys = {
  root: ['catalog'] as const,
  vehicles: entityKeys('vehicles'),
  wheels: entityKeys('wheels'),
  tyres: entityKeys('tyres'),
};
