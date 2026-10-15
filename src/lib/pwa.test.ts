import { afterEach, describe, expect, it } from 'vitest'
import {
  PWA_DISMISS_KEY,
  applyStandaloneClass,
  applyWaitingPwaUpdate,
  isClientFacingPublicPath,
  isIosSafari,
  readInstallDismissed,
  resolveInstallKind,
  setPwaUpdateHandler,
  writeInstallDismissed,
} from '@/lib/pwa'

afterEach(() => {
  localStorage.removeItem(PWA_DISMISS_KEY)
})

describe('PWA install offer', () => {
  it('offers Chrome install on a compact viewport when the browser can prompt', () => {
    expect(
      resolveInstallKind({
        standalone: false,
        dismissed: false,
        compact: true,
        canPrompt: true,
        iosSafari: false,
      }),
    ).toBe('prompt')
  })

  it('offers iOS add-to-home-screen copy on Safari', () => {
    expect(
      resolveInstallKind({
        standalone: false,
        dismissed: false,
        compact: true,
        canPrompt: false,
        iosSafari: true,
      }),
    ).toBe('ios')
  })

  it('hides the offer on public client surfaces', () => {
    expect(
      resolveInstallKind({
        standalone: false,
        dismissed: false,
        compact: true,
        canPrompt: true,
        iosSafari: false,
        publicSurface: true,
      }),
    ).toBeNull()
    expect(isClientFacingPublicPath('/i/abc')).toBe(true)
    expect(isClientFacingPublicPath('/track')).toBe(true)
    expect(isClientFacingPublicPath('/login')).toBe(false)
    expect(isClientFacingPublicPath('/')).toBe(false)
  })

  it('hides the offer in standalone, on desktop, or after dismiss', () => {
    expect(
      resolveInstallKind({
        standalone: true,
        dismissed: false,
        compact: true,
        canPrompt: true,
        iosSafari: false,
      }),
    ).toBeNull()
    expect(
      resolveInstallKind({
        standalone: false,
        dismissed: false,
        compact: false,
        canPrompt: true,
        iosSafari: false,
      }),
    ).toBeNull()
    expect(
      resolveInstallKind({
        standalone: false,
        dismissed: true,
        compact: true,
        canPrompt: true,
        iosSafari: false,
      }),
    ).toBeNull()
  })

  it('detects iOS Safari vs Chrome on iPhone', () => {
    expect(
      isIosSafari(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      ),
    ).toBe(true)
    expect(
      isIosSafari(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.0.0 Mobile/15E148 Safari/604.1',
      ),
    ).toBe(false)
  })

  it('persists dismiss and toggles the standalone class', () => {
    expect(readInstallDismissed()).toBe(false)
    writeInstallDismissed()
    expect(readInstallDismissed()).toBe(true)
    const classes = new Set<string>()
    applyStandaloneClass(
      {
        classList: {
          toggle: (name, force) => {
            if (force) classes.add(name)
            else classes.delete(name)
          },
        },
      },
      true,
    )
    expect(classes.has('pd-pwa-standalone')).toBe(true)
  })

  it('invokes the waiting service-worker update handler', async () => {
    const calls: boolean[] = []
    setPwaUpdateHandler(async (reload) => {
      calls.push(Boolean(reload))
    })
    applyWaitingPwaUpdate()
    await Promise.resolve()
    expect(calls).toEqual([true])
    setPwaUpdateHandler(null)
  })
})
