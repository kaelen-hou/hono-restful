import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/db/client', () => ({
  createDb: vi.fn(),
}))

import { createDb } from '../../src/db/client'
import { createD1TodoRepository } from '../../src/repositories/todo-repository-d1'
import { createD1UserRepository } from '../../src/repositories/user-repository-d1'

const mockedCreateDb = vi.mocked(createDb)

describe('d1 todo repository', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should list rows and total', async () => {
    const todoRows = [
      {
        id: 2,
        userId: 7,
        title: 'task',
        completed: 1,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    ]

    const offset = vi.fn().mockResolvedValue(todoRows)
    const limit = vi.fn(() => ({ offset }))
    const orderBy = vi.fn(() => ({ limit }))
    const whereList = vi.fn(() => ({ orderBy }))
    const fromList = vi.fn(() => ({ where: whereList }))

    const whereCount = vi.fn().mockResolvedValue([{ total: 1 }])
    const fromCount = vi.fn(() => ({ where: whereCount }))

    const select = vi
      .fn()
      .mockReturnValueOnce({ from: fromList })
      .mockReturnValueOnce({ from: fromCount })

    mockedCreateDb.mockReturnValue({ select } as never)
    const repository = createD1TodoRepository({} as D1Database)

    const result = await repository.list({ limit: 10, offset: 0 }, 7)

    expect(result.total).toBe(1)
    expect(result.items).toEqual([
      {
        id: 2,
        user_id: 7,
        title: 'task',
        completed: 1,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      },
    ])
  })

  it('should find row by id', async () => {
    const limit = vi.fn().mockResolvedValue([
      {
        id: 3,
        userId: 7,
        title: 'one',
        completed: 0,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    ])
    const where = vi.fn(() => ({ limit }))
    const from = vi.fn(() => ({ where }))
    const select = vi.fn().mockReturnValue({ from })

    mockedCreateDb.mockReturnValue({ select } as never)
    const repository = createD1TodoRepository({} as D1Database)
    const row = await repository.findById(3, 7)

    expect(row?.id).toBe(3)
    expect(row?.user_id).toBe(7)
  })

  it('should return null when todo is not found', async () => {
    const limit = vi.fn().mockResolvedValue([])
    const where = vi.fn(() => ({ limit }))
    const from = vi.fn(() => ({ where }))
    const select = vi.fn().mockReturnValue({ from })

    mockedCreateDb.mockReturnValue({ select } as never)
    const repository = createD1TodoRepository({} as D1Database)
    const row = await repository.findById(999, 7)

    expect(row).toBeNull()
  })

  it('should create row and return id', async () => {
    const returning = vi.fn().mockResolvedValue([{ id: 9 }])
    const values = vi.fn(() => ({ returning }))
    const insert = vi.fn(() => ({ values }))

    mockedCreateDb.mockReturnValue({ insert } as never)
    const repository = createD1TodoRepository({} as D1Database)
    const id = await repository.create({ title: 'new', completed: true }, 5)

    expect(id).toBe(9)
  })

  it('should return null when create returning is empty', async () => {
    const returning = vi.fn().mockResolvedValue([])
    const values = vi.fn(() => ({ returning }))
    const insert = vi.fn(() => ({ values }))

    mockedCreateDb.mockReturnValue({ insert } as never)
    const repository = createD1TodoRepository({} as D1Database)
    const id = await repository.create({ title: 'new', completed: false }, 5)

    expect(id).toBeNull()
  })

  it('should return 0 when update input is empty', async () => {
    const update = vi.fn()
    mockedCreateDb.mockReturnValue({ update } as never)

    const repository = createD1TodoRepository({} as D1Database)
    const changes = await repository.update(1, {}, 1)

    expect(changes).toBe(0)
    expect(update).not.toHaveBeenCalled()
  })

  it('should update and remove rows', async () => {
    const whereUpdate = vi.fn().mockResolvedValue({ meta: { changes: 1 } })
    const set = vi.fn(() => ({ where: whereUpdate }))
    const update = vi.fn(() => ({ set }))

    const whereDelete = vi.fn().mockResolvedValue({ meta: { changes: 2 } })
    const del = vi.fn(() => ({ where: whereDelete }))

    mockedCreateDb.mockReturnValue({ update, delete: del } as never)
    const repository = createD1TodoRepository({} as D1Database)

    const updateChanges = await repository.update(1, { completed: true }, 1)
    const updateTitleChanges = await repository.update(1, { title: 'renamed', completed: false }, 1)
    const removeChanges = await repository.remove(1, 1)

    expect(updateChanges).toBe(1)
    expect(updateTitleChanges).toBe(1)
    expect(removeChanges).toBe(2)
  })

  it('should ping database', async () => {
    const limit = vi.fn().mockResolvedValue([{ one: 1 }])
    const from = vi.fn(() => ({ limit }))
    const select = vi.fn().mockReturnValue({ from })

    mockedCreateDb.mockReturnValue({ select } as never)
    const repository = createD1TodoRepository({} as D1Database)

    await expect(repository.ping()).resolves.toBeUndefined()
  })
})

