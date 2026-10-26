import { createAdminClient } from '@/lib/supabase/admin'

export interface AboutSpotlightData {
  imageUrl: string | null
  description: string
  updatedAt: string | null
  updatedBy?: string | null
}

const DEFAULT_SPOTLIGHT: AboutSpotlightData = {
  imageUrl: null,
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
    return {
      imageUrl: json.imageUrl ?? null,
      description: json.description ?? '',
      updatedAt: json.updatedAt ?? null,
      updatedBy: json.updatedBy ?? null,
    }
  } catch (err) {
    console.error('[Spotlight] Failed to read spotlight data:', err)
    return DEFAULT_SPOTLIGHT
  }
}
