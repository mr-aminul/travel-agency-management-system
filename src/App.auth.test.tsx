import { Suspense, lazy } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { MemoryRouter, Navigate, Route, Routes } from 'react-router-dom'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { AuthProvider } from '@/lib/AuthProvider'
import {
  clearSession,
  writeSession,
  DEMO_USER,
  SEED_AGENCY_PASSWORD,
} from '@/lib/authApi'
import { useAuth } from '@/lib/useAuth'

const AuthenticatedLayout = lazy(() => import('@/layout/AuthenticatedLayout'))
const DummyPage = lazy(() => import('@/pages/DummyPage'))
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'))

afterEach(() => {
  cleanup()
  clearSession()
})

function CatchAllRedirect() {
  const { status } = useAuth()
  return (
    <Navigate to={status === 'authenticated' ? '/' : '/login'} replace />
  )
}

function renderRoutes(initialPath: string) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <Suspense fallback={<div>Loading</div>}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<AuthenticatedLayout />}>
              <Route index element={<DummyPage title="Home" />} />
            </Route>
            <Route path="*" element={<CatchAllRedirect />} />
          </Routes>
        </Suspense>
      </MemoryRouter>
    </AuthProvider>,
  )
}

function expectAuthenticatedShell() {
  expect(document.querySelector('.pd-app-shell')).toBeTruthy()
  expect(screen.queryByRole('button', { name: /log in/i })).not.toBeInTheDocument()
}

describe('auth route guards', () => {
  it('redirects anonymous users from protected routes to login', async () => {
    clearSession()
    renderRoutes('/')

    expect(
      await screen.findByRole('button', { name: /log in/i }, { timeout: 5000 }),
    ).toBeInTheDocument()
  })

  it('shows login for anonymous visitors', async () => {
    clearSession()
    renderRoutes('/login')

    expect(
      await screen.findByRole('button', { name: /log in/i }, { timeout: 5000 }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /choose a saved account/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /continue with google/i }),
    ).not.toBeInTheDocument()
  })

  it('keeps authenticated users off the login page', async () => {
    writeSession({
      user: DEMO_USER,
      tenantId: 'tenant-full',
      signedInAt: '2026-01-01T00:00:00.000Z',
    })
    renderRoutes('/login')

    await waitFor(() => {
      expectAuthenticatedShell()
    })
  })

  it('signs in with email and password', async () => {
    clearSession()
    renderRoutes('/login')

    fireEvent.change(
      await screen.findByRole('textbox', { name: /email/i }, { timeout: 5000 }),
      { target: { value: 'ops@onetrack.bd' } },
    )
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: SEED_AGENCY_PASSWORD },
    })
    fireEvent.click(screen.getByRole('button', { name: /log in/i }))

    await waitFor(
      () => {
        expectAuthenticatedShell()
      },
      { timeout: 5000 },
    )
  })
})
