import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import UploadPageClient from './UploadPageClient'

export const metadata: Metadata = { title: 'Submit Presentation' }

export default async function UploadPage() {
  const supabase = await createClient()

  const [{ data: sectionsRaw }, { data: subjectsRaw }, { data: settingsRaw }] = await Promise.all([
    supabase.from('sections').select('id, name, department_id, departments(name)').eq('is_active', true),
    supabase.from('subjects').select('id, name, code, semester, department_id, departments(name)').eq('is_active', true),
    supabase.from('academic_settings').select('*').single(),
  ])

  // Normalize to flat structures to avoid Supabase type issues
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sections = (sectionsRaw ?? []).map((s: any) => ({
    id: s.id as string,
    name: s.name as string,
    department_id: s.department_id as string,
    dept_name: (Array.isArray(s.departments) ? s.departments[0]?.name : s.departments?.name) as string | undefined,
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subjects = (subjectsRaw ?? []).map((s: any) => ({
    id: s.id as string,
    name: s.name as string,
    code: s.code as string,
    semester: s.semester as number,
    department_id: s.department_id as string,
    dept_name: (Array.isArray(s.departments) ? s.departments[0]?.name : s.departments?.name) as string | undefined,
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const settings = settingsRaw as any

  return (
    <UploadPageClient
      sections={sections}
      subjects={subjects}
      settings={settings}
    />
  )
}
