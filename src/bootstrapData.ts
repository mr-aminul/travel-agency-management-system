import {
  createApiSyncBackend,
  shouldUseApiDataBackend,
  setDataBackend,
} from '@/lib/data'
import { getAccessToken } from '@/lib/authApi'
import { rehydratePlatformData } from '@/lib/data/rehydrate'

/**
 * Switch the save/load layer to the VPS API when enabled.
 * Hydrate only when a session token exists (KV requires auth).
 * Falls back to empty API sync / localStorage if unreachable.
 */
export async function bootstrapDataBackend(): Promise<void> {
  if (!shouldUseApiDataBackend()) return

  if (!getAccessToken()) {
    // API mode without session: memory backend that will sync after login.
    setDataBackend(createApiSyncBackend({}))
    return
  }

  const ok = await rehydratePlatformData()
  if (!ok) {
    console.warn(
      '[platform-data] API hydrate failed; using empty sync backend',
    )
    setDataBackend(createApiSyncBackend({}))
  }
}
