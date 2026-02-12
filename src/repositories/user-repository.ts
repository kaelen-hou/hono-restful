import type { UserRole, UserRow } from '../types/user'

export type CreateUserRecordInput = {
  email: string
  passwordHash: string
  role: UserRole
}

export interface UserRepository {
  findById(id: number): Promise<UserRow | null>
  findByEmail(email: string): Promise<UserRow | null>
  create(input: CreateUserRecordInput): Promise<number | null>
}
