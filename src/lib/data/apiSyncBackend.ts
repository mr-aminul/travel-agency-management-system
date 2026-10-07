import type { DataBackend } from '@/lib/data/backend'
import { createMemoryBackend } from '@/lib/data/backend'
import { DATA_KEYS } from '@/lib/data/keys'

const TRACKED_KEYS = new Set<string>(Object.values(DATA_KEYS))

function apiBase(): string {
  const configured = import.meta.env.VITE_API_BASE_URL as string | undefined
  if (configured && configured.trim()) {
    return configured.replace(/\/$/, '')
  }
  return ''
}

async function readAllEntries(): Promise<Record<string, unknown>> {
  const response = await fetch(`${apiBase()}/api/platform/kv`, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) {
    throw new Error(`Failed to hydrate platform data (${response.status})`)
  }
  const body = (await response.json()) as { entries?: Record<string, unknown> }
  return body.entries ?? {}
}

async function writeEntry(key: string, value: unknown): Promise<void> {
  const response = await fetch(
    `${apiBase()}/api/platform/kv/${encodeURIComponent(key)}`,
    {
      method: 'PUT',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ value }),
    },
  )
  if (!response.ok) {
    throw new Error(`Failed to save ${key} (${response.status})`)
  }
}

async function deleteEntry(key: string): Promise<void> {
  const response = await fetch(
    `${apiBase()}/api/platform/kv/${encodeURIComponent(key)}`,
    {
      method: 'DELETE',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    },
  )
  if (!response.ok && response.status !== 404) {
    throw new Error(`Failed to delete ${key} (${response.status})`)
  }
}

/**
 * Sync backend: memory for store reads/writes, API for durability.
 * Only platform DATA_KEYS are synced — never touches other apps' storage.
 */
export function createApiSyncBackend(
  seed: Record<string, string> = {},
): DataBackend {
  const memory = createMemoryBackend(seed)
  const queue = new Map<string, Promise<void>>()

  function enqueue(key: string, task: () => Promise<void>) {
    if (!TRACKED_KEYS.has(key)) return
    const previous = queue.get(key) ?? Promise.resolve()
    const next = previous.then(task).catch((error) => {
      console.error('[platform-data]', error)
    })
    queue.set(key, next)
  }

  return {
    getItem(key) {
      return memory.getItem(key)
    },
    setItem(key, value) {
      memory.setItem(key, value)
      enqueue(key, async () => {
        const parsed = JSON.parse(value) as unknown
        await writeEntry(key, parsed)
      })
    },
    removeItem(key) {
      memory.removeItem(key)
      enqueue(key, async () => {
        await deleteEntry(key)
      })
    },
  }
}

/** Load server KV into a seed map for createApiSyncBackend. */
export async function hydrateApiSeed(): Promise<Record<string, string>> {
  const entries = await readAllEntries()
  const seed: Record<string, string> = {}
  for (const [key, value] of Object.entries(entries)) {
    if (!TRACKED_KEYS.has(key)) continue
    seed[key] = JSON.stringify(value)
  }
  return seed
}

export function shouldUseApiDataBackend(): boolean {
  const flag = import.meta.env.VITE_USE_PLATFORM_API as string | undefined
  if (flag === '0' || flag === 'false') return false
  if (flag === '1' || flag === 'true') return true
  // Production builds on the VPS site default to API persistence.
  return import.meta.env.PROD === true
}
