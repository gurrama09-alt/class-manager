import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import ResourcesPageClient from './ResourcesPageClient'

export const metadata: Metadata = { title: 'Study Resources' }
export const dynamic = 'force-dynamic'

export default async function ResourcesPage() {
  const supabase = await createClient()

  const [{ data: resources }, { data: departments }, { data: subjects }, { data: settings }] = await Promise.all([
    supabase
      .from('resources')
      .select('*, departments(id,name), sections(id,name), subjects(id,name,code)')
      .order('sequence_number', { ascending: true }),
    supabase.from('departments').select('id, name').eq('is_active', true),
    supabase.from('subjects').select('id, name, code, semester').eq('is_active', true),
    supabase.from('academic_settings').select('*').single(),
  ])

  // Get current user role
  const { data: { user } } = await supabase.auth.getUser()
  let userRole: string = 'student'
  if (user) {
    const { data: profileRaw } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
    const profile = profileRaw as { role?: string } | null
    userRole = profile?.role ?? 'student'
  }

  return (
    <ResourcesPageClient
      resources={resources ?? []}
      departments={departments ?? []}
      subjects={subjects ?? []}
      settings={settings}
      userRole={userRole}
    />
  )
}
