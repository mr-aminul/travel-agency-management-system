import { shouldUseApiDataBackend } from '@/lib/data/apiSyncBackend'

/**
 * Client-side seed arrays are for offline / unit tests only.
 * When the live platform API is on, all agency data comes from Postgres
 * (launch bootstrap + user writes) — never inject ephemeral demo rows.
 */
export function injectClientSideSeeds(): boolean {
  // Vitest loads .env (often VITE_USE_PLATFORM_API=1); keep seeds for unit tests.
  if (import.meta.env.MODE === 'test') return true
  return !shouldUseApiDataBackend()
}
