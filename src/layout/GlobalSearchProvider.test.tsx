import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '@/lib/AuthProvider'
import { DEMO_USER, writeSession, clearSession } from '@/lib/authApi'
import { SEARCH_RECENTS_KEY } from '@/lib/search'
import { TENANT_IDS } from '@/types/tenant'
import { GlobalSearchProvider } from './GlobalSearchProvider'
import { TopBarSearch } from './TopBarSearch'

afterEach(() => {
  cleanup()
  clearSession()
  localStorage.removeItem(SEARCH_RECENTS_KEY)
})

function renderProvider() {
  writeSession({
    user: DEMO_USER,
    tenantId: TENANT_IDS.full,
    signedInAt: '2026-01-01T00:00:00.000Z',
  })
  return render(
    <AuthProvider>
      <MemoryRouter>
        <GlobalSearchProvider>
          <TopBarSearch />
          <input aria-label="Page field" />
        </GlobalSearchProvider>
      </MemoryRouter>
    </AuthProvider>,
  )
}

describe('GlobalSearchProvider', () => {
  it('focuses the top-bar search from slash when the page is not a typing target', () => {
    renderProvider()
    fireEvent.keyDown(window, { key: '/' })
    expect(screen.getByRole('combobox', { name: 'Search OneTrack' })).toHaveFocus()
    expect(screen.getByRole('listbox', { name: 'Search results' })).toBeInTheDocument()
  })

  it('leaves slash alone inside a text field', () => {
    renderProvider()
    const field = screen.getByLabelText('Page field')
    field.focus()
    fireEvent.keyDown(field, { key: '/' })
    expect(screen.getByRole('combobox', { name: 'Search OneTrack' })).not.toHaveFocus()
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('toggles search with meta+k', () => {
    renderProvider()
    fireEvent.keyDown(window, { key: 'k', metaKey: true })
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'k', metaKey: true })
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('shows the search field in the top bar', () => {
    renderProvider()
    expect(
      screen.getByRole('combobox', { name: 'Search OneTrack' }),
    ).toBeInTheDocument()
  })
})
