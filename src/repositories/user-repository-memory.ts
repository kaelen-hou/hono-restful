import type { UserRow } from '../types/user'
import { getMemoryDbStore } from './memory-store'
import type { CreateUserRecordInput, UserRepository } from './user-repository'

const now = () => new Date().toISOString()

export const createMemoryUserRepository = (): UserRepository => {
  const store = getMemoryDbStore()

  const findById = async (id: number): Promise<UserRow | null> => {
    const user = store.users.find((item) => item.id === id)
    return user ?? null
  }

  const findByEmail = async (email: string): Promise<UserRow | null> => {
    const normalized = email.trim().toLowerCase()
    const user = store.users.find((item) => item.email.toLowerCase() === normalized)
    return user ?? null
  }

  const create = async (input: CreateUserRecordInput): Promise<number | null> => {
    const id = store.nextUserId
    store.nextUserId += 1

    const timestamp = now()
    store.users.push({
      id,
      email: input.email,
      password_hash: input.passwordHash,
      role: input.role,
      created_at: timestamp,
      updated_at: timestamp,
    })

    return id
  }

  return {
    findById,
    findByEmail,
    create,
  }
}
