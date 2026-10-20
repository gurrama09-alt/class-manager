import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth'
import { writeAuditLog } from '@/lib/audit'
import { AdminInviteSchema } from '@/lib/validators'

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(['super_admin', 'department_admin'])
    const body = await req.json()

    const parsed = AdminInviteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })
    }
    const { email: rawEmail, role, department_id } = parsed.data
    const email = rawEmail.trim().toLowerCase()

    const admin = createAdminClient()
    const origin = req.nextUrl.origin || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const redirectTo = `${origin}/auth/callback?next=/admin`

    // 1. Check or upsert in admin_authorizations table
    const { data: existingRaw } = await admin
      .from('admin_authorizations')
      .select('id, status')
      .eq('email', email)
      .maybeSingle()

    const existing = existingRaw as { id: string; status: string } | null

    let record: Record<string, unknown>
    if (existing) {
      const { data, error } = await admin
        .from('admin_authorizations')
        .update({
          role,
          department_id: department_id ?? null,
          status: 'active',
          invited_by: user.id,
          invited_at: new Date().toISOString(),
          activated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select('*, departments(id, name)')
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      record = data as Record<string, unknown>
    } else {
      const { data, error } = await admin
        .from('admin_authorizations')
        .insert({
          email,
          role,
          department_id: department_id ?? null,
          invited_by: user.id,
          status: 'active',
          activated_at: new Date().toISOString(),
        })
        .select('*, departments(id, name)')
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      record = data as Record<string, unknown>
    }

    // 2. Direct Admin Access: check if user already exists in user_profiles
    const { data: existingProfileRaw } = await admin
      .from('user_profiles')
      .select('id, email')
      .eq('email', email)
      .maybeSingle()

    const existingProfile = existingProfileRaw as { id: string; email: string } | null
    let magicLinkUrl: string | null = null

    if (existingProfile) {
      // User exists -> Update user_profiles directly so they have admin rights immediately
      await admin
        .from('user_profiles')
        .update({
          role,
          department_id: department_id ?? null,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingProfile.id)

      // Also update auth.users metadata
      try {
        await admin.auth.admin.updateUserById(existingProfile.id, {
          user_metadata: { role, department_id: department_id ?? null },
        })
      } catch (e) {
        console.warn('[Invite] Error updating auth user metadata:', e)
      }

      // Generate a magic link and send an email
      try {
        const linkRes = await admin.auth.admin.generateLink({
          type: 'magiclink',
          email,
          options: { redirectTo },
        })
        if (linkRes.data?.properties?.action_link) {
          magicLinkUrl = linkRes.data.properties.action_link
        }
      } catch (e) {
        console.warn('[Invite] generateLink warning:', e)
      }

      // Send email notification with OTP / magic link
      try {
        const anonClient = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        const { error: otpErr } = await anonClient.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: redirectTo,
            data: { role, department_id: department_id ?? null },
          },
        })
        if (otpErr) {
          console.warn('[Invite] signInWithOtp note:', otpErr.message)
        }
      } catch (e) {
        console.warn('[Invite] OTP email send failed:', e)
      }
    } else {
      // User does not exist in user_profiles -> Invite via Supabase Auth
      const inviteRes = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo,
        data: { role, department_id: department_id ?? null },
      })

      if (inviteRes.error) {
        console.warn('[Invite] Supabase invite warning:', inviteRes.error.message)
        // If they already exist in auth.users despite not in user_profiles
        try {
          const anonClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
          )
          await anonClient.auth.signInWithOtp({
            email,
            options: {
              emailRedirectTo: redirectTo,
              data: { role, department_id: department_id ?? null },
            },
          })
        } catch {}
      } else if (inviteRes.data?.user?.id) {
        // Immediately ensure user_profiles is created with active admin role
        await admin.from('user_profiles').upsert({
          id: inviteRes.data.user.id,
          email,
          full_name: email.split('@')[0],
          role,
          department_id: department_id ?? null,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
      }

      // Also try to generate direct action link for quick sharing
      try {
        const linkRes = await admin.auth.admin.generateLink({
          type: 'invite',
          email,
          options: { redirectTo },
        })
        if (linkRes.data?.properties?.action_link) {
          magicLinkUrl = linkRes.data.properties.action_link
        }
      } catch {}
    }

    await writeAuditLog({
      action: 'admin_invite',
      actor_id: user.id,
      actor_email: user.email,
      entity_type: 'admin_authorization',
      entity_id: String(record.id),
      entity_name: email,
      description: `Granted ${email} as ${role} with direct admin access`,
    })

    return NextResponse.json({
      success: true,
      admin: record,
      magicLink: magicLinkUrl,
      message: 'Admin access granted and email invitation sent successfully.',
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: message === 'UNAUTHORIZED' ? 401 : 403 })
  }
}