describe('d1 user repository', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should find users by id and email', async () => {
    const limitById = vi.fn().mockResolvedValue([
      {
        id: 1,
        email: 'user@example.com',
        passwordHash: 'hash',
        role: 'user',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    ])
    const whereById = vi.fn(() => ({ limit: limitById }))
    const fromById = vi.fn(() => ({ where: whereById }))

    const limitByEmail = vi.fn().mockResolvedValue([
      {
        id: 2,
        email: 'hello@example.com',
        passwordHash: 'hash-2',
        role: 'admin',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    ])
    const whereByEmail = vi.fn(() => ({ limit: limitByEmail }))
    const fromByEmail = vi.fn(() => ({ where: whereByEmail }))

    const select = vi
      .fn()
      .mockReturnValueOnce({ from: fromById })
      .mockReturnValueOnce({ from: fromByEmail })

    mockedCreateDb.mockReturnValue({ select } as never)
    const repository = createD1UserRepository({} as D1Database)

    const byId = await repository.findById(1)
    const byEmail = await repository.findByEmail('  HELLO@EXAMPLE.COM  ')

    expect(byId?.id).toBe(1)
    expect(byId?.password_hash).toBe('hash')
    expect(byEmail?.email).toBe('hello@example.com')
    expect(byEmail?.role).toBe('admin')
  })

  it('should return null when user is not found', async () => {
    const limit = vi.fn().mockResolvedValue([])
    const where = vi.fn(() => ({ limit }))
    const from = vi.fn(() => ({ where }))
    const select = vi.fn().mockReturnValue({ from })

    mockedCreateDb.mockReturnValue({ select } as never)
    const repository = createD1UserRepository({} as D1Database)

    const byId = await repository.findById(999)
    expect(byId).toBeNull()
  })

  it('should create user with normalized email', async () => {
    const returning = vi.fn().mockResolvedValue([{ id: 11 }])
    const values = vi.fn(() => ({ returning }))
    const insert = vi.fn(() => ({ values }))

    mockedCreateDb.mockReturnValue({ insert } as never)
    const repository = createD1UserRepository({} as D1Database)

    const id = await repository.create({
      email: '  User@Example.COM ',
      passwordHash: 'hash',
      role: 'user',
    })

    expect(id).toBe(11)
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'user@example.com',
      }),
    )
  })

  it('should return null when create user returning is empty', async () => {
    const returning = vi.fn().mockResolvedValue([])
    const values = vi.fn(() => ({ returning }))
    const insert = vi.fn(() => ({ values }))

    mockedCreateDb.mockReturnValue({ insert } as never)
    const repository = createD1UserRepository({} as D1Database)

    const id = await repository.create({
      email: 'user@example.com',
      passwordHash: 'hash',
      role: 'user',
    })

    expect(id).toBeNull()
  })

  it('should create find and revoke refresh session', async () => {
    const sessionLimit = vi.fn().mockResolvedValue([
      {
        jti: 'jti-1',
        userId: 3,
        expiresAt: '2099-01-01T00:00:00.000Z',
        revokedAt: null,
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    ])
    const sessionWhere = vi.fn(() => ({ limit: sessionLimit }))
    const sessionFrom = vi.fn(() => ({ where: sessionWhere }))

    const select = vi.fn().mockReturnValue({ from: sessionFrom })

    const insertValues = vi.fn().mockResolvedValue(undefined)
    const insert = vi.fn(() => ({ values: insertValues }))

    const revokeWhere = vi.fn().mockResolvedValue({ meta: { changes: 1 } })
    const set = vi.fn(() => ({ where: revokeWhere }))
    const update = vi.fn(() => ({ set }))

    mockedCreateDb.mockReturnValue({ select, insert, update } as never)
    const repository = createD1UserRepository({} as D1Database)

    await repository.createRefreshSession({
      jti: 'jti-1',
      userId: 3,
      expiresAt: '2099-01-01T00:00:00.000Z',
    })
    const session = await repository.findRefreshSessionByJti('jti-1')
    await repository.revokeRefreshSession('jti-1')

    expect(insertValues).toHaveBeenCalled()
    expect(session?.jti).toBe('jti-1')
    expect(session?.user_id).toBe(3)
    expect(revokeWhere).toHaveBeenCalled()
  })

  it('should return null when refresh session is not found', async () => {
    const sessionLimit = vi.fn().mockResolvedValue([])
    const sessionWhere = vi.fn(() => ({ limit: sessionLimit }))
    const sessionFrom = vi.fn(() => ({ where: sessionWhere }))
    const select = vi.fn().mockReturnValue({ from: sessionFrom })

    mockedCreateDb.mockReturnValue({ select } as never)
    const repository = createD1UserRepository({} as D1Database)

    const session = await repository.findRefreshSessionByJti('missing')
    expect(session).toBeNull()
  })
})
