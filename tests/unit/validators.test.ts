import { describe, expect, it } from 'vitest'
import {
  createTodoBodySchema,
  listTodosQuerySchema,
  patchTodoBodySchema,
  putTodoBodySchema,
  todoIdParamSchema,
} from '../../src/lib/schemas/todo'

describe('todo zod schemas', () => {
  it('todoIdParamSchema parses positive id', () => {
    const parsed = todoIdParamSchema.parse({ id: '42' })
    expect(parsed.id).toBe(42)
  })

  it('todoIdParamSchema rejects invalid id', () => {
    expect(() => todoIdParamSchema.parse({ id: '0' })).toThrow()
  })

  it('listTodosQuerySchema applies defaults', () => {
    const parsed = listTodosQuerySchema.parse({})
    expect(parsed).toEqual({ limit: 20, offset: 0 })
  })

  it('listTodosQuerySchema validates limit upper bound', () => {
    expect(() => listTodosQuerySchema.parse({ limit: '101', offset: '0' })).toThrow()
  })

  it('createTodoBodySchema trims title and defaults completed', () => {
    const parsed = createTodoBodySchema.parse({ title: '  test  ' })
    expect(parsed).toEqual({ title: 'test', completed: false })
  })

  it('putTodoBodySchema requires full resource', () => {
    expect(() => putTodoBodySchema.parse({ title: 'only title' })).toThrow()
  })

  it('patchTodoBodySchema allows partial update', () => {
    const parsed = patchTodoBodySchema.parse({ completed: true })
    expect(parsed).toEqual({ completed: true })
  })
})
