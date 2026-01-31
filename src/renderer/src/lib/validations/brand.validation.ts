import { z } from "zod";

export const brandSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  slug: z.string().min(2, "Slug must be at least 2 characters"),
  description: z.string().optional(),
  logoUrl: z.string().optional(),
  website: z.string().url("Invalid website URL").optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});

export type BrandFormData = z.infer<typeof brandSchema>;
