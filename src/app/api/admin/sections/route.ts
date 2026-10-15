import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth'
import { writeAuditLog } from '@/lib/audit'


export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(['super_admin'])
    const body = await req.json()
    const { department_id, name, code } = body
    if (!department_id || !name) return NextResponse.json({ error: 'Department and name required' }, { status: 400 })
    const admin = createAdminClient()
    const { data, error } = await admin.from('sections').insert({ department_id, name, code: code || null }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    const sec = data as { id: string }
    await writeAuditLog({ action: 'structure_create', actor_id: user.id, actor_email: user.email, entity_type: 'section', entity_id: sec.id, entity_name: name })
    return NextResponse.json({ section: data })
  } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
}
