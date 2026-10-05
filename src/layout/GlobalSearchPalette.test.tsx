import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { GlobalSearchPalette } from './GlobalSearchPalette'
import { SEARCH_RECENTS_KEY, type SearchItem } from '@/lib/search'

const items: SearchItem[] = [
  {
    id: 'client:c-284',
    kind: 'client',
    scope: 'clients',
    label: 'Md. Rahim Uddin',
    description: 'Passport A12345678',
    keywords: ['c-284'],
    path: '/clients/c-284',
    avatarName: 'Md. Rahim Uddin',
  },
  {
    id: 'page:clients',
    kind: 'page',
    scope: 'pages',
    label: 'Clients',
    keywords: ['/clients'],
    path: '/clients',
  },
  {
    id: 'action:create-client',
    kind: 'action',
    scope: 'actions',
    label: 'Create A Client',
    keywords: ['client'],
    path: '/clients',
  },
]

afterEach(() => {
  cleanup()
  localStorage.removeItem(SEARCH_RECENTS_KEY)
})

function renderPalette(onClose = vi.fn()) {
  render(
    <MemoryRouter>
      <GlobalSearchPalette items={items} onClose={onClose} />
    </MemoryRouter>,
  )
  const input = screen.getByRole('combobox', { name: 'Search OneTrack' })
  fireEvent.focus(input)
  return { onClose, input }
}

describe('GlobalSearchPalette', () => {
  it('filters results and highlights the match', () => {
    const { input } = renderPalette()
    fireEvent.change(input, { target: { value: 'Rahim' } })

    expect(
      screen.getByRole('option', { name: /Md. Rahim Uddin/ }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Clients' })).toBeNull()
    expect(document.querySelector('.pd-global-search__mark')?.textContent).toBe(
      'Rahim',
    )
  })

  it('moves the Clients filter with Tab and hides other scopes', () => {
    const { input } = renderPalette()
    fireEvent.keyDown(input, { key: 'Tab' })

    expect(screen.getByRole('button', { name: 'Clients' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(
      screen.getByRole('option', { name: /Md. Rahim Uddin/ }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Clients' })).toBeNull()
  })

  it('opens the active result with Enter and remembers it', () => {
    const { onClose, input } = renderPalette()
    fireEvent.change(input, { target: { value: 'Rahim' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onClose).toHaveBeenCalled()
    expect(localStorage.getItem(SEARCH_RECENTS_KEY)).toContain('client:c-284')
  })
})
