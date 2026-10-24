import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth'
import { writeAuditLog } from '@/lib/audit'


export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(['super_admin', 'department_admin'])
    const body = await req.json()
    const { department_id, name, code, semester, is_active } = body
    if (!department_id || !name || !code) return NextResponse.json({ error: 'Department, name, and code required' }, { status: 400 })
    if (user.role === 'department_admin' && user.department_id !== department_id) {
      return NextResponse.json({ error: 'You can only manage subjects for your own department.' }, { status: 403 })
    }
    const admin = createAdminClient()
    const { data, error } = await admin.from('subjects').insert({ department_id, name, code: code.toUpperCase(), semester: semester ?? 1, is_active: is_active ?? true }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    const sub = data as { id: string }
    await writeAuditLog({ action: 'structure_create', actor_id: user.id, actor_email: user.email, entity_type: 'subject', entity_id: sub.id, entity_name: name })
    return NextResponse.json({ subject: data })
  } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
}
