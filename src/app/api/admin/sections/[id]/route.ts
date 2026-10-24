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
      const { data: secRaw } = await admin.from('sections').select('department_id').eq('id', id).single()
      const sec = secRaw as { department_id: string } | null
      if (!sec || sec.department_id !== user.department_id || (body.department_id && body.department_id !== user.department_id)) {
        return NextResponse.json({ error: 'You can only edit sections for your own department.' }, { status: 403 })
      }
    }

    const { data, error } = await admin.from('sections').update({ name: body.name, code: body.code || null, department_id: body.department_id }).eq('id', id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    await writeAuditLog({ action: 'structure_edit', actor_id: user.id, actor_email: user.email, entity_type: 'section', entity_id: id, entity_name: body.name })
    return NextResponse.json({ section: data })
  } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole(['super_admin', 'department_admin'])
    const { id } = await params
    const admin = createAdminClient()

    if (user.role === 'department_admin') {
      const { data: secRaw } = await admin.from('sections').select('department_id').eq('id', id).single()
      const sec = secRaw as { department_id: string } | null
      if (!sec || sec.department_id !== user.department_id) {
        return NextResponse.json({ error: 'You can only delete sections for your own department.' }, { status: 403 })
      }
    }

    const { error } = await admin.from('sections').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    await writeAuditLog({ action: 'structure_delete', actor_id: user.id, actor_email: user.email, entity_type: 'section', entity_id: id })
    return NextResponse.json({ success: true })
  } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
}
