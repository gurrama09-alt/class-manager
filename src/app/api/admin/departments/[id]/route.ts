import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth'
import { writeAuditLog } from '@/lib/audit'


export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole(['super_admin'])
    const { id } = await params
    const body = await req.json()
    const admin = createAdminClient()
    const { data, error } = await admin.from('departments').update({ name: body.name, code: body.code?.toUpperCase() }).eq('id', id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    await writeAuditLog({ action: 'structure_edit', actor_id: user.id, actor_email: user.email, entity_type: 'department', entity_id: id, entity_name: body.name })
    return NextResponse.json({ department: data })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole(['super_admin'])
    const { id } = await params
    const admin = createAdminClient()
    const { error } = await admin.from('departments').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    await writeAuditLog({ action: 'structure_delete', actor_id: user.id, actor_email: user.email, entity_type: 'department', entity_id: id })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
