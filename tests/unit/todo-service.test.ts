import { describe, expect, it } from 'vitest'
import { ApiError } from '../../src/lib/errors'
import type { TodoRepository } from '../../src/repositories/todo-repository'
import { createTodoService } from '../../src/services/todo-service'
import type { AuthUser } from '../../src/types/user'

const normalUser: AuthUser = {
  id: 1,
  email: 'user@example.com',
  role: 'user',
}

const adminUser: AuthUser = {
  id: 9,
  email: 'admin@example.com',
  role: 'admin',
}

const createRepositoryStub = (): TodoRepository => ({
  list: async (_query, scopeUserId) => ({
    items:
      scopeUserId === 1
        ? [
            {
              id: 1,
              user_id: 1,
              title: 'first',
              completed: 0,
              created_at: '2026-01-01',
              updated_at: '2026-01-01',
            },
          ]
        : [],
    total: scopeUserId === 1 ? 1 : 0,
  }),
  findById: async (id, scopeUserId) =>
    id === 1 && (scopeUserId === undefined || scopeUserId === 1)
      ? {
          id: 1,
          user_id: 1,
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
    const result = await service.listTodos({ limit: 20, offset: 0 }, normalUser)

    expect(result.page.total).toBe(1)
    expect(result.items[0]).toMatchObject({ id: 1, userId: 1, completed: false })
  })

  it('listTodos should reject non-admin querying another user', async () => {
    const service = createTodoService(createRepositoryStub())
    await expect(
      service.listTodos({ limit: 20, offset: 0, userId: 2 }, normalUser),
    ).rejects.toBeInstanceOf(ApiError)
  })

  it('listTodos should allow admin querying another user', async () => {
    const service = createTodoService(createRepositoryStub())
    const result = await service.listTodos({ limit: 20, offset: 0, userId: 1 }, adminUser)
    expect(result.page.total).toBe(1)
  })

  it('getTodoById should throw NOT_FOUND when missing', async () => {
    const service = createTodoService(createRepositoryStub())
    await expect(service.getTodoById(99, normalUser)).rejects.toBeInstanceOf(ApiError)
  })

  it('createTodo should throw on create failure', async () => {
    const repo = createRepositoryStub()
    repo.create = async () => null
    const service = createTodoService(repo)
    await expect(
      service.createTodo({ title: 'a', completed: false }, normalUser),
    ).rejects.toBeInstanceOf(ApiError)
  })

  it('replaceTodo should throw when update changes nothing', async () => {
    const service = createTodoService(createRepositoryStub())
    await expect(
      service.replaceTodo(2, { title: 'x', completed: true }, normalUser),
    ).rejects.toBeInstanceOf(ApiError)
  })

  it('patchTodo should throw when updated row cannot be reloaded', async () => {
    const repo = createRepositoryStub()
    repo.update = async () => 1
    repo.findById = async () => null
    const service = createTodoService(repo)
    await expect(service.patchTodo(1, { completed: true }, normalUser)).rejects.toBeInstanceOf(
      ApiError,
    )
  })

  it('deleteTodo should throw when row is missing', async () => {
    const service = createTodoService(createRepositoryStub())
    await expect(service.deleteTodo(2, normalUser)).rejects.toBeInstanceOf(ApiError)
  })

  it('checkReady should throw when repository ping fails', async () => {
    const repo = createRepositoryStub()
    repo.ping = async () => {
      throw new Error('db down')
    }

    const service = createTodoService(repo)
    await expect(service.checkReady()).rejects.toMatchObject({
      status: 503,
      code: 'SERVICE_UNAVAILABLE',
    })
  })
})
