import { describe, expect, it } from 'vitest'
import { ApiError } from '../../src/lib/errors'
import { createTodoService } from '../../src/services/todo-service'
import type { TodoRepository } from '../../src/repositories/todo-repository'

const createRepositoryStub = (): TodoRepository => ({
  list: async () => ({
    items: [
      {
        id: 1,
        title: 'first',
        completed: 0,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      },
    ],
    total: 1,
  }),
  findById: async (id) =>
    id === 1
      ? {
          id: 1,
          title: 'first',
          completed: 0,
          created_at: '2026-01-01',
          updated_at: '2026-01-01',
        }
      : null,
  create: async () => 1,
  update: async (id) => (id === 1 ? 1 : 0),
  remove: async (id) => (id === 1 ? 1 : 0),
  ping: async () => undefined,
})

describe('todo-service', () => {
  it('listTodos should return page + mapped items', async () => {
    const service = createTodoService(createRepositoryStub())
    const result = await service.listTodos({ limit: 20, offset: 0 })

    expect(result.page.total).toBe(1)
    expect(result.items[0]).toMatchObject({ id: 1, completed: false })
  })

  it('getTodoById should throw NOT_FOUND when missing', async () => {
    const service = createTodoService(createRepositoryStub())
    await expect(service.getTodoById(99)).rejects.toBeInstanceOf(ApiError)
  })

  it('checkReady should throw when repository ping fails', async () => {
    const repo = createRepositoryStub()
    repo.ping = async () => {
      throw new Error('db down')
    }

    const service = createTodoService(repo)
    await expect(service.checkReady()).rejects.toBeInstanceOf(ApiError)
  })
})
