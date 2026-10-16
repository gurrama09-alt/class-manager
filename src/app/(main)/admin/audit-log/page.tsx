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

  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
  if (!profile || (profile.role !== 'super_admin' && profile.role !== 'department_admin')) redirect('/unauthorized')

  const { data: logs } = await supabase
    .from('audit_logs')
    .select('*, departments(name)')
    .order('created_at', { ascending: false })
    .limit(200)

  const { data: departments } = await supabase.from('departments').select('id, name')

  return <AuditLogClient logs={logs ?? []} departments={departments ?? []} />
}
