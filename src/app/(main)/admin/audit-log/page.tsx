import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AuditLogClient from './AuditLogClient'

export const metadata: Metadata = { title: 'Audit Log' }
export const dynamic = 'force-dynamic'

export default async function AuditLogPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('user_profiles').select('role, department_id').eq('id', user.id).single()
  if (!profile || (profile.role !== 'super_admin' && profile.role !== 'department_admin')) redirect('/unauthorized')

  const isSuperAdmin = profile.role === 'super_admin'
  const deptId = profile.department_id

  let logsQuery = supabase
    .from('audit_logs')
    .select('*, departments(name)')
    .order('created_at', { ascending: false })
    .limit(200)

  let deptsQuery = supabase.from('departments').select('id, name').eq('is_active', true)

  if (!isSuperAdmin) {
    if (deptId) {
      logsQuery = logsQuery.eq('department_id', deptId)
      deptsQuery = deptsQuery.eq('id', deptId)
    } else {
      logsQuery = logsQuery.eq('id', '00000000-0000-0000-0000-000000000000')
      deptsQuery = deptsQuery.eq('id', '00000000-0000-0000-0000-000000000000')
    }
  }

  const [{ data: logs }, { data: departments }] = await Promise.all([
    logsQuery,
    deptsQuery,
  ])

  return <AuditLogClient logs={logs ?? []} departments={departments ?? []} />
}
