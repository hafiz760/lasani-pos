import { z } from 'zod'

export const customerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(7, 'Phone number is required'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  openingBalance: z.preprocess((val) => Number(val) || 0, z.number().min(0))
})

export type CustomerFormData = z.infer<typeof customerSchema>
