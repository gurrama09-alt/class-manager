import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import type { AcademicSettings } from '@/types/database'
import UploadPageClient from './UploadPageClient'

export const metadata: Metadata = { title: 'Submit Presentation' }
export const dynamic = 'force-dynamic'

export default async function UploadPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let sections: any[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let subjects: any[] = []
  let settings: AcademicSettings | null = null

  try {
    const supabase = await createClient()

    const [{ data: sectionsRaw }, { data: subjectsRaw }, { data: settingsRaw }] = await Promise.all([
      supabase.from('sections').select('id, name, department_id, departments(name)').eq('is_active', true),
      supabase.from('subjects').select('id, name, code, semester, department_id, departments(name)').eq('is_active', true),
      supabase.from('academic_settings').select('*').single(),
    ])

    // Normalize to flat structures to avoid Supabase type issues
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sections = (sectionsRaw ?? []).map((s: any) => ({
      id: s.id as string,
      name: s.name as string,
      department_id: s.department_id as string,
      dept_name: (Array.isArray(s.departments) ? s.departments[0]?.name : s.departments?.name) as string | undefined,
    }))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    subjects = (subjectsRaw ?? []).map((s: any) => ({
      id: s.id as string,
      name: s.name as string,
      code: s.code as string,
      semester: s.semester as number,
      department_id: s.department_id as string,
      dept_name: (Array.isArray(s.departments) ? s.departments[0]?.name : s.departments?.name) as string | undefined,
    }))

    settings = (settingsRaw as unknown as AcademicSettings) ?? null
  } catch (err) {
    console.error('Error fetching upload page data:', err)
  }

  return (
    <UploadPageClient
      sections={sections}
      subjects={subjects}
      settings={settings}
    />
  )
}
