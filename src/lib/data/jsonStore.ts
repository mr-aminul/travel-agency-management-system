import { getDataBackend } from '@/lib/data/backend'

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown
  } catch {
    return undefined
  }
}

/** Load JSON from the active data backend. Returns `fallback` on miss/invalid. */
export function loadJson<T>(key: string, fallback: T): T {
  const raw = getDataBackend().getItem(key)
  if (raw == null || raw === '') return fallback
  const parsed = parseJson(raw)
  return parsed === undefined ? fallback : (parsed as T)
}

/** Load JSON and normalize through `parse`. Returns `fallback` when parse fails. */
export function loadJsonParsed<T>(
  key: string,
  fallback: T,
  parse: (value: unknown) => T | undefined,
): T {
  const raw = getDataBackend().getItem(key)
  if (raw == null || raw === '') return fallback
  const parsed = parseJson(raw)
  if (parsed === undefined) return fallback
  return parse(parsed) ?? fallback
}

/** Save JSON to the active data backend. */
export function saveJson(key: string, value: unknown): void {
  getDataBackend().setItem(key, JSON.stringify(value))
}

/** Remove a key from the active data backend. */
export function removeJson(key: string): void {
  getDataBackend().removeItem(key)
}

/** True when the key exists (even if empty string). */
export function hasJson(key: string): boolean {
  return getDataBackend().getItem(key) != null
}
