import * as z from "zod";

export const storeSchema = z.object({
  name: z.string().min(2, "Store name is required"),
  code: z.string().min(2, "Store code is required"),
  address: z.string().min(5, "Address is required"),
  phone: z.string().min(10, "Valid phone number is required"),
  email: z.string().email("Invalid email address"),
  taxRate: z.number().min(0, "Tax rate cannot be negative"),
});

export type StoreFormData = z.infer<typeof storeSchema>;
