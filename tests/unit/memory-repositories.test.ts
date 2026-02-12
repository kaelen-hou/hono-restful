import { beforeEach, describe, expect, it } from 'vitest'
import { resetMemoryDbStore } from '../../src/infrastructure/persistence/memory-store'
import { createMemoryTodoRepository } from '../../src/infrastructure/persistence/todo/memory-repository'
import { createMemoryUserRepository } from '../../src/infrastructure/persistence/user/memory-repository'

describe('memory todo repository', () => {
  beforeEach(() => {
    resetMemoryDbStore()
  })

  it('should create, list, update and remove todos with scope', async () => {
    const repository = createMemoryTodoRepository()

    const user1FirstId = await repository.create({ title: 'u1-1', completed: false }, 1)
    const user2FirstId = await repository.create({ title: 'u2-1', completed: false }, 2)
    const user1SecondId = await repository.create({ title: 'u1-2', completed: true }, 1)

    expect(user1FirstId).toBeTruthy()
    expect(user2FirstId).toBeTruthy()
    expect(user1SecondId).toBeTruthy()

    const user1List = await repository.list({ limit: 10, offset: 0 }, 1)
    expect(user1List.total).toBe(2)
    expect(user1List.items.map((item) => item.title)).toEqual(['u1-2', 'u1-1'])

    const allPaged = await repository.list({ limit: 1, offset: 1 })
    expect(allPaged.total).toBe(3)
    expect(allPaged.items).toHaveLength(1)

    const scopedMiss = await repository.findById(user2FirstId as number, 1)
    expect(scopedMiss).toBeNull()

    const updatedRows = await repository.update(user1FirstId as number, { completed: true }, 1)
    expect(updatedRows).toBe(1)

    const updatedTodo = await repository.findById(user1FirstId as number, 1)
    expect(updatedTodo?.completed).toBe(1)

    const removeMiss = await repository.remove(999, 1)
    expect(removeMiss).toBe(0)

    const removedRows = await repository.remove(user1SecondId as number, 1)
    expect(removedRows).toBe(1)

    await expect(repository.ping()).resolves.toBeUndefined()
  })
})

describe('memory user repository', () => {
  beforeEach(() => {
    resetMemoryDbStore()
  })

  it('should create users and manage refresh sessions', async () => {
    const repository = createMemoryUserRepository()

    const userId = await repository.create({
      email: 'User@Example.com',
      passwordHash: 'hash',
      role: 'user',
    })
    expect(userId).toBe(1)

    const byId = await repository.findById(userId as number)
    expect(byId?.email).toBe('User@Example.com')

    const byEmail = await repository.findByEmail('user@example.com')
    expect(byEmail?.id).toBe(userId)

    const expiresAt = new Date(Date.now() + 60_000).toISOString()
    await repository.createRefreshSession({
      jti: 'jti-1',
      userId: userId as number,
      familyId: 'family-1',
      deviceId: 'device-1',
      expiresAt,
    })

    const session = await repository.findRefreshSessionByJti('jti-1')
    expect(session?.revoked_at).toBeNull()
    expect(session?.expires_at).toBe(expiresAt)
    expect(session?.family_id).toBe('family-1')
    expect(session?.device_id).toBe('device-1')

    await repository.markRefreshSessionRotated('jti-1', 'jti-2')
    const rotated = await repository.findRefreshSessionByJti('jti-1')
    expect(rotated?.replaced_by_jti).toBe('jti-2')

    await repository.revokeRefreshSession('jti-1', 'logout')
    const revoked = await repository.findRefreshSessionByJti('jti-1')
    expect(revoked?.revoked_at).toBeTruthy()
    expect(revoked?.revoked_reason).toBe('logout')

    await repository.revokeRefreshSessionFamily('family-1', 'security_event')

    await expect(repository.revokeRefreshSession('missing-jti', 'logout')).resolves.toBeUndefined()
  })
})
