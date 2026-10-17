// ─────────────────────────────────────────────────────────────────────────────
// Supabase Browser Client (safe for client components)
// ─────────────────────────────────────────────────────────────────────────────
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  if (!url || url.includes('placeholder')) {
    console.error(
      '[Supabase Client] NEXT_PUBLIC_SUPABASE_URL is missing or using placeholder! ' +
      'Please check your .env.local file and restart the Next.js dev server.'
    )
  }
  return createBrowserClient(url, key)
}
