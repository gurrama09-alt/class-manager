import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth'
import { writeAuditLog } from '@/lib/audit'


export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string; action: string }> }) {
  try {
    const user = await requireRole(['super_admin'])
    const { id, action } = await params
    const newStatus = action === 'activate' ? 'active' : 'deactivated'
    const auditAction = action === 'activate' ? 'admin_activate' : 'admin_deactivate'

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('admin_authorizations')
      .update({ status: newStatus })
      .eq('id', id)
      .select('email')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    const rec = data as { email: string }

    await writeAuditLog({ action: auditAction, actor_id: user.id, actor_email: user.email, entity_type: 'admin_authorization', entity_id: id, entity_name: rec.email })
    return NextResponse.json({ success: true, status: newStatus })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
