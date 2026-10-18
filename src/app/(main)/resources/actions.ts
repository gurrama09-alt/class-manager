'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth'
import { writeAuditLog } from '@/lib/audit'
import { createSignedDownloadUrl, deleteStorageFile } from '@/lib/storage'
import { ResourceUploadSchema } from '@/lib/validators'
import { generateStoragePath, sanitizeFilename } from '@/lib/utils'

// ─── Upload Resource ──────────────────────────────────────────────────────────
export async function uploadResource(formData: FormData) {
  try {
    let user
    try {
      user = await requireRole(['super_admin', 'department_admin'])
    } catch (authErr) {
      const msg = authErr instanceof Error ? authErr.message : ''
      if (msg === 'UNAUTHORIZED') {
        return { success: false, error: 'You are not logged in. Please sign in as an admin.' }
      }
      return { success: false, error: 'You do not have permission to upload resources (Admin access required).' }
    }

    const admin = createAdminClient()

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
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
    }

    if (user.role === 'department_admin' && user.department_id !== parsed.data.department_id) {
      return { success: false, error: 'You can only upload resources for your own department.' }
    }

    const file = formData.get('file') as File | null
    if (!file || file.size === 0) return { success: false, error: 'Please select a file.' }

    const supabase = await createClient()
    const { data: settingsRaw } = await supabase.from('academic_settings').select('max_resource_size_mb').single()
    const settings = settingsRaw as { max_resource_size_mb?: number } | null
    const maxMb = settings?.max_resource_size_mb ?? 50
    if (file.size > maxMb * 1024 * 1024) {
      return { success: false, error: `File exceeds the ${maxMb} MB limit.` }
    }

    const storagePath = generateStoragePath(
      'resources',
      `${parsed.data.department_id}/${parsed.data.category}`,
      sanitizeFilename(file.name)
    )

    const fileBuffer = await file.arrayBuffer()
    const { error: uploadError } = await admin.storage
      .from('resources')
      .upload(storagePath, fileBuffer, { contentType: file.type || 'application/octet-stream', upsert: false })

    if (uploadError) {
      console.error('[Upload] Storage error:', uploadError)
      return { success: false, error: `File upload failed: ${uploadError.message}` }
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
      console.error('[Upload] DB error:', dbError)
      return { success: false, error: `Failed to save resource: ${dbError.message}` }
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

    return { success: true, id: (record as { id: string }).id, resource: record }
  } catch (err: unknown) {
    console.error('[Upload] Unexpected error:', err)
    const message = err instanceof Error ? err.message : 'Upload failed'
    return { success: false, error: message }
  }
}

// ─── Delete Resource ──────────────────────────────────────────────────────────
export async function deleteResource(resourceId: string) {
  const user = await requireRole(['super_admin', 'department_admin'])
  const admin = createAdminClient()

  const { data: resourceRaw } = await admin
    .from('resources')
    .select('id, title, storage_path, department_id, category')
    .eq('id', resourceId)
    .single()

  if (!resourceRaw) return { success: false, error: 'Resource not found.' }
  const resource = resourceRaw as { id: string; title: string; storage_path: string; department_id: string | null; category: string }

  if (user.role === 'department_admin' && user.department_id !== resource.department_id) {
    return { success: false, error: 'Unauthorized' }
  }

  await admin.from('resources').delete().eq('id', resourceId)
  await deleteStorageFile('resources', resource.storage_path)

  await writeAuditLog({
    action: 'resource_delete',
    actor_id:     user.id,
    actor_email:  user.email,
    entity_type:  'resource',
    entity_id:    resourceId,
    entity_name:  resource.title,
    department_id: resource.department_id ?? undefined,
    description:  `Deleted ${resource.category}: ${resource.title}`,
  })

  return { success: true }
}

// ─── Get Signed Download URL ──────────────────────────────────────────────────
export async function getResourceDownloadUrl(resourceId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { data: resourceRaw } = await supabase
    .from('resources')
    .select('storage_path, file_name')
    .eq('id', resourceId)
    .single()

  if (!resourceRaw) return { success: false, error: 'Resource not found.' }
  const resource = resourceRaw as { storage_path: string; file_name: string }

  const url = await createSignedDownloadUrl('resources', resource.storage_path, 60)
  return { success: true, url, filename: resource.file_name }
}

// ─── Update Resource Sequence ─────────────────────────────────────────────────
export async function updateResourceSequence(resourceId: string, direction: 'up' | 'down') {
  const user = await requireRole(['super_admin', 'department_admin'])
  const admin = createAdminClient()

  const { data: resourceRaw } = await admin
    .from('resources')
    .select('id, sequence_number, department_id, category')
    .eq('id', resourceId)
    .single()

  if (!resourceRaw) return { success: false, error: 'Resource not found.' }
  const resource = resourceRaw as { id: string; sequence_number: number; department_id: string; category: string }

  const targetSeq = direction === 'up' ? resource.sequence_number - 1 : resource.sequence_number + 1

  const { data: siblingRaw } = await admin
    .from('resources')
    .select('id, sequence_number')
    .eq('department_id', resource.department_id)
    .eq('category', resource.category)
    .eq('sequence_number', targetSeq)
    .single()

  if (!siblingRaw) return { success: false, error: 'Cannot move further in that direction.' }
  const sibling = siblingRaw as { id: string; sequence_number: number }

  await admin.from('resources').update({ sequence_number: sibling.sequence_number }).eq('id', resourceId)
  await admin.from('resources').update({ sequence_number: resource.sequence_number }).eq('id', sibling.id)

  return { success: true }
}
