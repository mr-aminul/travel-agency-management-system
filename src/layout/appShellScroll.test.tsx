import { afterEach, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { cleanup, render } from '@testing-library/react'
import { LayoutDashboard } from 'lucide-react'
import { AuthProvider } from '@/lib/AuthProvider'
import { AppLayout } from './AppLayout'

afterEach(cleanup)

function renderShell() {
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/clients']}>
        <Routes>
          <Route
            path="/"
            element={
              <AppLayout
                navItems={[
                  {
                    path: '/clients',
                    label: 'Clients',
                    icon: LayoutDashboard,
                  },
                ]}
                brand={{ name: 'OneTrack', icon: LayoutDashboard }}
              />
            }
          >
            <Route path="clients" element={<p>Page content</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

describe('app shell scrolling', () => {
  it('scrolls page content in a region of its own', () => {
    renderShell()

    const scroll = document.querySelector('.pd-app-scroll')
    expect(scroll?.contains(document.querySelector('main'))).toBe(true)
  })

  it('keeps the top bar outside the scroll region so page chrome cannot overlap it', () => {
    renderShell()

    const scroll = document.querySelector('.pd-app-scroll')
    expect(scroll?.contains(document.querySelector('.pd-topbar'))).toBe(false)
  })
})
