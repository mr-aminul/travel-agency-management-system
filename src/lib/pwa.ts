export const PWA_DISMISS_KEY = 'pd-pwa-install-dismissed'
export const PWA_UPDATE_EVENT = 'pd-pwa-updateready'

const IOS_HINT = /iphone|ipad|ipod/i

export type PwaInstallKind = 'prompt' | 'ios' | null

export function isStandaloneDisplay(
  media: { matches: boolean } | null = null,
  navigatorLike: { standalone?: boolean } = navigator as {
    standalone?: boolean
  },
): boolean {
  const displayStandalone =
    media?.matches ??
    (typeof window !== 'undefined' &&
      window.matchMedia('(display-mode: standalone)').matches)
  const iosStandalone = Boolean(navigatorLike.standalone)
  return Boolean(displayStandalone || iosStandalone)
}

export function isIosSafari(
  userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '',
): boolean {
  if (!IOS_HINT.test(userAgent)) return false
  // Chrome/Firefox/Edge on iOS include CriOS / FxiOS / EdgiOS.
  return !/crios|fxios|edgios|android/i.test(userAgent)
}

export function isCompactViewport(
  media: { matches: boolean } | null = null,
): boolean {
  return (
    media?.matches ??
    (typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 767px)').matches)
  )
}

export function readInstallDismissed(
  storage: Pick<Storage, 'getItem'> | null = typeof localStorage === 'undefined'
    ? null
    : localStorage,
): boolean {
  if (!storage) return false
  try {
    return storage.getItem(PWA_DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

export function writeInstallDismissed(
  storage: Pick<Storage, 'setItem'> | null = typeof localStorage === 'undefined'
    ? null
    : localStorage,
): void {
  if (!storage) return
  try {
    storage.setItem(PWA_DISMISS_KEY, '1')
  } catch {
    /* quota / private mode */
  }
}

/** Client one-shot flows — never nag them to install the agency app. */
export function isClientFacingPublicPath(pathname: string): boolean {
  const path = pathname.split('?')[0] || '/'
  return (
    path.startsWith('/i/') ||
    path === '/track' ||
    path.startsWith('/track/') ||
    path.startsWith('/client-registration/') ||
    path.startsWith('/register/') ||
    path.startsWith('/join/') ||
    path.startsWith('/invite/') ||
    path.startsWith('/reset/')
  )
}

export function resolveInstallKind(input: {
  standalone: boolean
  dismissed: boolean
  compact: boolean
  canPrompt: boolean
  iosSafari: boolean
  publicSurface?: boolean
}): PwaInstallKind {
  if (
    input.standalone ||
    input.dismissed ||
    !input.compact ||
    input.publicSurface
  ) {
    return null
  }
  if (input.canPrompt) return 'prompt'
  if (input.iosSafari) return 'ios'
  return null
}

export function applyStandaloneClass(
  root: { classList: { toggle: (name: string, force?: boolean) => void } },
  standalone: boolean,
): void {
  root.classList.toggle('pd-pwa-standalone', standalone)
}

type UpdateFn = (reloadPage?: boolean) => Promise<void>

let updateHandler: UpdateFn | null = null

export function setPwaUpdateHandler(handler: UpdateFn | null): void {
  updateHandler = handler
}

export function applyWaitingPwaUpdate(): void {
  void updateHandler?.(true)
}
