/**
 * Save/load layer for core records (agency, user, client, sub agent, service).
 *
 * UI stores call these helpers instead of touching localStorage directly.
 * Swap `setDataBackend(...)` later for an API-backed adapter without
 * rewriting create/update business logic.
 */

export {
  createMemoryBackend,
  getDataBackend,
  localStorageBackend,
  resetDataBackend,
  setDataBackend,
  type DataBackend,
} from '@/lib/data/backend'
export {
  createApiSyncBackend,
  hydrateApiSeed,
  shouldUseApiDataBackend,
} from '@/lib/data/apiSyncBackend'
export { DATA_KEYS, type DataKey } from '@/lib/data/keys'
export {
  hasJson,
  loadJson,
  loadJsonParsed,
  removeJson,
  saveJson,
} from '@/lib/data/jsonStore'
