import type { User, UserRow } from '@/types/user'

export const toUser = (row: UserRow): User => ({
  id: row.id,
  email: row.email,
  role: row.role,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export const toMaskedEmail = (email: string): string => {
  const normalized = email.trim().toLowerCase()
  const [local = '', domain = ''] = normalized.split('@')
  if (!domain) {
    return '***'
  }

  const prefix = local.slice(0, 2)
  return `${prefix}***@${domain}`
}
