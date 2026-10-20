import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/upload"

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {}
          },
        },
      }
    )
    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && sessionData?.user) {
      const email = sessionData.user.email?.toLowerCase()
      if (email) {
        try {
          const admin = createAdminClient()
          const { data: authRecord } = await admin
            .from('admin_authorizations')
            .select('*')
            .eq('email', email)
            .maybeSingle()

          if (authRecord && authRecord.status !== 'deactivated') {
            await admin
              .from('user_profiles')
              .upsert({
                id: sessionData.user.id,
                email: email,
                full_name: (sessionData.user.user_metadata?.full_name as string) || email.split('@')[0],
                role: authRecord.role,
                department_id: authRecord.department_id,
                is_active: true,
                updated_at: new Date().toISOString(),
              })

            await admin
              .from('admin_authorizations')
              .update({ status: 'active', activated_at: new Date().toISOString() })
              .eq('id', authRecord.id)

            return NextResponse.redirect(`${origin}/admin`)
          }
        } catch (e) {
          console.warn('[Auth Callback] Admin sync warning:', e)
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
