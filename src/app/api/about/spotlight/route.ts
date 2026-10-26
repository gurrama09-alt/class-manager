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
    const file = formData.get('file') as File | null

    const admin = createAdminClient()

    // Ensure bucket exists
    try {
      await admin.storage.createBucket('about-spotlight', { public: true })
    } catch {
      // Bucket might already exist
    }

    // Get current spotlight data
    const current = await getSpotlightData()
    let imageUrl = current.imageUrl

    if (removeImage) {
      imageUrl = null
    }

    if (file && file.size > 0) {
      const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
      if (!allowedMimes.includes(file.type)) {
        return NextResponse.json({ error: 'Only image files (JPEG, PNG, WebP, GIF, SVG) are allowed.' }, { status: 400 })
      }

      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: 'Image exceeds the 10 MB size limit.' }, { status: 400 })
      }

      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const fileName = `spotlight-${Date.now()}.${ext}`
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

      imageUrl = pubUrlData.publicUrl
    }

    const updatedData: AboutSpotlightData = {
      imageUrl,
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
        description: 'Updated About Spotlight photo and description',
      })
    }

    return NextResponse.json({ success: true, data: updatedData })
  } catch (err) {
    console.error('[Spotlight POST] Error:', err)
    return NextResponse.json({ error: 'Internal server error while updating spotlight.' }, { status: 500 })
  }
}
