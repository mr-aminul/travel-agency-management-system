import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Select } from '@/components/ui/Select'
import { SideDrawer } from '@/components/ui/SideDrawer'

afterEach(() => {
  cleanup()
  localStorage.removeItem('pd-drawer-width')
})

describe('Select', () => {
  it('portals the options panel to document.body above the side drawer', () => {
    Element.prototype.scrollIntoView = () => undefined

    render(
      <SideDrawer open onClose={() => undefined} title="Add service">
        <Select
          label="Service"
          value="Tourist Visa"
          options={[
            { value: 'Tourist Visa', label: 'Tourist Visa' },
            { value: 'Air Ticket', label: 'Air Ticket' },
          ]}
        />
      </SideDrawer>,
    )

    fireEvent.click(screen.getByLabelText('Service'))

    const panel = screen.getByRole('option', { name: 'Air Ticket' }).closest(
      '.pd-select__panel',
    )
    expect(panel).not.toBeNull()
    expect(panel?.parentElement).toBe(document.body)
    expect(panel?.closest('.pd-drawer')).toBeNull()
  })
})
