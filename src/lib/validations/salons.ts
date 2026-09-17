import { z } from "zod";

// Timezones de referencia para los mercados de CLAUDE.md sección 1 (salón
// piloto en Guyana, mudanza próxima a Brasil) más UTC como comodín — no una
// lista exhaustiva de IANA, que sería ruido para una dueña eligiendo la suya.
export const SALON_TIMEZONES = [
  "America/Guyana",
  "America/Sao_Paulo",
  "America/Manaus",
  "UTC",
] as const;

export const salonProfileSchema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  address: z.string().trim().max(255).optional().or(z.literal("")),
  timezone: z.string().trim().min(1),
  defaultLocale: z.enum(["es", "en", "pt", "it", "fr", "de"]),
});

export type SalonProfileInput = z.infer<typeof salonProfileSchema>;

export const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_LOGO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const salonLogoSchema = z
  .instanceof(File)
  .refine((file) => file.size > 0 && file.size <= MAX_LOGO_SIZE_BYTES)
  .refine((file) => (ALLOWED_LOGO_MIME_TYPES as readonly string[]).includes(file.type));

export const membershipRoles = ["owner", "admin", "reception"] as const;

export const membershipUpdateSchema = z.object({
  role: z.enum(membershipRoles),
  isActive: z.boolean(),
});
