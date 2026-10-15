import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth'
import { writeAuditLog } from '@/lib/audit'
import { AdminInviteSchema } from '@/lib/validators'


export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(['super_admin'])
    const body = await req.json()

    const parsed = AdminInviteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })
    }
    const { email, role, department_id } = parsed.data

    const admin = createAdminClient()

    // Check if already authorized
    const { data: existingRaw } = await admin
      .from('admin_authorizations')
      .select('id, status')
      .eq('email', email)
      .single()

    const existing = existingRaw as { id: string; status: string } | null

    let record
    if (existing && existing.status !== 'deactivated') {
      return NextResponse.json({ error: 'This email is already an active or invited administrator.' }, { status: 409 })
    } else if (existing) {
      const { data, error } = await admin
        .from('admin_authorizations')
        .update({ role, department_id: department_id ?? null, status: 'invited', invited_by: user.id, invited_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      record = data as { id: string }
    } else {
      const { data, error } = await admin
        .from('admin_authorizations')
        .insert({ email, role, department_id: department_id ?? null, invited_by: user.id, status: 'invited' })
        .select()
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      record = data as { id: string }
    }

    // Send Supabase magic-link invite
    const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { role, department_id: department_id ?? null },
    })
    if (inviteErr) console.warn('[Invite] Supabase invite warning:', inviteErr.message)

    await writeAuditLog({
      action: 'admin_invite',
      actor_id: user.id,
      actor_email: user.email,
      entity_type: 'admin_authorization',
      entity_id: record.id,
      entity_name: email,
      description: `Invited ${email} as ${role}`,
    })

    return NextResponse.json({ admin: record })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
