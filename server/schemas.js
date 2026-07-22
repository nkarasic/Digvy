import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

// Date fields arrive as ISO strings, '', null, or the legacy 'never' sentinel
// (itemService maps 'never' onto is_evergreen). Absent keys stay absent.
const optionalDate = z
  .union([isoDate, z.literal(''), z.literal('never'), z.null()])
  .transform(v => (v === '' ? null : v))
  .optional();

const optionalPrice = z.preprocess(
  v => (v === '' || v == null ? null : Number(v)),
  z.number().min(0).max(1_000_000).nullable()
).optional();

export const itemCreateSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  category: z.string().trim().max(100).optional(),
  status: z.enum(['Active', 'Inactive', 'Historical']).optional(),
  logic_type: z.enum(['Fixed', 'Interval', 'Reference']).optional(),
  interval_months: z.union([z.number().int().min(1).max(600), z.null()]).optional(),
  billing_period_months: z.union([z.number().int().min(1).max(600), z.null()]).optional(),
  next_date: optionalDate,
  is_evergreen: z.boolean().optional(),
  cancel_by_date: optionalDate,
  details: z.string().max(10_000).optional(),
  link_url: z.union([z.string().trim().max(2048), z.null()]).optional(),
  date_type: z.enum(['firm', 'flexible']).optional(),
  booking_lead_days: z.union([z.number().int().min(0).max(365), z.null()]).optional(),
  snoozed_until: optionalDate,
});

export const itemUpdateSchema = itemCreateSchema.partial();

export const logCreateSchema = z.object({
  date: optionalDate,
  time: z.union([z.string().max(50), z.null()]).optional(),
  price_paid: optionalPrice,
  note: z.string().max(10_000).optional(),
  // Optional "set up the next occurrence" payload, applied to the item in the
  // same request. When set_next is true the item's schedule is overwritten with
  // these values; otherwise Interval items still auto-advance (legacy behavior).
  set_next: z.boolean().optional(),
  next_date: optionalDate,
  cancel_by_date: optionalDate,
  is_evergreen: z.boolean().optional(),
  date_type: z.enum(['firm', 'flexible']).optional(),
});

export const snoozeSchema = z.object({
  snoozed_until: isoDate,
});

export const emailPreferencesSchema = z.object({
  digest_enabled: z.boolean(),
});

export const importConfirmSchema = z.object({
  items: z.array(itemCreateSchema.extend({
    logs: z.array(logCreateSchema).max(100).optional(),
  })).max(500),
});
