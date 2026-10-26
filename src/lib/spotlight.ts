import { createAdminClient } from '@/lib/supabase/admin'

export interface AboutSpotlightData {
  imageUrl: string | null
  images?: string[]
  description: string
  descriptions?: string[]
  updatedAt: string | null
  updatedBy?: string | null
}

const DEFAULT_SPOTLIGHT: AboutSpotlightData = {
  imageUrl: null,
  images: [],
  description: 'Welcome to Class Management! Stay tuned for the latest academic highlights, departmental announcements, and campus updates.',
  descriptions: [],
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

    // Normalize per-photo descriptions for backward compatibility
    let descriptions: string[] = []
    if (Array.isArray(json.descriptions)) {
      descriptions = json.descriptions.map((d: unknown) => (typeof d === 'string' ? d : ''))
    } else if (typeof json.description === 'string' && json.description.trim().length > 0 && images.length > 0) {
      // Legacy: single description becomes the first photo's description
      descriptions = [json.description.trim()]
    }
    // Ensure descriptions array matches images length
    while (descriptions.length < images.length) {
      descriptions.push('')
    }

    return {
      imageUrl: images[0] ?? json.imageUrl ?? null,
      images,
      description: json.description ?? '',
      descriptions,
      updatedAt: json.updatedAt ?? null,
      updatedBy: json.updatedBy ?? null,
    }
  } catch (err) {
    console.error('[Spotlight] Failed to read spotlight data:', err)
    return DEFAULT_SPOTLIGHT
  }
}

