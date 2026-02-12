import { ApiError } from './errors'
import type { CreateTodoInput, UpdateTodoInput } from '../types/todo'

export const parseId = (rawId: string): number => {
  const id = Number(rawId)
  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiError(400, 'invalid id')
  }
  return id
}

export const parseCreateTodoInput = async (request: Request): Promise<CreateTodoInput> => {
  const body = await request
    .json<{ title?: string; completed?: boolean }>()
    .catch(() => null)

  const title = body?.title?.trim()
  if (!title) {
    throw new ApiError(400, 'title is required')
  }

  return {
    title,
    completed: body?.completed === true,
  }
}

export const parseUpdateTodoInput = async (request: Request): Promise<UpdateTodoInput> => {
  const body = await request
    .json<{ title?: string; completed?: boolean }>()
    .catch(() => null)

  if (!body || (body.title === undefined && body.completed === undefined)) {
    throw new ApiError(400, 'title or completed is required')
  }

  const input: UpdateTodoInput = {}

  if (body.title !== undefined) {
    const title = body.title.trim()
    if (!title) {
      throw new ApiError(400, 'title cannot be empty')
    }
    input.title = title
  }

  if (body.completed !== undefined) {
    input.completed = body.completed
  }

  return input
}
