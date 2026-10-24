import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import AdminDashboardClient from './AdminDashboardClient'

export const metadata: Metadata = { title: 'Admin Dashboard' }
export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('user_profiles').select('*').eq('id', user.id).single()
  if (!profile || (profile.role !== 'super_admin' && profile.role !== 'department_admin')) {
    redirect('/unauthorized')
  }

  const adminClient = createAdminClient()

  // Auto-sync department_id from admin_authorizations if missing on profile
  if (profile.role === 'department_admin' && !profile.department_id && profile.email) {
    const { data: authRecord } = await adminClient
      .from('admin_authorizations')
      .select('department_id')
      .eq('email', profile.email.toLowerCase())
      .maybeSingle()

    if (authRecord?.department_id) {
      await adminClient
        .from('user_profiles')
        .update({ department_id: authRecord.department_id })
        .eq('id', profile.id)
      profile.department_id = authRecord.department_id
    }
  }

  const isSuperAdmin = profile.role === 'super_admin'
  const deptId = profile.department_id

  // Fetch dashboard data based on role
  let resourcesQuery = supabase.from('resources').select('*, departments(id,name), subjects(id,name,code)').order('sequence_number')
  let presentationsQuery = supabase.from('presentations').select('*, subjects(id,name,code), sections(id,name)').eq('is_latest', true).order('submitted_at', { ascending: false })
  let departmentsQuery = supabase.from('departments').select('*').eq('is_active', true)
  let subjectsQuery = supabase.from('subjects').select('*, departments(id,name)').eq('is_active', true)
  let sectionsQuery = supabase.from('sections').select('*, departments(id,name)').eq('is_active', true)
  let downloadsQuery = supabase.from('resources').select('*', { count: 'exact', head: true }).not('download_count', 'eq', 0)

  // Scope queries if department_admin
  if (!isSuperAdmin) {
    if (deptId) {
      resourcesQuery = resourcesQuery.eq('department_id', deptId)
      presentationsQuery = presentationsQuery.eq('department_id', deptId)
      departmentsQuery = departmentsQuery.eq('id', deptId)
      subjectsQuery = subjectsQuery.eq('department_id', deptId)
      sectionsQuery = sectionsQuery.eq('department_id', deptId)
      downloadsQuery = downloadsQuery.eq('department_id', deptId)
    } else {
      // If dept admin has no assigned department yet, scope to empty
      resourcesQuery = resourcesQuery.eq('id', '00000000-0000-0000-0000-000000000000')
      presentationsQuery = presentationsQuery.eq('id', '00000000-0000-0000-0000-000000000000')
      departmentsQuery = departmentsQuery.eq('id', '00000000-0000-0000-0000-000000000000')
      subjectsQuery = subjectsQuery.eq('id', '00000000-0000-0000-0000-000000000000')
      sectionsQuery = sectionsQuery.eq('id', '00000000-0000-0000-0000-000000000000')
      downloadsQuery = downloadsQuery.eq('id', '00000000-0000-0000-0000-000000000000')
    }
  }

  const [
    { data: resources },
    { data: presentations },
    { data: departments },
    { data: subjects },
    { data: sections },
    { data: settings },
    adminsResult,
    { count: totalDownloads },
  ] = await Promise.all([
    resourcesQuery,
    presentationsQuery,
    departmentsQuery,
    subjectsQuery,
    sectionsQuery,
    supabase.from('academic_settings').select('*').single(),
    isSuperAdmin
      ? adminClient.from('admin_authorizations').select('*, departments(id,name)').order('invited_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    downloadsQuery,
  ])

  return (
    <AdminDashboardClient
      profile={profile}
      resources={resources ?? []}
      presentations={presentations ?? []}
      departments={departments ?? []}
      subjects={subjects ?? []}
      sections={sections ?? []}
      settings={settings}
      admins={adminsResult.data ?? []}
      totalDownloads={totalDownloads ?? 0}
    />
  )
}
