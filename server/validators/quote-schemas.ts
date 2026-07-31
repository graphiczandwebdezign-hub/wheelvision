import { z } from 'zod';

const nullableId = z.string().trim().min(1).nullish();

const quoteStatusEnum = z.enum([
  'DRAFT',
  'ISSUED',
  'VIEWED',
  'ACCEPTED',
  'REJECTED',
  'EXPIRED',
  'CANCELLED',
  'ARCHIVED',
]);

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

export const updateQuoteStatusSchema = z
  .object({
    status: quoteStatusEnum,
    actorName: z.string().trim().min(1).max(120).nullish(),
  })
  .strict();

export const listQuotesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: quoteStatusEnum.optional(),
});

export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;
export type UpdateQuoteStatusInput = z.infer<typeof updateQuoteStatusSchema>;
export type ListQuotesQuery = z.infer<typeof listQuotesQuerySchema>;
