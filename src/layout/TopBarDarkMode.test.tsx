import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { APPEARANCE_KEY } from '@/lib/brand'
import { TopBarDarkMode } from './TopBarDarkMode'

afterEach(() => {
  cleanup()
  document.documentElement.classList.remove('dark')
  localStorage.removeItem(APPEARANCE_KEY)
})

describe('TopBarDarkMode', () => {
  it('switches the document to dark mode on click', () => {
    render(<TopBarDarkMode />)

    fireEvent.click(
      screen.getByRole('button', { name: 'Switch to dark mode' }),
    )

    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem(APPEARANCE_KEY)).toBe('dark')
    expect(
      screen.getByRole('button', { name: 'Switch to light mode' }),
    ).toHaveAttribute('aria-pressed', 'true')
  })
})
