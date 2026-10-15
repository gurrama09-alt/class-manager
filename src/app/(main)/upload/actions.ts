'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { writeAuditLog } from '@/lib/audit'
import { PresentationSubmitSchema } from '@/lib/validators'
import { generateStoragePath, sanitizeFilename } from '@/lib/utils'

interface SubmitResult {
  success: boolean
  error?: string
  id?: string
}

export async function submitPresentation(formData: FormData): Promise<SubmitResult> {
  const supabase = await createClient()
  const admin    = createAdminClient()

  // Verify user is authenticated
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'You must be signed in to submit.' }

  // Parse form fields
  const roll_number = parseInt(formData.get('roll_number') as string)
  const parsed = PresentationSubmitSchema.safeParse({
    student_name: formData.get('student_name'),
    roll_number: isNaN(roll_number) ? undefined : roll_number,
    section_id:  formData.get('section_id'),
    subject_id:  formData.get('subject_id'),
    academic_year: formData.get('academic_year'),
  })
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  // Validate file
  const file = formData.get('file') as File | null
  if (!file || file.size === 0) return { success: false, error: 'Please select a PowerPoint file.' }

  const allowedTypes = [
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ]
  if (!allowedTypes.includes(file.type)) {
    return { success: false, error: 'Only .ppt and .pptx files are allowed.' }
  }

  // Get settings for size limit
  const { data: settings } = await supabase.from('academic_settings').select('*').single()
  const maxMb = (settings as { max_ppt_size_mb?: number } | null)?.max_ppt_size_mb ?? 100
  if (file.size > maxMb * 1024 * 1024) {
    return { success: false, error: `File exceeds the ${maxMb} MB limit.` }
  }

  const { student_name, roll_number: rollNum, section_id, subject_id, academic_year } = parsed.data

  // Verify section and subject exist
  const [sectionRes, subjectRes] = await Promise.all([
    supabase.from('sections').select('id, department_id').eq('id', section_id).single(),
    supabase.from('subjects').select('id, department_id').eq('id', subject_id).single(),
  ])
  if (sectionRes.error) return { success: false, error: 'Invalid section selected.' }
  if (subjectRes.error) return { success: false, error: 'Invalid subject selected.' }

  const allowResubmission = (settings as { allow_resubmission?: boolean } | null)?.allow_resubmission ?? false

  // Check for duplicate (only if resubmission is disabled)
  if (!allowResubmission) {
    const { data: existing } = await supabase
      .from('presentations')
      .select('id')
      .eq('roll_number', rollNum)
      .eq('subject_id', subject_id)
      .eq('academic_year', academic_year)
      .eq('is_latest', true)
      .single()
    if (existing) {
      return { success: false, error: 'You have already submitted for this subject. Resubmission is currently disabled.' }
    }
  }

  // Upload file to Supabase Storage
  const safeFilename = sanitizeFilename(file.name)
  const storagePath = generateStoragePath(
    'presentations',
    `${academic_year}/${subject_id}`,
    `${rollNum}_${student_name}_${safeFilename}`
  )

  const fileBuffer = await file.arrayBuffer()
  const { error: uploadError } = await admin.storage
    .from('presentations')
    .upload(storagePath, fileBuffer, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    console.error('[Upload] Storage error:', uploadError)
    return { success: false, error: 'File upload failed. Please try again.' }
  }

  // If resubmission allowed, mark old submissions as not latest
  if (allowResubmission) {
    await admin
      .from('presentations')
      .update({ is_latest: false })
      .eq('roll_number', rollNum)
      .eq('subject_id', subject_id)
      .eq('academic_year', academic_year)
  }

  // Save metadata to database
  const { data: record, error: dbError } = await admin
    .from('presentations')
    .insert({
      student_name,
      roll_number: rollNum,
      section_id,
      subject_id,
      department_id: (subjectRes.data as { department_id: string }).department_id,
      academic_year,
      file_name: file.name,
      file_size: file.size,
      storage_path: storagePath,
      is_latest: true,
      submitted_by: user.id,
    })
    .select('id')
    .single()

  if (dbError) {
    // Roll back storage upload
    await admin.storage.from('presentations').remove([storagePath])
    console.error('[Upload] DB error:', dbError)
    return { success: false, error: 'Failed to save submission. Please try again.' }
  }

  // Write audit log
  await writeAuditLog({
    action: 'presentation_submit',
    actor_id: user.id,
    actor_email: user.email,
    entity_type: 'presentation',
    entity_id: (record as { id: string }).id,
    entity_name: `${student_name} - Roll ${rollNum}`,
    department_id: (subjectRes.data as { department_id: string }).department_id,
    description: `Submitted presentation for subject ${subject_id}`,
  })

  return { success: true, id: (record as { id: string }).id }
}
