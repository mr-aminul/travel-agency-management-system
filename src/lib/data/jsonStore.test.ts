import { afterEach, describe, expect, it } from 'vitest'
import {
  createMemoryBackend,
  DATA_KEYS,
  hasJson,
  loadJson,
  loadJsonParsed,
  removeJson,
  resetDataBackend,
  saveJson,
  setDataBackend,
} from '@/lib/data'

afterEach(() => {
  resetDataBackend()
})

describe('data save/load layer', () => {
  it('round-trips JSON through the active backend', () => {
    setDataBackend(createMemoryBackend())
    saveJson(DATA_KEYS.clientsCreated, [{ id: 'c-1', name: 'Karim' }])
    expect(loadJson(DATA_KEYS.clientsCreated, [])).toEqual([
      { id: 'c-1', name: 'Karim' },
    ])
    expect(hasJson(DATA_KEYS.clientsCreated)).toBe(true)
  })

  it('returns fallback when missing or invalid', () => {
    setDataBackend(createMemoryBackend())
    expect(loadJson('missing', { ok: true })).toEqual({ ok: true })
    setDataBackend(createMemoryBackend({ broken: '{not-json' }))
    expect(loadJson('broken', [])).toEqual([])
  })

  it('parses collections with a normalizer', () => {
    setDataBackend(
      createMemoryBackend({
        [DATA_KEYS.tenantsCreated]: JSON.stringify([
          { id: 't-1', name: 'Agency' },
          { bad: true },
        ]),
      }),
    )
    const tenants = loadJsonParsed(
      DATA_KEYS.tenantsCreated,
      [] as { id: string; name: string }[],
      (value) => {
        if (!Array.isArray(value)) return []
        return value.filter(
          (item): item is { id: string; name: string } =>
            typeof item === 'object' &&
            item != null &&
            typeof (item as { id?: unknown }).id === 'string' &&
            typeof (item as { name?: unknown }).name === 'string',
        )
      },
    )
    expect(tenants).toEqual([{ id: 't-1', name: 'Agency' }])
  })

  it('removes keys from the backend', () => {
    setDataBackend(createMemoryBackend())
    saveJson(DATA_KEYS.casesCreated, [{ id: 'case-1' }])
    removeJson(DATA_KEYS.casesCreated)
    expect(hasJson(DATA_KEYS.casesCreated)).toBe(false)
  })
})
