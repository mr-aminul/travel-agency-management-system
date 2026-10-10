import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import TrackClientPage from '@/pages/TrackClientPage'

const apiFetch = vi.fn()
const shouldUseApiDataBackend = vi.fn(() => false)

vi.mock('@/lib/apiClient', () => ({
  apiFetch: (...args: unknown[]) => apiFetch(...args),
}))

vi.mock('@/lib/data', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/data')>()
  return {
    ...actual,
    shouldUseApiDataBackend: () => shouldUseApiDataBackend(),
  }
})

afterEach(() => {
  cleanup()
  apiFetch.mockReset()
  shouldUseApiDataBackend.mockReset()
  shouldUseApiDataBackend.mockReturnValue(false)
})

function renderTrack(path = '/track') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/track" element={<TrackClientPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('public client tracking', () => {
  it('shows service chips when a passport has multiple services', () => {
    renderTrack('/track?passport=A12345678')

    expect(
      screen.getByRole('heading', { name: 'Application status' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Md. Rahim Uddin')).toBeInTheDocument()

    const services = screen.getByRole('navigation', {
      name: 'Services for this passport',
    })
    expect(
      within(services).getByRole('button', { name: 'Work Permit Visa' }),
    ).toHaveAttribute('aria-pressed', 'true')
    expect(
      within(services).getByRole('button', { name: 'Air Ticket' }),
    ).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByText('GAMCA medical in progress')).toBeInTheDocument()
  })

  it('switches the journey when another service chip is selected', () => {
    renderTrack('/track?passport=A12345678')

    fireEvent.click(screen.getByRole('button', { name: 'Air Ticket' }))

    expect(
      screen.getByRole('button', { name: 'Air Ticket' }),
    ).toHaveAttribute('aria-pressed', 'true')
    expect(
      screen.getByRole('button', { name: 'Work Permit Visa' }),
    ).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByText(/Jeddah, Saudi Arabia/)).toBeInTheDocument()
    expect(screen.getByText('Fare quoted')).toBeInTheDocument()
    expect(screen.queryByText('GAMCA medical in progress')).not.toBeInTheDocument()
  })

  it('does not show service chips for a single-service passport', () => {
    renderTrack('/track?passport=B98765432')

    expect(screen.getByText('Farhana Akter')).toBeInTheDocument()
    expect(
      screen.queryByRole('navigation', { name: 'Services for this passport' }),
    ).not.toBeInTheDocument()
    expect(screen.getByText(/Student Visa/)).toBeInTheDocument()
  })

  it('renders the pipeline journey from the public API payload', async () => {
    shouldUseApiDataBackend.mockReturnValue(true)
    apiFetch.mockResolvedValue({
      client: { name: 'Nusrat Jahan', passport: 'A55667788' },
      services: [
        {
          id: 'case-irh-05',
          type: 'Student Visa',
          status: 'In-Progress',
          currentStep: 'visa',
          currentStepId: 'visa',
          caseId: 'case-irh-05',
          steps: {
            registered: { completedAt: '2025-11-01T00:00:00.000Z' },
            counselled: { completedAt: '2025-11-02T00:00:00.000Z' },
            applied: { completedAt: '2025-11-03T00:00:00.000Z' },
            offer: { completedAt: '2025-11-04T00:00:00.000Z' },
            visa: { completedAt: null, detail: 'Embassy interview pending' },
            ticket: { completedAt: null },
            departed: { completedAt: null },
          },
          createdAt: '2025-11-01T00:00:00.000Z',
          updatedAt: '2025-11-05T00:00:00.000Z',
        },
      ],
    })

    renderTrack('/track?passport=A55667788')

    await waitFor(() => {
      expect(screen.getByText('Nusrat Jahan')).toBeInTheDocument()
    })
    expect(screen.getByLabelText('Service journey')).toBeInTheDocument()
    expect(screen.getByText('Stage 5 of 7')).toBeInTheDocument()
    expect(screen.getByText('Embassy interview pending')).toBeInTheDocument()
    expect(screen.getByText('University applied')).toBeInTheDocument()
  })
})
