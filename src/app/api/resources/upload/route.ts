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
    const formData = await req.formData()

    const seqRaw = parseInt(formData.get('sequence_number') as string)
    const semRaw = formData.get('semester') ? parseInt(formData.get('semester') as string) : null
    const unitRaw = formData.get('unit_number') ? parseInt(formData.get('unit_number') as string) : null

    const fieldData = {
      title:           (formData.get('title') as string)?.trim(),
      category:        (formData.get('category') as string)?.trim(),
      department_id:   (formData.get('department_id') as string)?.trim(),
      section_id:      (formData.get('section_id') as string)?.trim() || null,
      subject_id:      (formData.get('subject_id') as string)?.trim() || null,
      semester:        semRaw && !isNaN(semRaw) ? semRaw : null,
      unit_number:     unitRaw && !isNaN(unitRaw) ? unitRaw : null,
      sequence_number: isNaN(seqRaw) || seqRaw < 1 ? 1 : seqRaw,
      academic_year:   (formData.get('academic_year') as string)?.trim() || '2024-25',
      description:     (formData.get('description') as string)?.trim() || null,
    }

    const parsed = ResourceUploadSchema.safeParse(fieldData)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
    }

    if (user.role === 'department_admin' && user.department_id !== parsed.data.department_id) {
      return NextResponse.json({ error: 'You can only upload resources for your own department.' }, { status: 403 })
    }

    const file = formData.get('file') as File | null
    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'Please select a file to upload.' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: settingsRaw } = await supabase.from('academic_settings').select('max_resource_size_mb').single()
    const settings = settingsRaw as { max_resource_size_mb?: number } | null
    const maxMb = settings?.max_resource_size_mb ?? 50
    if (file.size > maxMb * 1024 * 1024) {
      return NextResponse.json({ error: `File exceeds the ${maxMb} MB limit.` }, { status: 400 })
    }

    const storagePath = generateStoragePath(
      'resources',
      `${parsed.data.department_id}/${parsed.data.category}`,
      sanitizeFilename(file.name)
    )

    const fileBuffer = await file.arrayBuffer()
    const { error: uploadError } = await admin.storage
      .from('resources')
      .upload(storagePath, fileBuffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      })

    if (uploadError) {
      console.error('[API Upload] Storage error:', uploadError)
      return NextResponse.json({ error: `File upload failed: ${uploadError.message}` }, { status: 500 })
    }

    const { data: record, error: dbError } = await admin
      .from('resources')
      .insert({
        ...parsed.data,
        file_name:    file.name,
        file_size:    file.size,
        file_type:    file.name.split('.').pop()?.toUpperCase() ?? 'FILE',
        storage_path: storagePath,
        uploaded_by:  user.id,
      })
      .select('*, departments(id,name), sections(id,name), subjects(id,name,code)')
      .single()

    if (dbError) {
      await admin.storage.from('resources').remove([storagePath])
      console.error('[API Upload] DB error:', dbError)
      return NextResponse.json({ error: `Database error: ${dbError.message}` }, { status: 500 })
    }

    await writeAuditLog({
      action: 'resource_upload',
      actor_id:     user.id,
      actor_email:  user.email,
      entity_type:  'resource',
      entity_id:    (record as { id: string }).id,
      entity_name:  parsed.data.title,
      department_id: parsed.data.department_id,
      description:  `Uploaded ${parsed.data.category}: ${parsed.data.title}`,
    })

    return NextResponse.json({ success: true, id: (record as { id: string }).id, resource: record })
  } catch (err: unknown) {
    console.error('[API Upload] Unexpected error:', err)
    const message = err instanceof Error ? err.message : 'Upload failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
