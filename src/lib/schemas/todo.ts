import { z } from 'zod'

const MAX_LIMIT = 100
const DEFAULT_LIMIT = 20

export const todoIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export const listTodosQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
  offset: z.coerce.number().int().min(0).default(0),
  userId: z.coerce.number().int().positive().optional(),
})

const titleSchema = z.string().trim().min(1, 'title cannot be empty')

export const createTodoBodySchema = z.object({
  title: titleSchema,
  completed: z.boolean().optional().default(false),
})

export const putTodoBodySchema = z.object({
  title: titleSchema,
  completed: z.boolean(),
})

export const patchTodoBodySchema = z
  .object({
    title: titleSchema.optional(),
    completed: z.boolean().optional(),
  })
  .refine((value) => value.title !== undefined || value.completed !== undefined, {
    message: 'title or completed is required',
  })
