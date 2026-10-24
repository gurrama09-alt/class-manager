import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth'
import { buildPresentationsZip } from '@/lib/zip'


export async function GET(req: NextRequest) {
  try {
    const user         = await requireRole(['super_admin', 'department_admin'])
    const academicYear = req.nextUrl.searchParams.get('academic_year') ?? '2024-25'
    const subjectId    = req.nextUrl.searchParams.get('subject_id')

    const admin = createAdminClient()

    if (user.role === 'department_admin' && subjectId) {
      const { data: sub } = await admin.from('subjects').select('department_id').eq('id', subjectId).single()
      if (!sub || sub.department_id !== user.department_id) {
        return NextResponse.json({ error: 'You can only export presentations for your own department.' }, { status: 403 })
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = admin
      .from('presentations')
      .select('*, subjects(id, name, code)')
      .eq('is_latest', true)
      .eq('academic_year', academicYear)

    if (user.role === 'department_admin') {
      query = query.eq('department_id', user.department_id)
    }

    if (subjectId) query = query.eq('subject_id', subjectId)

    const { data: presentations, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!presentations || presentations.length === 0) {
      return NextResponse.json({ error: 'No presentations found' }, { status: 404 })
    }

    const zipBuffer = await buildPresentationsZip(presentations)
    const filename = subjectId
      ? `${subjectId}_${academicYear}.zip`
      : `all_presentations_${academicYear}.zip`

    return new NextResponse(Buffer.from(zipBuffer) as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    console.error('[ZIP] Error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
