import { createAdminClient } from '@/lib/supabase/admin'

export interface AboutSpotlightData {
  imageUrl: string | null
  images?: string[]
  description: string
  updatedAt: string | null
  updatedBy?: string | null
}

const DEFAULT_SPOTLIGHT: AboutSpotlightData = {
  imageUrl: null,
  images: [],
  description: 'Welcome to Class Management! Stay tuned for the latest academic highlights, departmental announcements, and campus updates.',
  updatedAt: null,
}

export async function getSpotlightData(): Promise<AboutSpotlightData> {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin.storage
      .from('about-spotlight')
      .download('spotlight.json')

    if (error || !data) {
      return DEFAULT_SPOTLIGHT
    }

    const text = await data.text()
    const json = JSON.parse(text)

    // Normalize images list for backward compatibility
    let images: string[] = []
    if (Array.isArray(json.images)) {
      images = json.images.filter((img: unknown) => typeof img === 'string' && img.trim().length > 0)
    } else if (typeof json.imageUrl === 'string' && json.imageUrl.trim().length > 0) {
      images = [json.imageUrl.trim()]
    }

    return {
      imageUrl: images[0] ?? json.imageUrl ?? null,
      images,
      description: json.description ?? '',
      updatedAt: json.updatedAt ?? null,
      updatedBy: json.updatedBy ?? null,
    }
  } catch (err) {
    console.error('[Spotlight] Failed to read spotlight data:', err)
    return DEFAULT_SPOTLIGHT
  }
}
