import { readThemeColor } from '@/lib/brand'
import { isMarketingHost } from '@/lib/siteOrigins'
import {
  applyStandaloneClass,
  isStandaloneDisplay,
  PWA_UPDATE_EVENT,
  setPwaUpdateHandler,
} from '@/lib/pwa'

function syncPwaThemeColor(): void {
  if (typeof document === 'undefined') return
  let meta = document.querySelector('meta[name="theme-color"]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute('name', 'theme-color')
    document.head.appendChild(meta)
  }
  meta.setAttribute('content', readThemeColor())
}

function stripMarketingPwaHints(): void {
  document
    .querySelectorAll('link[rel="manifest"]')
    .forEach((el) => el.remove())
  if (!('serviceWorker' in navigator)) return
  void navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((reg) => {
      void reg.unregister()
    })
  })
}

/** Mark the document when running as an installed app (safe-area / chrome). */
export function initPwaDisplayMode(): void {
  if (typeof document === 'undefined') return
  if (isMarketingHost()) {
    stripMarketingPwaHints()
    return
  }
  const sync = () => {
    applyStandaloneClass(document.documentElement, isStandaloneDisplay())
    syncPwaThemeColor()
  }
  sync()
  const media = window.matchMedia('(display-mode: standalone)')
  media.addEventListener('change', sync)
}

/**
 * Register the service worker on the app host only.
 * Marketing (`onetrack.inventivelab.bd`) shares this bundle and must not cache.
 */
export function registerPwa(): void {
  if (typeof window === 'undefined') return
  if (isMarketingHost()) {
    stripMarketingPwaHints()
    return
  }
  if (!('serviceWorker' in navigator)) return

  void import(/* @vite-ignore */ 'virtual:pwa-register')
    .then(({ registerSW }) => {
      setPwaUpdateHandler(
        registerSW({
          immediate: true,
          onNeedRefresh() {
            window.dispatchEvent(new CustomEvent(PWA_UPDATE_EVENT))
          },
        }),
      )
    })
    .catch(() => {
      /* vitest / builds without the plugin */
    })
}
