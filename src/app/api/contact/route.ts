import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ContactSchema } from '@/lib/validators'


const rateMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 3
const WINDOW_MS  = 10 * 60 * 1000

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  const now = Date.now()

  const entry = rateMap.get(ip)
  if (entry && now < entry.resetAt) {
    if (entry.count >= RATE_LIMIT) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
    }
    entry.count++
  } else {
    rateMap.set(ip, { count: 1, resetAt: now + WINDOW_MS })
  }

  const body = await req.json()
  const parsed = ContactSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const { name, email, subject, message } = parsed.data
  const admin = createAdminClient()
  const { error } = await admin.from('contact_messages').insert({ name, email, subject, message, ip_address: ip })
  if (error) return NextResponse.json({ error: 'Failed to save message' }, { status: 500 })

  return NextResponse.json({ success: true })
}
