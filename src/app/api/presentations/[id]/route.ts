import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth'
import { deleteStorageFile } from '@/lib/storage'
import { writeAuditLog } from '@/lib/audit'


export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole(['super_admin', 'department_admin'])
    const { id } = await params
    const admin = createAdminClient()

    const { data: presRaw } = await admin.from('presentations').select('storage_path, file_name, department_id').eq('id', id).single()
    if (!presRaw) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const pres = presRaw as { storage_path: string; file_name: string; department_id: string | null }

    if (user.role === 'department_admin' && pres.department_id !== user.department_id) {
      return NextResponse.json({ error: 'You can only delete presentations for your own department.' }, { status: 403 })
    }

    await admin.from('presentations').delete().eq('id', id)
    await deleteStorageFile('presentations', pres.storage_path)

    await writeAuditLog({
      action: 'presentation_delete',
      actor_id: user.id, actor_email: user.email,
      entity_type: 'presentation', entity_id: id, entity_name: pres.file_name,
      department_id: pres.department_id ?? undefined,
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
