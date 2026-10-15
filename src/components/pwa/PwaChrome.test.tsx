import { afterEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react'
import { PwaChrome } from '@/components/pwa/PwaChrome'
import { PWA_DISMISS_KEY, PWA_UPDATE_EVENT } from '@/lib/pwa'

function renderChrome(path = '/login') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <PwaChrome />
    </MemoryRouter>,
  )
}

function stubCompactViewport() {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: query.includes('max-width'),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}

function dispatchInstallPrompt() {
  const event = new Event('beforeinstallprompt')
  Object.assign(event, {
    prompt: () => Promise.resolve(),
    userChoice: Promise.resolve({ outcome: 'accepted' }),
    preventDefault() {},
  })
  act(() => {
    window.dispatchEvent(event)
  })
  return event
}

afterEach(() => {
  cleanup()
  localStorage.removeItem(PWA_DISMISS_KEY)
  act(() => {
    window.dispatchEvent(new Event('online'))
  })
})

describe('PwaChrome', () => {
  it('shows an offline status bar when the browser reports offline', () => {
    const { container } = renderChrome()
    const bar = container.querySelector('.pd-pwa-offline')
    expect(bar).toHaveAttribute('hidden')
    act(() => {
      window.dispatchEvent(new Event('offline'))
    })
    expect(bar).not.toHaveAttribute('hidden')
    expect(bar).toHaveTextContent(/offline/i)
  })

  it('offers install after beforeinstallprompt on a compact viewport', () => {
    stubCompactViewport()
    const { container } = renderChrome('/login')
    dispatchInstallPrompt()

    const sheet = container.querySelector('[aria-label="Install OneTrack"]')
    expect(sheet).not.toHaveAttribute('hidden')
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }))
    expect(sheet).toHaveAttribute('hidden')
  })

  it('does not offer install on a public invoice', () => {
    stubCompactViewport()
    const { container } = renderChrome('/i/demo-token')
    dispatchInstallPrompt()
    expect(
      container.querySelector('[aria-label="Install OneTrack"]'),
    ).toHaveAttribute('hidden')
  })

  it('surfaces a reload card when a service-worker update is waiting', () => {
    const { container } = renderChrome('/login')
    act(() => {
      window.dispatchEvent(new Event(PWA_UPDATE_EVENT))
    })
    const sheet = container.querySelector('[aria-label="App update"]')
    expect(sheet).not.toHaveAttribute('hidden')
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument()
  })
})
