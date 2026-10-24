import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import ResourcesPageClient from './ResourcesPageClient'

export const metadata: Metadata = { title: 'Study Resources' }
export const dynamic = 'force-dynamic'

export default async function ResourcesPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let resources: any[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let departments: any[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let subjects: any[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let settings: any = null
  let userRole: string = 'student'
  let userDepartmentId: string | null = null

  try {
    const supabase = await createClient()

    // Get current user role
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profileRaw } = await supabase.from('user_profiles').select('role, department_id').eq('id', user.id).single()
      const profile = profileRaw as { role?: string; department_id?: string | null } | null
      userRole = profile?.role ?? 'student'
      userDepartmentId = profile?.department_id ?? null
    }

    const isDeptAdmin = userRole === 'department_admin'

    let resQuery = supabase
      .from('resources')
      .select('*, departments(id,name), sections(id,name), subjects(id,name,code)')
      .order('sequence_number', { ascending: true })

    let deptQuery = supabase.from('departments').select('id, name').eq('is_active', true)
    let subjQuery = supabase.from('subjects').select('id, name, code, semester, department_id').eq('is_active', true)

    if (isDeptAdmin) {
      if (userDepartmentId) {
        resQuery = resQuery.eq('department_id', userDepartmentId)
        deptQuery = deptQuery.eq('id', userDepartmentId)
        subjQuery = subjQuery.eq('department_id', userDepartmentId)
      } else {
        resQuery = resQuery.eq('id', '00000000-0000-0000-0000-000000000000')
        deptQuery = deptQuery.eq('id', '00000000-0000-0000-0000-000000000000')
        subjQuery = subjQuery.eq('id', '00000000-0000-0000-0000-000000000000')
      }
    }

    const [{ data: resData }, { data: deptData }, { data: subjData }, { data: settData }] = await Promise.all([
      resQuery,
      deptQuery,
      subjQuery,
      supabase.from('academic_settings').select('*').single(),
    ])

    resources = resData ?? []
    departments = deptData ?? []
    subjects = subjData ?? []
    settings = settData
  } catch (err) {
    console.error('Error fetching resources page data:', err)
  }

  return (
    <ResourcesPageClient
      resources={resources}
      departments={departments}
      subjects={subjects}
      settings={settings}
      userRole={userRole}
      userDepartmentId={userDepartmentId}
    />
  )
}
