// ─────────────────────────────────────────────────────────────────────────────
// Storage helpers — signed URL generation, upload helpers
// ─────────────────────────────────────────────────────────────────────────────
import { createAdminClient } from '@/lib/supabase/admin'

const SIGNED_URL_EXPIRY = 60 // seconds

export async function createSignedDownloadUrl(
  bucket: string,
  path: string,
  expiresIn: number = SIGNED_URL_EXPIRY
): Promise<string> {
  const admin = createAdminClient()
  const { data, error } = await admin.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn)

  if (error || !data?.signedUrl) {
    throw new Error(`Failed to create signed URL: ${error?.message}`)
  }
  return data.signedUrl
}

export async function deleteStorageFile(bucket: string, path: string): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin.storage.from(bucket).remove([path])
  if (error) {
    console.error(`[Storage] Failed to delete ${bucket}/${path}:`, error.message)
  }
}

export async function downloadStorageFile(
  bucket: string,
  path: string
): Promise<Blob> {
  const admin = createAdminClient()
  const { data, error } = await admin.storage.from(bucket).download(path)
  if (error || !data) {
    throw new Error(`Failed to download file: ${error?.message}`)
  }
  return data
}
