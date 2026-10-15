import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Download, Plus, RefreshCw, Share, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui'
import { publicUrl } from '@/lib/publicUrl'
import {
  PWA_UPDATE_EVENT,
  isClientFacingPublicPath,
  isCompactViewport,
  isIosSafari,
  isStandaloneDisplay,
  readInstallDismissed,
  resolveInstallKind,
  writeInstallDismissed,
  applyWaitingPwaUpdate,
  type PwaInstallKind,
} from '@/lib/pwa'
import '@/styles/layout-pwa.css'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const IOS_INSTALL_DELAY_MS = 2800

export function PwaChrome() {
  const { pathname } = useLocation()
  const publicSurface = isClientFacingPublicPath(pathname)
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null)
  const [online, setOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine,
  )
  const [installKind, setInstallKind] = useState<PwaInstallKind>(null)
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [updateReady, setUpdateReady] = useState(false)

  const refreshInstallKind = useCallback(
    (canPrompt: boolean) => {
      return resolveInstallKind({
        standalone: isStandaloneDisplay(),
        dismissed: readInstallDismissed(),
        compact: isCompactViewport(),
        canPrompt,
        iosSafari: isIosSafari(),
        publicSurface: isClientFacingPublicPath(pathname),
      })
    },
    [pathname],
  )

  useEffect(() => {
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  useEffect(() => {
    let iosTimer = 0
    const applyKind = (canPrompt: boolean) => {
      window.clearTimeout(iosTimer)
      const next = refreshInstallKind(canPrompt)
      if (next === 'ios') {
        iosTimer = window.setTimeout(() => {
          setInstallKind('ios')
        }, IOS_INSTALL_DELAY_MS)
        return
      }
      setInstallKind(next)
    }

    const onPrompt = (event: Event) => {
      event.preventDefault()
      const installEvent = event as BeforeInstallPromptEvent
      promptRef.current = installEvent
      setDeferredPrompt(installEvent)
      applyKind(true)
    }
    const onInstalled = () => {
      writeInstallDismissed()
      promptRef.current = null
      setDeferredPrompt(null)
      setInstallKind(null)
    }

    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    applyKind(Boolean(promptRef.current))
    const media = window.matchMedia('(max-width: 767px)')
    const onViewport = () => applyKind(Boolean(promptRef.current))
    media.addEventListener('change', onViewport)
    return () => {
      window.clearTimeout(iosTimer)
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
      media.removeEventListener('change', onViewport)
    }
  }, [refreshInstallKind])

  useEffect(() => {
    const onUpdate = () => setUpdateReady(true)
    window.addEventListener(PWA_UPDATE_EVENT, onUpdate)
    return () => window.removeEventListener(PWA_UPDATE_EVENT, onUpdate)
  }, [])

  const dismissInstall = () => {
    writeInstallDismissed()
    promptRef.current = null
    setInstallKind(null)
    setDeferredPrompt(null)
  }

  const handleInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    if (choice.outcome === 'accepted') dismissInstall()
    promptRef.current = null
    setDeferredPrompt(null)
  }

  const showInstall = Boolean(installKind) && !updateReady && !publicSurface
  const showUpdate = updateReady && !publicSurface

  return (
    <>
      <div
        className="pd-pwa-offline"
        hidden={online}
        role="status"
        aria-live="polite"
      >
        <WifiOff size={14} strokeWidth={2} aria-hidden />
        You&apos;re offline. Cached screens still open.
      </div>

      <aside
        className="pd-card pd-pwa-sheet"
        hidden={!showInstall}
        aria-label="Install OneTrack"
      >
        <header className="pd-card__header">
          <img
            className="pd-pwa-sheet__mark"
            src={publicUrl('images/pwa-192.png')}
            alt=""
            width={40}
            height={40}
          />
          <div className="pd-card__text">
            <h2 className="pd-card__title">Install OneTrack</h2>
            <p className="pd-card__description">
              {installKind === 'ios'
                ? 'Add it to your Home Screen so it opens like an app, even on a weak connection.'
                : 'Keep it on your home screen. Faster than a browser tab, and it still opens when the signal drops.'}
            </p>
          </div>
        </header>
        <div className="pd-card__body">
          {installKind === 'ios' ? (
            <>
              <ol className="pd-pwa-sheet__steps">
                <li>
                  <span className="pd-pwa-sheet__step-icon" aria-hidden>
                    <Share size={14} strokeWidth={2.25} />
                  </span>
                  Tap Share
                </li>
                <li>
                  <span className="pd-pwa-sheet__step-icon" aria-hidden>
                    <Plus size={14} strokeWidth={2.25} />
                  </span>
                  Tap Add to Home Screen
                </li>
              </ol>
              <div className="pd-pwa-sheet__actions">
                <Button size="md" onClick={dismissInstall}>
                  Got it
                </Button>
              </div>
            </>
          ) : (
            <div className="pd-pwa-sheet__actions">
              <Button
                size="md"
                onClick={() => void handleInstall()}
                disabled={!deferredPrompt}
              >
                <Download size={16} strokeWidth={2} aria-hidden />
                Install
              </Button>
              <Button size="md" variant="ghost" onClick={dismissInstall}>
                Not now
              </Button>
            </div>
          )}
        </div>
      </aside>

      <aside
        className="pd-card pd-pwa-sheet"
        hidden={!showUpdate}
        aria-label="App update"
      >
        <header className="pd-card__header">
          <span className="pd-pwa-sheet__mark pd-pwa-sheet__mark--icon" aria-hidden>
            <RefreshCw size={18} strokeWidth={2} />
          </span>
          <div className="pd-card__text">
            <h2 className="pd-card__title">A new version is ready</h2>
            <p className="pd-card__description">
              Reload to pick up the latest OneTrack screens.
            </p>
          </div>
        </header>
        <div className="pd-card__body">
          <div className="pd-pwa-sheet__actions">
            <Button size="md" onClick={() => applyWaitingPwaUpdate()}>
              Reload
            </Button>
            <Button
              size="md"
              variant="ghost"
              onClick={() => setUpdateReady(false)}
            >
              Later
            </Button>
          </div>
        </div>
      </aside>
    </>
  )
}
