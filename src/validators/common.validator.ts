import { z } from 'zod';

export const TEXT_LIMITS = {
  name: 100,
  title: 200,
  summary: 1000,
  markdown: 20_000,
  url: 2048,
  listItem: 300,
  tag: 50,
} as const;

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const MAX_ORDERED_IDS = 500;

export const objectIdSchema = z
  .string('Required')
  .toLowerCase()
  .regex(/^[a-f\d]{24}$/, 'Must be a valid ID');

export const idParamsSchema = z.object({ id: objectIdSchema });

export type IdParams = z.infer<typeof idParamsSchema>;

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export const orderSchema = z.object({
  ids: z.array(objectIdSchema).min(1).max(MAX_ORDERED_IDS),
});

export type OrderInput = z.infer<typeof orderSchema>;

export function requiredText(maxLength: number) {
  return z.string('Required').trim().min(1, 'Required').max(maxLength);
}

// Empty strings are stored as null, so "not set" has a single representation.
export function optionalText(maxLength: number) {
  return z
    .string()
    .trim()
    .max(maxLength)
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .optional();
}

export const httpUrlSchema = z
  .string()
  .trim()
  .max(TEXT_LIMITS.url)
  .pipe(z.url({ protocol: /^https?$/, error: 'Must be a valid http(s) URL' }));

export const optionalHttpUrlSchema = z
  .union([z.literal('').transform(() => null), httpUrlSchema])
  .nullable()
  .optional();

export const yearMonthSchema = z.string('Required').regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Must be in YYYY-MM format');

export const mediaIdSchema = objectIdSchema.nullable().optional();

export function textList(options: { maxItems: number; maxLength: number }) {
  return z.array(z.string().trim().min(1).max(options.maxLength)).max(options.maxItems);
}
