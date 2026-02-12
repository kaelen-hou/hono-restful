import { z } from 'zod'

const emailSchema = z
  .string()
  .email()
  .transform((value) => value.trim().toLowerCase())
const passwordSchema = z
  .string()
  .min(8, 'password must be at least 8 characters')
  .max(72, 'password is too long')

export const registerBodySchema = z.object({
  email: emailSchema,
  password: passwordSchema,
})

export const loginBodySchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'password is required'),
})
