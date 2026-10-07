import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { FilterChip, FilterChips } from '@/components/ui/FilterChips'

describe('FilterChips', () => {
  it('renders a labeled chip row with the shared layout class', () => {
    render(
      <FilterChips label="Filter by service type">
        <FilterChip active>All services</FilterChip>
        <FilterChip>Tourist Visa</FilterChip>
      </FilterChips>,
    )

    const group = screen.getByRole('navigation', {
      name: 'Filter by service type',
    })
    expect(group).toHaveClass('pd-filter-chips')
    expect(screen.getByRole('button', { name: 'All services' })).toHaveClass(
      'pd-filter-chip',
      'is-active',
    )
    expect(screen.getByRole('button', { name: 'All services' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(
      screen.getByRole('button', { name: 'Tourist Visa' }),
    ).toHaveAttribute('aria-pressed', 'false')
  })

  it('fires click handlers on chips', () => {
    const onSelect = vi.fn()
    render(
      <FilterChips label="Filters">
        <FilterChip onClick={onSelect}>Air Ticket</FilterChip>
      </FilterChips>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Air Ticket' }))
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it('keeps horizontal gap in the shared stylesheet so bare buttons cannot regress', () => {
    const css = readFileSync(
      resolve(process.cwd(), 'src/styles/ui.css'),
      'utf8',
    )
    const rule = css.match(
      /\.pd-filter-chips\s*\{[^}]*\}/s,
    )?.[0]

    expect(rule).toBeTruthy()
    expect(rule).toMatch(/display:\s*flex/)
    expect(rule).toMatch(/gap:\s*0\.5rem/)
    expect(rule).toMatch(/flex-wrap:\s*wrap/)
  })
})
