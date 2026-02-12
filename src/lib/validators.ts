import { ApiError } from './errors'
import type { CreateTodoInput, ListTodosQuery, PatchTodoInput, PutTodoInput } from '../types/todo'

const MAX_LIMIT = 100
const DEFAULT_LIMIT = 20

const parseTitle = (value: unknown, required: boolean): string | undefined => {
  if (value === undefined || value === null) {
    if (required) {
      throw new ApiError(400, 'BAD_REQUEST', 'title is required')
    }
    return undefined
  }

  if (typeof value !== 'string') {
    throw new ApiError(400, 'BAD_REQUEST', 'title must be a string')
  }

  const title = value.trim()
  if (!title) {
    throw new ApiError(400, 'BAD_REQUEST', 'title cannot be empty')
  }

  return title
}

const parseCompleted = (value: unknown, required: boolean): boolean | undefined => {
  if (value === undefined || value === null) {
    if (required) {
      throw new ApiError(400, 'BAD_REQUEST', 'completed is required')
    }
    return undefined
  }

  if (typeof value !== 'boolean') {
    throw new ApiError(400, 'BAD_REQUEST', 'completed must be boolean')
  }

  return value
}

const parseJsonBody = async (request: Request): Promise<Record<string, unknown>> => {
  const body = await request.json<Record<string, unknown>>().catch(() => null)
  if (!body || typeof body !== 'object') {
    throw new ApiError(400, 'BAD_REQUEST', 'invalid json body')
  }

  return body
}

export const parseId = (rawId: string): number => {
  const id = Number(rawId)
  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiError(400, 'BAD_REQUEST', 'invalid id')
  }
  return id
}

export const parseListTodosQuery = (request: Request): ListTodosQuery => {
  const url = new URL(request.url)
  const limitRaw = url.searchParams.get('limit')
  const offsetRaw = url.searchParams.get('offset')

  const limit = limitRaw === null ? DEFAULT_LIMIT : Number(limitRaw)
  const offset = offsetRaw === null ? 0 : Number(offsetRaw)

  if (!Number.isInteger(limit) || limit <= 0 || limit > MAX_LIMIT) {
    throw new ApiError(400, 'BAD_REQUEST', `limit must be an integer between 1 and ${MAX_LIMIT}`)
  }

  if (!Number.isInteger(offset) || offset < 0) {
    throw new ApiError(400, 'BAD_REQUEST', 'offset must be an integer >= 0')
  }

  return { limit, offset }
}

export const parseCreateTodoInput = async (request: Request): Promise<CreateTodoInput> => {
  const body = await parseJsonBody(request)

  return {
    title: parseTitle(body.title, true) as string,
    completed: parseCompleted(body.completed, false) ?? false,
  }
}

export const parsePatchTodoInput = async (request: Request): Promise<PatchTodoInput> => {
  const body = await parseJsonBody(request)

  const title = parseTitle(body.title, false)
  const completed = parseCompleted(body.completed, false)

  if (title === undefined && completed === undefined) {
    throw new ApiError(400, 'BAD_REQUEST', 'title or completed is required')
  }

  const input: PatchTodoInput = {}

  if (title !== undefined) {
    input.title = title
  }

  if (completed !== undefined) {
    input.completed = completed
  }

  return input
}

export const parsePutTodoInput = async (request: Request): Promise<PutTodoInput> => {
  const body = await parseJsonBody(request)

  return {
    title: parseTitle(body.title, true) as string,
    completed: parseCompleted(body.completed, true) as boolean,
  }
}
