// ─────────────────────────────────────────────────────────────────────────────
// ZIP archive builder using JSZip
// ─────────────────────────────────────────────────────────────────────────────
import JSZip from 'jszip'
import { downloadStorageFile } from '@/lib/storage'
import type { Presentation } from '@/types/database'

/**
 * Build a ZIP archive of presentations organized by subject folder.
 * Returns a Buffer containing the ZIP file.
 */
export async function buildPresentationsZip(
  presentations: (Presentation & { subject?: { name: string } | null })[],
  bucket: string = 'presentations'
): Promise<Buffer> {
  const zip = new JSZip()
  const filenameCounts: Record<string, number> = {}

  for (const pres of presentations) {
    const subjectName = pres.subject?.name ?? 'Unknown_Subject'
    const folder = zip.folder(subjectName) ?? zip

    // Build a safe filename: RollNo_StudentName.ext
    const ext = pres.file_name.split('.').pop() ?? 'pptx'
    const baseName = `${pres.roll_number}_${pres.student_name.replace(/[^a-zA-Z0-9]/g, '_')}`
    const key = `${subjectName}/${baseName}`
    filenameCounts[key] = (filenameCounts[key] ?? 0) + 1
    const suffix = filenameCounts[key] > 1 ? `_${filenameCounts[key]}` : ''
    const finalName = `${baseName}${suffix}.${ext}`

    try {
      const blob = await downloadStorageFile(bucket, pres.storage_path)
      const buffer = await blob.arrayBuffer()
      folder.file(finalName, buffer)
    } catch (err) {
      console.error(`[ZIP] Skipping ${pres.storage_path}:`, err)
      // Add a placeholder note so the admin knows the file was missing
      folder.file(`${baseName}_MISSING.txt`, `File could not be retrieved: ${pres.storage_path}`)
    }
  }

  const arrayBuffer = await zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE' })
  return Buffer.from(arrayBuffer)
}
