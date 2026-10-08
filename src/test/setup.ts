import '@testing-library/jest-dom/vitest'

// Developer .env often enables the live API — unit tests stay offline.
Object.assign(import.meta.env, {
  VITE_USE_PLATFORM_API: '0',
  VITE_ALLOW_OFFLINE_AUTH: '1',
})

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
