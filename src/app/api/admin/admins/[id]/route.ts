import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth'
import { writeAuditLog } from '@/lib/audit'


export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole(['super_admin'])
    const { id } = await params
    const admin = createAdminClient()

    const { data: recordRaw } = await admin.from('admin_authorizations').select('role, email').eq('id', id).single()
    const record = recordRaw as { role: string; email: string } | null
    if (record?.role === 'super_admin') {
      const { count } = await admin.from('admin_authorizations').select('*', { count: 'exact', head: true }).eq('role', 'super_admin').eq('status', 'active')
      if ((count ?? 0) <= 1) {
        return NextResponse.json({ error: 'Cannot remove the last active super admin.' }, { status: 400 })
      }
    }

    await admin.from('admin_authorizations').delete().eq('id', id)
    await writeAuditLog({ action: 'admin_remove', actor_id: user.id, actor_email: user.email, entity_type: 'admin_authorization', entity_id: id, entity_name: record?.email })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
