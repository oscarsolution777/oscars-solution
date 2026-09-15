import { z } from "zod";

// El dinero nunca se guarda en float (CLAUDE.md sección 5). El formulario
// recibe el precio en unidades del salón como texto; se valida el formato
// aquí y se convierte a price_cents en la Server Action (nunca en el cliente).
const PRICE_PATTERN = /^\d+(\.\d{1,2})?$/;

// durationMin viaja como texto (igual que price) para que el tipo de
// entrada y salida del schema coincidan — z.coerce.number() rompe la
// inferencia de tipos entre useForm<T> y zodResolver en react-hook-form.
const DURATION_PATTERN = /^\d{1,3}$/;

export const serviceSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  features: z.string().trim().max(2000).optional().or(z.literal("")),
  price: z.string().trim().regex(PRICE_PATTERN),
  durationMin: z
    .string()
    .trim()
    .regex(DURATION_PATTERN)
    .refine((value) => {
      const n = Number.parseInt(value, 10);
      return n > 0 && n <= 600;
    }),
});

export type ServiceInput = z.infer<typeof serviceSchema>;

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const serviceImageSchema = z
  .instanceof(File)
  .refine((file) => file.size > 0 && file.size <= MAX_IMAGE_SIZE_BYTES)
  .refine((file) =>
    (ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(file.type)
  );

export function parseFeatures(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function priceToCents(price: string): number {
  return Math.round(Number.parseFloat(price) * 100);
}

export function parseDurationMin(durationMin: string): number {
  return Number.parseInt(durationMin, 10);
}
