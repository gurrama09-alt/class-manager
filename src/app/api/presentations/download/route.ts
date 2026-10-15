import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth'
import { writeAuditLog } from '@/lib/audit'


export async function GET(req: NextRequest) {
  try {
    const user = await requireRole(['super_admin', 'department_admin'])
    const id   = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const admin = createAdminClient()
    const { data: presRaw } = await admin.from('presentations').select('storage_path, file_name').eq('id', id).single()
    if (!presRaw) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const pres = presRaw as { storage_path: string; file_name: string }

    const { data: blob, error } = await admin.storage.from('presentations').download(pres.storage_path)
    if (error || !blob) return NextResponse.json({ error: 'Download failed' }, { status: 500 })

    await writeAuditLog({ action: 'presentation_download', actor_id: user.id, actor_email: user.email, entity_type: 'presentation', entity_id: id, entity_name: pres.file_name })

    const arrayBuffer = await blob.arrayBuffer()
    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${pres.file_name}"`,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
