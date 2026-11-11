export type AppearanceMode = 'light' | 'dark' | 'system'
export type ThemeMode = 'default' | 'custom'

export const THEME_COLOR_KEY = 'app-theme-color'
export const THEME_MODE_KEY = 'app-theme-mode'
export const APPEARANCE_KEY = 'app-appearance'
export const DEFAULT_THEME_COLOR = '#0c2d79'
export const DEFAULT_APPEARANCE: AppearanceMode = 'light'
export const DEFAULT_THEME_MODE: ThemeMode = 'default'

/** Must match authApi AUTH_SESSION_KEY — used only in the pre-paint bootstrap. */
const AUTH_SESSION_STORAGE_KEY = 'pd-auth-session'

/** Single source of truth for the pre-paint theme bootstrap in index.html. */
export function getThemeBootstrapScript(): string {
  // Custom theme only while a session exists. Public auth shells always use
  // CSS default (#0c2d79) so logo + chrome never diverge after logout.
  return `(function(){try{var d=document.documentElement;var signedIn=false;try{signedIn=!!sessionStorage.getItem(${JSON.stringify(AUTH_SESSION_STORAGE_KEY)})}catch(e){}var m=localStorage.getItem(${JSON.stringify(THEME_MODE_KEY)});var t=localStorage.getItem(${JSON.stringify(THEME_COLOR_KEY)});if(signedIn&&m==="custom"&&t&&/^#[0-9A-Fa-f]{6}$/.test(t))d.style.setProperty("--color-theme",t.toLowerCase());else d.style.removeProperty("--color-theme");var a=localStorage.getItem(${JSON.stringify(APPEARANCE_KEY)})||${JSON.stringify(DEFAULT_APPEARANCE)};var dark=a==="dark"||(a!=="light"&&matchMedia("(prefers-color-scheme:dark)").matches);d.classList.toggle("dark",dark);d.style.colorScheme=dark?"dark":"light"}catch(e){}})();`
}

export function normalizeThemeColor(value: string): string | null {
  const t = value.trim()
  if (/^#[0-9A-Fa-f]{6}$/.test(t)) return t.toLowerCase()
  if (/^[0-9A-Fa-f]{6}$/.test(t)) return `#${t.toLowerCase()}`
  return null
}

function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'default' || value === 'custom'
}

export function readThemeMode(): ThemeMode {
  if (typeof document === 'undefined') return DEFAULT_THEME_MODE
  try {
    const mode = localStorage.getItem(THEME_MODE_KEY)
    if (isThemeMode(mode)) return mode
    // Migrate: a non-default stored color means custom.
    const stored = localStorage.getItem(THEME_COLOR_KEY)
    const color = stored ? normalizeThemeColor(stored) : null
    if (color && color !== DEFAULT_THEME_COLOR) return 'custom'
  } catch {
    /* ignore */
  }
  return DEFAULT_THEME_MODE
}

export function readCustomThemeColor(): string {
  if (typeof document === 'undefined') return DEFAULT_THEME_COLOR
  try {
    const stored = localStorage.getItem(THEME_COLOR_KEY)
    const fromStore = stored ? normalizeThemeColor(stored) : null
    if (fromStore) return fromStore
  } catch {
    /* ignore */
  }
  return DEFAULT_THEME_COLOR
}

/** Effective color currently applied (default or custom). */
export function readThemeColor(): string {
  if (readThemeMode() === 'default') return DEFAULT_THEME_COLOR
  return readCustomThemeColor()
}

export function applyThemeColor(hex: string): string | null {
  const next = normalizeThemeColor(hex)
  if (!next || typeof document === 'undefined') return null
  document.documentElement.style.setProperty('--color-theme', next)
  try {
    localStorage.setItem(THEME_COLOR_KEY, next)
    localStorage.setItem(THEME_MODE_KEY, 'custom')
  } catch {
    /* ignore quota / private mode */
  }
  return next
}

export function applyThemeMode(mode: ThemeMode): ThemeMode {
  if (typeof document === 'undefined') return mode
  try {
    localStorage.setItem(THEME_MODE_KEY, mode)
  } catch {
    /* ignore */
  }
  if (mode === 'default') {
    document.documentElement.style.removeProperty('--color-theme')
    return mode
  }
  const custom = readCustomThemeColor()
  document.documentElement.style.setProperty('--color-theme', custom)
  try {
    localStorage.setItem(THEME_COLOR_KEY, custom)
  } catch {
    /* ignore */
  }
  return mode
}

/**
 * Public / signed-out surfaces: drop inline custom theme so CSS default blue
 * paints login and marketing chrome. Keeps stored custom hex for Settings.
 */
export function resetBrandThemeToDefault(): ThemeMode {
  return applyThemeMode('default')
}

function isAppearanceMode(value: string | null): value is AppearanceMode {
  return value === 'light' || value === 'dark' || value === 'system'
}

export function readAppearance(): AppearanceMode {
  if (typeof document === 'undefined') return DEFAULT_APPEARANCE
  try {
    const stored = localStorage.getItem(APPEARANCE_KEY)
    return isAppearanceMode(stored) ? stored : DEFAULT_APPEARANCE
  } catch {
    return DEFAULT_APPEARANCE
  }
}

function resolveIsDark(mode: AppearanceMode): boolean {
  if (mode === 'dark') return true
  if (mode === 'light') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function applyAppearance(mode: AppearanceMode): AppearanceMode {
  if (typeof document === 'undefined') return mode
  const dark = resolveIsDark(mode)
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
  try {
    localStorage.setItem(APPEARANCE_KEY, mode)
  } catch {
    /* ignore quota / private mode */
  }
  return mode
}

let appearanceMedia: MediaQueryList | null = null
let appearanceMediaHandler: (() => void) | null = null

/** When appearance is "system", keep html.dark in sync with the OS. */
export function initAppearanceListener(): void {
  if (typeof window === 'undefined' || appearanceMediaHandler) return
  appearanceMedia = window.matchMedia('(prefers-color-scheme: dark)')
  appearanceMediaHandler = () => {
    if (readAppearance() === 'system') applyAppearance('system')
  }
  appearanceMedia.addEventListener('change', appearanceMediaHandler)
}
