/// <reference types="vite/client" />

declare const __APP_VERSION__: string

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_USE_PLATFORM_API?: string
  readonly VITE_ALLOW_OFFLINE_AUTH?: string
  readonly VITE_APP_ORIGIN?: string
  readonly VITE_MARKETING_ORIGIN?: string
  readonly VITE_FORCE_MARKETING?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
