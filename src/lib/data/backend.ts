/**
 * Pluggable key/value backend for the save/load layer.
 * Today: browser localStorage. Tomorrow: swap for an API-backed adapter
 * without rewriting store business logic.
 */

export type DataBackend = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export function createMemoryBackend(
  initial: Record<string, string> = {},
): DataBackend {
  const map = new Map<string, string>(Object.entries(initial))
  return {
    getItem(key) {
      return map.has(key) ? (map.get(key) as string) : null
    },
    setItem(key, value) {
      map.set(key, value)
    },
    removeItem(key) {
      map.delete(key)
    },
  }
}

export const localStorageBackend: DataBackend = {
  getItem(key) {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  setItem(key, value) {
    try {
      localStorage.setItem(key, value)
    } catch {
      /* ignore quota / private mode */
    }
  },
  removeItem(key) {
    try {
      localStorage.removeItem(key)
    } catch {
      /* ignore */
    }
  },
}

let activeBackend: DataBackend = localStorageBackend

export function getDataBackend(): DataBackend {
  return activeBackend
}

/** Test helper — swap the backend (e.g. memory) without touching stores. */
export function setDataBackend(backend: DataBackend): void {
  activeBackend = backend
}

export function resetDataBackend(): void {
  activeBackend = localStorageBackend
}
