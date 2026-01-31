import * as z from "zod";

export const roleSchema = z.object({
  name: z.string().min(2, "Role name must be at least 2 characters"),
  description: z.string().optional().or(z.literal("")),
  permissions: z.array(z.string()).optional().default([]),
});

export type RoleFormData = z.infer<typeof roleSchema>;
