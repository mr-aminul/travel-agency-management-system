import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  appOrigin,
  appUrl,
  isMarketingHost,
  marketingHomeUrl,
  marketingOrigin,
} from '@/lib/siteOrigins'

describe('siteOrigins', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('defaults to inventivelab app and marketing hosts', () => {
    expect(appOrigin()).toBe('https://app.inventivelab.bd')
    expect(marketingOrigin()).toBe('https://onetrack.inventivelab.bd')
  })

  it('uses relative app URLs on localhost', () => {
    expect(appUrl('/login')).toBe('/login')
    expect(marketingHomeUrl()).toBe('/')
  })

  it('treats localhost as the app host', () => {
    expect(isMarketingHost()).toBe(false)
  })

  it('forces marketing when VITE_FORCE_MARKETING=1', () => {
    vi.stubEnv('VITE_FORCE_MARKETING', '1')
    expect(isMarketingHost()).toBe(true)
  })
})
