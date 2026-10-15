import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth'
import { writeAuditLog } from '@/lib/audit'


export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(['super_admin'])
    const body = await req.json()
    const { name, code } = body
    if (!name || !code) return NextResponse.json({ error: 'Name and code are required' }, { status: 400 })

    const admin = createAdminClient()
    const { data, error } = await admin.from('departments').insert({ name, code: code.toUpperCase() }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    const dept = data as { id: string }
    await writeAuditLog({ action: 'structure_create', actor_id: user.id, actor_email: user.email, entity_type: 'department', entity_id: dept.id, entity_name: name, description: `Created department: ${name}` })
    return NextResponse.json({ department: data })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function GET() {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin.from('departments').select('*').order('name')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
