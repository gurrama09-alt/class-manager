import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth'
import { writeAuditLog } from '@/lib/audit'


export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole(['super_admin', 'department_admin'])
    const { id } = await params
    const body = await req.json()
    const admin = createAdminClient()

    if (user.role === 'department_admin') {
      const { data: subRaw } = await admin.from('subjects').select('department_id').eq('id', id).single()
      const sub = subRaw as { department_id: string } | null
      if (!sub || sub.department_id !== user.department_id || (body.department_id && body.department_id !== user.department_id)) {
        return NextResponse.json({ error: 'You can only edit subjects for your own department.' }, { status: 403 })
      }
    }

    const { data, error } = await admin.from('subjects').update({ name: body.name, code: body.code?.toUpperCase(), semester: body.semester, department_id: body.department_id, is_active: body.is_active }).eq('id', id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    await writeAuditLog({ action: 'structure_edit', actor_id: user.id, actor_email: user.email, entity_type: 'subject', entity_id: id, entity_name: body.name })
    return NextResponse.json({ subject: data })
  } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole(['super_admin', 'department_admin'])
    const { id } = await params
    const admin = createAdminClient()

    if (user.role === 'department_admin') {
      const { data: subRaw } = await admin.from('subjects').select('department_id').eq('id', id).single()
      const sub = subRaw as { department_id: string } | null
      if (!sub || sub.department_id !== user.department_id) {
        return NextResponse.json({ error: 'You can only delete subjects for your own department.' }, { status: 403 })
      }
    }

    const { error } = await admin.from('subjects').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    await writeAuditLog({ action: 'structure_delete', actor_id: user.id, actor_email: user.email, entity_type: 'subject', entity_id: id })
    return NextResponse.json({ success: true })
  } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
}
