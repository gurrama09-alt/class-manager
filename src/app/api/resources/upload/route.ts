import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth'
import { writeAuditLog } from '@/lib/audit'
import { ResourceUploadSchema } from '@/lib/validators'
import { generateStoragePath, sanitizeFilename } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    let user
    try {
      user = await requireRole(['super_admin', 'department_admin'])
    } catch (authErr) {
      const msg = authErr instanceof Error ? authErr.message : ''
      if (msg === 'UNAUTHORIZED') {
        return NextResponse.json({ error: 'Please sign in to upload resources.' }, { status: 401 })
      }
      return NextResponse.json({ error: 'Admin access required to upload resources.' }, { status: 403 })
    }

    const admin = createAdminClient()
    const body = await req.json().catch(() => ({}))

    // STEP 1: Get signed upload URL for direct-to-storage upload
    if (body.action === 'get_upload_url') {
      const { filename, category, department_id, fileSize } = body
      if (!filename || !category || !department_id) {
        return NextResponse.json({ error: 'Missing required upload parameters' }, { status: 400 })
      }

      if (user.role === 'department_admin' && user.department_id !== department_id) {
        return NextResponse.json({ error: 'You can only upload resources for your own department.' }, { status: 403 })
      }

      const supabase = await createClient()
      const { data: settingsRaw } = await supabase.from('academic_settings').select('max_resource_size_mb').single()
      const settings = settingsRaw as { max_resource_size_mb?: number } | null
      const maxMb = settings?.max_resource_size_mb ?? 50
      if (fileSize && fileSize > maxMb * 1024 * 1024) {
        return NextResponse.json({ error: `File exceeds the ${maxMb} MB limit.` }, { status: 400 })
      }

      const safeName = sanitizeFilename(filename)
      const storagePath = generateStoragePath('resources', `${department_id}/${category}`, safeName)

      const { data: signData, error: signError } = await admin.storage
        .from('resources')
        .createSignedUploadUrl(storagePath)

      if (signError || !signData) {
        console.error('[Upload] createSignedUploadUrl error:', signError)
        return NextResponse.json({ error: signError?.message ?? 'Failed to create upload authorization' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        path: signData.path,
        token: signData.token,
        signedUrl: signData.signedUrl,
        storagePath,
      })
    }

    // STEP 2: Save metadata after direct upload succeeds
    if (body.action === 'complete') {
      const { resourceData, file_name, file_size, storage_path } = body
      if (!resourceData || !file_name || !storage_path) {
        return NextResponse.json({ error: 'Missing resource metadata' }, { status: 400 })
      }

      const parsed = ResourceUploadSchema.safeParse(resourceData)
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
      }

      if (user.role === 'department_admin' && user.department_id !== parsed.data.department_id) {
        return NextResponse.json({ error: 'You can only upload resources for your own department.' }, { status: 403 })
      }

      const { data: record, error: dbError } = await admin
        .from('resources')
        .insert({
          ...parsed.data,
          file_name,
          file_size: file_size ?? 0,
          file_type: file_name.split('.').pop()?.toUpperCase() ?? 'FILE',
          storage_path,
          uploaded_by: user.id,
        })
        .select('*, departments(id,name), sections(id,name), subjects(id,name,code)')
        .single()

      if (dbError) {
        console.error('[Upload] Database error:', dbError)
        await admin.storage.from('resources').remove([storage_path])
        return NextResponse.json({ error: `Database error: ${dbError.message}` }, { status: 500 })
      }

      await writeAuditLog({
        action: 'resource_upload',
        actor_id: user.id,
        actor_email: user.email,
        entity_type: 'resource',
        entity_id: (record as { id: string }).id,
        entity_name: parsed.data.title,
        department_id: parsed.data.department_id,
        description: `Uploaded ${parsed.data.category}: ${parsed.data.title}`,
      })

      return NextResponse.json({ success: true, id: (record as { id: string }).id, resource: record })
    }

    return NextResponse.json({ error: 'Invalid request action' }, { status: 400 })
  } catch (err: unknown) {
    console.error('[Upload API] Error:', err)
    const msg = err instanceof Error ? err.message : 'Upload failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
