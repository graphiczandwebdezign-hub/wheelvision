import { describe, expect, it } from 'vitest';
import { buildPaginationMeta, toSkipTake } from '@/server/utils/pagination';

describe('pagination', () => {
  describe('toSkipTake', () => {
    it('returns zero offset for the first page', () => {
      expect(toSkipTake({ page: 1, pageSize: 20 })).toEqual({ skip: 0, take: 20 });
    });

    it('computes the offset for later pages', () => {
      expect(toSkipTake({ page: 3, pageSize: 10 })).toEqual({ skip: 20, take: 10 });
    });
  });

  describe('buildPaginationMeta', () => {
    it('reports zero pages when there are no rows', () => {
      expect(buildPaginationMeta(1, 20, 0)).toEqual({
        page: 1,
        pageSize: 20,
        total: 0,
        totalPages: 0,
      });
    });

    it('rounds total pages up for a partial last page', () => {
      expect(buildPaginationMeta(2, 10, 25)).toEqual({
        page: 2,
        pageSize: 10,
        total: 25,
        totalPages: 3,
      });
    });

    it('handles an exactly full page count', () => {
      expect(buildPaginationMeta(1, 10, 10).totalPages).toBe(1);
    });
  });
});
