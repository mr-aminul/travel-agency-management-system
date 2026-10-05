import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import { BackButton } from '@/components/ui/BackButton'

describe('BackButton', () => {
  it('renders a themed arrow with Back to text', () => {
    render(
      <MemoryRouter>
        <BackButton to="/clients" label="Clients" />
      </MemoryRouter>,
    )

    const link = screen.getByRole('link', { name: 'Back to Clients' })
    expect(link).toHaveAttribute('href', '/clients')
    expect(link).toHaveTextContent('Back to Clients')
    expect(link.querySelector('.pd-btn--icon')).not.toBeNull()
  })

  it('renders an action button with the same copy', () => {
    let clicked = false
    render(
      <BackButton
        label="Catalog"
        onClick={() => {
          clicked = true
        }}
      />,
    )

    const button = screen.getByRole('button', { name: 'Back to Catalog' })
    expect(button).toHaveTextContent('Back to Catalog')
    fireEvent.click(button)
    expect(clicked).toBe(true)
  })
})
