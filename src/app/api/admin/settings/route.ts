import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth'
import { writeAuditLog } from '@/lib/audit'
import { AcademicSettingsSchema } from '@/lib/validators'


export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(['super_admin'])
    const body = await req.json()

    const parsed = AcademicSettingsSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })
    }

    const admin = createAdminClient()
    // Upsert: get existing id first
    const { data: existingRaw } = await admin.from('academic_settings').select('id').single()
    const existing = existingRaw as { id: string } | null
    if (!existing) {
      return NextResponse.json({ error: 'Academic settings row not found. Run the migration SQL first.' }, { status: 500 })
    }

    const { error } = await admin.from('academic_settings').update({ ...parsed.data, updated_by: user.id }).eq('id', existing.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await writeAuditLog({ action: 'settings_update', actor_id: user.id, actor_email: user.email, description: 'Updated academic settings' })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
