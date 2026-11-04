import { getAccessToken } from '@/lib/authApi'
import {
  createApiSyncBackend,
  hydrateApiSeed,
  shouldUseApiDataBackend,
} from '@/lib/data/apiSyncBackend'
import { setDataBackend } from '@/lib/data/backend'

/**
 * After login (or on boot when a session token already exists), reload
 * tenant-scoped KV into the sync backend.
 *
 * Swaps the backend atomically after the fetch completes. Clearing first and
 * emitting `pd-data-rehydrated` emptied every store mid-navigation (e.g.
 * People sync on agency open) and bounced platform admin out of the agency.
 * Callers that need an empty cache before an identity switch (Support Mode)
 * already clear explicitly in AuthProvider.
 */
export async function rehydratePlatformData(): Promise<boolean> {
  if (!shouldUseApiDataBackend()) return false
  if (!getAccessToken()) return false
  try {
    const seed = await hydrateApiSeed()
    setDataBackend(createApiSyncBackend(seed))
    window.dispatchEvent(new Event('pd-data-rehydrated'))
    return true
  } catch (error) {
    console.warn('[platform-data] rehydrate failed', error)
    return false
  }
}
