import { z } from "zod";

export const serviceCategorySchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export type ServiceCategoryInput = z.infer<typeof serviceCategorySchema>;
