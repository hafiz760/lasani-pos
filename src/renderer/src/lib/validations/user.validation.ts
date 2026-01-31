import * as z from 'zod'

export const loginSchema = z.object({
  email: z.string().email({
    message: 'Please enter a valid email address.'
  }),
  password: z.string().min(6, {
    message: 'Password must be at least 6 characters.'
  })
})

export type LoginFormData = z.infer<typeof loginSchema>

export const userSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .optional()
    .or(z.literal('')),
  role: z.string().min(1, 'Please select a system role'),
  globalRole: z.string().min(1, 'Please select a global access level'),
  avatarUrl: z.string().optional().or(z.literal(''))
})

export type UserFormData = z.infer<typeof userSchema>

export const profileSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters')
})

export type ProfileFormData = z.infer<typeof profileSchema>

export const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your new password')
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  })

export type PasswordFormData = z.infer<typeof passwordSchema>
