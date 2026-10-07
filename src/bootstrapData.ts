import {
  createApiSyncBackend,
  hydrateApiSeed,
  shouldUseApiDataBackend,
  setDataBackend,
} from '@/lib/data'

/**
 * Switch the save/load layer to the VPS API when enabled.
 * Falls back to localStorage if the API is unreachable (dev / offline).
 */
export async function bootstrapDataBackend(): Promise<void> {
  if (!shouldUseApiDataBackend()) return

  try {
    const seed = await hydrateApiSeed()
    setDataBackend(createApiSyncBackend(seed))
  } catch (error) {
    console.warn(
      '[platform-data] API hydrate failed; using browser storage',
      error,
    )
  }
}
