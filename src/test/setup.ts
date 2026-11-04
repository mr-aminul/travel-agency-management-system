import '@testing-library/jest-dom/vitest'

// Developer .env often enables the live API. Unit tests stay offline.
Object.assign(import.meta.env, {
  VITE_USE_PLATFORM_API: '0',
  VITE_ALLOW_OFFLINE_AUTH: '1',
})

/**
 * Node 22+ exposes a broken global `localStorage` getter (needs
 * --localstorage-file). That shadows jsdom's Storage and makes bare
 * `localStorage.getItem` throw. Point the global at the jsdom instance.
 */
if (typeof window !== 'undefined' && window.localStorage) {
  Object.defineProperty(globalThis, 'localStorage', {
    value: window.localStorage,
    configurable: true,
    enumerable: true,
    writable: true,
  })
}

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})

// jsdom does not implement <dialog> modal methods used by ConfirmDialog.
if (typeof HTMLDialogElement !== 'undefined') {
  HTMLDialogElement.prototype.showModal ??= function showModal(this: HTMLDialogElement) {
    this.open = true
  }
  HTMLDialogElement.prototype.close ??= function close(this: HTMLDialogElement) {
    this.open = false
  }
}
