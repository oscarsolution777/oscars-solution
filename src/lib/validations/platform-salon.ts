import { z } from "zod";

const LOCALES = ["es", "en", "pt", "it", "fr", "de"] as const;

const baseSalonFields = {
  name: z.string().trim().min(1).max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  address: z.string().trim().max(240).optional().or(z.literal("")),
  timezone: z.string().trim().min(1).max(80),
  currency: z.string().trim().length(3),
  defaultLocale: z.enum(LOCALES),
  ownerEmail: z.string().trim().min(1).email(),
  ownerFullName: z.string().trim().min(1).max(120),
};

export const createSalonSchema = z.object(baseSalonFields);
export type CreateSalonInput = z.infer<typeof createSalonSchema>;

// demoDurationDays viaja como texto, no z.coerce.number(): un coerce rompe
// la inferencia de tipos entre useForm<T> y zodResolver (mismo motivo
// documentado en validations/services.ts para durationMin).
const DEMO_DURATION_PATTERN = /^\d{1,2}$/;

export const createDemoSalonSchema = z.object({
  ...baseSalonFields,
  demoDurationDays: z
    .string()
    .trim()
    .regex(DEMO_DURATION_PATTERN)
    .refine((value) => {
      const n = Number.parseInt(value, 10);
      return n >= 1 && n <= 30;
    }),
});
export type CreateDemoSalonInput = z.infer<typeof createDemoSalonSchema>;

export function parseDemoDurationDays(value: string): number {
  return Number.parseInt(value, 10);
}
