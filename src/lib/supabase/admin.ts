// ─────────────────────────────────────────────────────────────────────────────
// Supabase Admin Client — SERVICE ROLE KEY — NEVER import in client-side code!
// ─────────────────────────────────────────────────────────────────────────────
import { createClient } from '@supabase/supabase-js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let adminClient: ReturnType<typeof createClient<any>> | null = null

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createAdminClient(): ReturnType<typeof createClient<any>> {
  if (!adminClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !key) {
      throw new Error(
        'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
          'Set these in .env.local and in Vercel project settings.'
      )
    }

    adminClient = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }
  return adminClient
}
