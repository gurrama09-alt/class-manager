import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminDashboardClient from './AdminDashboardClient'

export const metadata: Metadata = { title: 'Admin Dashboard' }

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('user_profiles').select('*').eq('id', user.id).single()
  if (!profile || (profile.role !== 'super_admin' && profile.role !== 'department_admin')) {
    redirect('/unauthorized')
  }

  // Fetch all dashboard data in parallel
  const [
    { data: resources },
    { data: presentations },
    { data: departments },
    { data: subjects },
    { data: sections },
    { data: settings },
    { data: admins },
    { count: totalDownloads },
  ] = await Promise.all([
    supabase.from('resources').select('*, departments(id,name), subjects(id,name,code)').order('sequence_number'),
    supabase.from('presentations').select('*, subjects(id,name,code), sections(id,name)').eq('is_latest', true).order('submitted_at', { ascending: false }),
    supabase.from('departments').select('*').eq('is_active', true),
    supabase.from('subjects').select('*, departments(id,name)').eq('is_active', true),
    supabase.from('sections').select('*, departments(id,name)').eq('is_active', true),
    supabase.from('academic_settings').select('*').single(),
    supabase.from('admin_authorizations').select('*, departments(id,name)').order('invited_at', { ascending: false }),
    supabase.from('resources').select('*', { count: 'exact', head: true }).not('download_count', 'eq', 0),
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
      admins={admins ?? []}
      totalDownloads={totalDownloads ?? 0}
    />
  )
}
