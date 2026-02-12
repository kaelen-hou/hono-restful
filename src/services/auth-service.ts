import { signAccessToken } from '../lib/auth'
import { ApiError } from '../lib/errors'
import { hashPassword, verifyPassword } from '../lib/password'
import type { UserRepository } from '../repositories/user-repository'
import type { AuthUser, LoginInput, RegisterInput, User, UserRow } from '../types/user'

const toUser = (row: UserRow): User => ({
  id: row.id,
  email: row.email,
  role: row.role,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

const toAuthUser = (row: UserRow): AuthUser => ({
  id: row.id,
  email: row.email,
  role: row.role,
})

export const createAuthService = (userRepository: UserRepository, jwtSecret?: string) => {
  const register = async (input: RegisterInput): Promise<{ token: string; user: User }> => {
    const existing = await userRepository.findByEmail(input.email)
    if (existing) {
      throw new ApiError(409, 'CONFLICT', 'email already exists')
    }

    const passwordHash = await hashPassword(input.password)
    const userId = await userRepository.create({
      email: input.email,
      passwordHash,
      role: 'user',
    })

    if (!userId) {
      throw new ApiError(500, 'INTERNAL_ERROR', 'failed to create user')
    }

    const created = await userRepository.findById(userId)
    if (!created) {
      throw new ApiError(500, 'INTERNAL_ERROR', 'failed to fetch created user')
    }

    const token = await signAccessToken(toAuthUser(created), jwtSecret)
    return { token, user: toUser(created) }
  }

  const login = async (input: LoginInput): Promise<{ token: string; user: User }> => {
    const user = await userRepository.findByEmail(input.email)
    if (!user) {
      throw new ApiError(401, 'UNAUTHORIZED', 'invalid credentials')
    }

    const ok = await verifyPassword(input.password, user.password_hash)
    if (!ok) {
      throw new ApiError(401, 'UNAUTHORIZED', 'invalid credentials')
    }

    const token = await signAccessToken(toAuthUser(user), jwtSecret)
    return { token, user: toUser(user) }
  }

  return {
    register,
    login,
  }
}
