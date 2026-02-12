import { describe, expect, it } from 'vitest'
import { ApiError } from '../../src/lib/errors'
import {
  parseCreateTodoInput,
  parseId,
  parseListTodosQuery,
  parsePatchTodoInput,
  parsePutTodoInput,
} from '../../src/lib/validators'

describe('validators', () => {
  it('parseId should parse positive integer', () => {
    expect(parseId('42')).toBe(42)
  })

  it('parseId should throw on invalid id', () => {
    expect(() => parseId('0')).toThrow(ApiError)
  })

  it('parseListTodosQuery should parse defaults', () => {
    const req = new Request('http://localhost/todos')
    expect(parseListTodosQuery(req)).toEqual({ limit: 20, offset: 0 })
  })

  it('parseListTodosQuery should validate limit', () => {
    const req = new Request('http://localhost/todos?limit=101')
    expect(() => parseListTodosQuery(req)).toThrow(ApiError)
  })

  it('parseCreateTodoInput should parse and trim title', async () => {
    const req = new Request('http://localhost/todos', {
      method: 'POST',
      body: JSON.stringify({ title: '  test  ' }),
      headers: { 'content-type': 'application/json' },
    })

    await expect(parseCreateTodoInput(req)).resolves.toEqual({
      title: 'test',
      completed: false,
    })
  })

  it('parsePutTodoInput should require full resource', async () => {
    const req = new Request('http://localhost/todos/1', {
      method: 'PUT',
      body: JSON.stringify({ title: 'only title' }),
      headers: { 'content-type': 'application/json' },
    })

    await expect(parsePutTodoInput(req)).rejects.toThrow(ApiError)
  })

  it('parsePatchTodoInput should allow partial update', async () => {
    const req = new Request('http://localhost/todos/1', {
      method: 'PATCH',
      body: JSON.stringify({ completed: true }),
      headers: { 'content-type': 'application/json' },
    })

    await expect(parsePatchTodoInput(req)).resolves.toEqual({ completed: true })
  })
})
