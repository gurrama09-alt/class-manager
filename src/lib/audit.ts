// ─────────────────────────────────────────────────────────────────────────────
// Audit log writer — always called server-side
// ─────────────────────────────────────────────────────────────────────────────
import { createAdminClient } from '@/lib/supabase/admin'
import type { AuditAction } from '@/types/database'

interface AuditParams {
  action: AuditAction
  actor_id?: string | null
  actor_email?: string | null
  entity_type?: string | null
  entity_id?: string | null
  entity_name?: string | null
  department_id?: string | null
  description?: string | null
  metadata?: Record<string, unknown>
}

export async function writeAuditLog(params: AuditParams): Promise<void> {
  try {
    const admin = createAdminClient()
    await admin.from('audit_logs').insert({
      action: params.action,
      actor_id: params.actor_id ?? null,
      actor_email: params.actor_email ?? null,
      entity_type: params.entity_type ?? null,
      entity_id: params.entity_id ?? null,
      entity_name: params.entity_name ?? null,
      department_id: params.department_id ?? null,
      description: params.description ?? null,
      metadata: params.metadata ?? {},
    })
  } catch (err) {
    // Audit failures must not break the main operation — log to server console only
    console.error('[AuditLog] Failed to write audit log:', err)
  }
}
