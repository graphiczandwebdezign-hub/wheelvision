import { z } from 'zod';

/**
 * Quote boundary validators — the only place raw quote payloads become
 * typed domain input. The client always sends the full seven-field
 * configuration snapshot; fields are individually nullable (an incomplete
 * dimension is a business error, caught by the service's completeness
 * check, not a validation error).
 */

const nullableId = z.string().trim().min(1).nullish();

export const quoteConfigurationSchema = z
  .object({
    vehicleId: nullableId,
    colour: z.string().trim().min(1).nullish(),
    wheelId: nullableId,
    wheelFinish: z.string().trim().min(1).nullish(),
    wheelSizeId: nullableId,
    tyreId: nullableId,
    tyreProfileId: nullableId,
  })
  .strict();

export const quoteCustomerSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().toLowerCase().email().nullish(),
    phone: z.string().trim().min(1).max(40).nullish(),
  })
  .strict();

export const createQuoteSchema = z
  .object({
    configuration: quoteConfigurationSchema,
    customer: quoteCustomerSchema,
    consultantName: z.string().trim().min(1).max(120).nullish(),
  })
  .strict();

export const listQuotesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['ISSUED', 'ARCHIVED']).optional(),
});

export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;
export type ListQuotesQuery = z.infer<typeof listQuotesQuerySchema>;
