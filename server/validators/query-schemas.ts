import { z } from 'zod';

/** Shared pagination rules for every list endpoint (?page=1&pageSize=20). */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const listVehiclesQuerySchema = paginationQuerySchema;
export const listWheelsQuerySchema = paginationQuerySchema;
export const listTyresQuerySchema = paginationQuerySchema;

/** Route parameters for detail endpoints (/api/{entity}/:id). */
export const entityIdParamSchema = z.object({
  id: z.string().uuid(),
});
