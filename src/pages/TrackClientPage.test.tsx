import { afterEach, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import TrackClientPage from '@/pages/TrackClientPage'

afterEach(() => {
  cleanup()
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
})
