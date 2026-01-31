import { z } from "zod";

export const productSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  sku: z.string().min(3, "SKU must be at least 3 characters").toUpperCase(),
  barcode: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  brand: z.string().optional(),
  description: z.string().optional(),
  unit: z.string().default("piece"),
  buyingPrice: z.number().min(0, "Buying price cannot be negative"),
  sellingPrice: z.number().min(0, "Selling price cannot be negative"),
  stockLevel: z.number().min(0, "Stock level cannot be negative"),
  minStockLevel: z.number().min(0, "Minimum stock level cannot be negative"),
  warrantyMonths: z.number().optional(),
  isActive: z.boolean().default(true),
});

export type ProductFormData = z.infer<typeof productSchema>;
