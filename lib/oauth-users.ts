export const runtime = 'nodejs'
import bcrypt from 'bcryptjs'

export type AdminUser = {
  email: string
  role: 'admin'
  password_hash: string
}

export function getAdminUsers(): AdminUser[] {
  const raw = process.env.E2D_ADMIN_USERS
  console.log('[oauth-users] E2D_ADMIN_USERS env var:', raw)
  if (!raw) {
    console.log('[oauth-users] No admin users configured')
    return []
  }
  try {
    const arr = JSON.parse(raw)
    return (Array.isArray(arr) ? arr : []) as AdminUser[]
  } catch (e) {
    console.error('E2D_ADMIN_USERS malformado:', e)
    return []
  }
}

export function findAdminByEmail(email: string): AdminUser | undefined {
  return getAdminUsers().find(u => u.email.toLowerCase() === email.trim().toLowerCase())
}

export async function validateAdminCredentials(email: string, password: string): Promise<AdminUser | null> {
  const user = findAdminByEmail(email)
  if (!user) return null
  const ok = await bcrypt.compare(password, user.password_hash)
  return ok ? user : null
}