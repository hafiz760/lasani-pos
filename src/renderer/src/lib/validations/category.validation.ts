import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  slug: z.string().min(2, "Slug must be at least 2 characters"),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  parent: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
  displayOrder: z.number().default(0),
});

export type CategoryFormData = z.infer<typeof categorySchema>;
