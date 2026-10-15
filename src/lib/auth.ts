// ─────────────────────────────────────────────────────────────────────────────
// Auth helpers — server-side user resolution and role checking
// ─────────────────────────────────────────────────────────────────────────────
import { createClient } from '@/lib/supabase/server'
import type { UserProfile, UserRole } from '@/types/database'

export async function getCurrentUser(): Promise<UserProfile | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!data) return null
  // Cast since Supabase client is untyped
  return data as unknown as UserProfile
}

export async function requireAuth(): Promise<UserProfile> {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('UNAUTHORIZED')
  }
  return user
}

export async function requireRole(roles: UserRole[]): Promise<UserProfile> {
  const user = await requireAuth()
  if (!roles.includes(user.role)) {
    throw new Error('FORBIDDEN')
  }
  return user
}

export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser()
  return user?.role === 'super_admin' || user?.role === 'department_admin'
}

export async function isSuperAdmin(): Promise<boolean> {
  const user = await getCurrentUser()
  return user?.role === 'super_admin'
}
