import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/auth'
import { writeAuditLog } from '@/lib/audit'
import { getSpotlightData, type AboutSpotlightData } from '@/lib/spotlight'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const data = await getSpotlightData()
    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error('[Spotlight GET] Error:', err)
    return NextResponse.json({ error: 'Failed to fetch spotlight data' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (user?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized: Only Super Admins can edit the spotlight.' }, { status: 403 })
    }

    const formData = await req.formData()
    const description = (formData.get('description') as string | null) ?? ''
    const removeImage = formData.get('removeImage') === 'true'
    const existingImagesRaw = formData.get('existingImages') as string | null
    const photoManifestRaw = formData.get('photoManifest') as string | null

    // Collect all uploaded files
    const incomingFiles: File[] = []
    const allFiles = formData.getAll('files')
    for (const item of allFiles) {
      if (item instanceof File && item.size > 0) {
        incomingFiles.push(item)
      }
    }
    const singleFile = formData.get('file')
    if (incomingFiles.length === 0 && singleFile instanceof File && singleFile.size > 0) {
      incomingFiles.push(singleFile)
    }

    const admin = createAdminClient()

    // Ensure bucket exists
    try {
      await admin.storage.createBucket('about-spotlight', { public: true })
    } catch {
      // Bucket might already exist
    }

    // Get current spotlight data
    const current = await getSpotlightData()
    const currentImages = current.images && current.images.length > 0
      ? current.images
      : (current.imageUrl ? [current.imageUrl] : [])

    // Validate incoming files
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
    for (const file of incomingFiles) {
      if (!allowedMimes.includes(file.type)) {
        return NextResponse.json(
          { error: `File "${file.name}" has an invalid type. Only JPEG, PNG, WebP, GIF, SVG are allowed.` },
          { status: 400 }
        )
      }
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { error: `File "${file.name}" exceeds the 10 MB size limit.` },
          { status: 400 }
        )
      }
    }

    // Upload newly provided files
    const uploadedUrls: string[] = []
    for (let i = 0; i < incomingFiles.length; i++) {
      const file = incomingFiles[i]
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const fileName = `spotlight-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}.${ext}`
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      const { error: uploadError } = await admin.storage
        .from('about-spotlight')
        .upload(fileName, buffer, {
          contentType: file.type || 'image/jpeg',
          upsert: true,
        })

      if (uploadError) {
        console.error('[Spotlight Upload] Error:', uploadError)
        return NextResponse.json({ error: `Failed to upload image: ${uploadError.message}` }, { status: 500 })
      }

      const { data: pubUrlData } = admin.storage
        .from('about-spotlight')
        .getPublicUrl(fileName)

      uploadedUrls.push(pubUrlData.publicUrl)
    }

    // Build the final list of images
    let finalImages: string[] = []

    if (photoManifestRaw) {
      try {
        const manifest = JSON.parse(photoManifestRaw) as Array<
          | { type: 'existing'; url: string }
          | { type: 'new'; fileIndex: number }
        >
        for (const item of manifest) {
          if (item.type === 'existing' && typeof item.url === 'string') {
            finalImages.push(item.url)
          } else if (item.type === 'new' && typeof item.fileIndex === 'number' && uploadedUrls[item.fileIndex]) {
            finalImages.push(uploadedUrls[item.fileIndex])
          }
        }
      } catch (e) {
        console.warn('[Spotlight] Failed to parse photoManifest:', e)
      }
    } else if (existingImagesRaw !== null) {
      try {
        const parsed = JSON.parse(existingImagesRaw)
        if (Array.isArray(parsed)) {
          finalImages = parsed.filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
        }
      } catch {
        finalImages = []
      }
      finalImages.push(...uploadedUrls)
    } else if (removeImage) {
      finalImages = [...uploadedUrls]
    } else {
      finalImages = [...currentImages, ...uploadedUrls]
    }

    const updatedData: AboutSpotlightData = {
      imageUrl: finalImages[0] ?? null,
      images: finalImages,
      description: description.trim(),
      updatedAt: new Date().toISOString(),
      updatedBy: user.email,
    }

    const { error: saveError } = await admin.storage
      .from('about-spotlight')
      .upload('spotlight.json', JSON.stringify(updatedData, null, 2), {
        contentType: 'application/json',
        upsert: true,
      })

    if (saveError) {
      console.error('[Spotlight Save] Error:', saveError)
      return NextResponse.json({ error: `Failed to save spotlight details: ${saveError.message}` }, { status: 500 })
    }

    if (user) {
      await writeAuditLog({
        action: 'settings_update',
        actor_id: user.id,
        actor_email: user.email,
        description: `Updated About Spotlight (${finalImages.length} photo${finalImages.length === 1 ? '' : 's'}) and description`,
      })
    }

    return NextResponse.json({ success: true, data: updatedData })
  } catch (err) {
    console.error('[Spotlight POST] Error:', err)
    return NextResponse.json({ error: 'Internal server error while updating spotlight.' }, { status: 500 })
  }
}
