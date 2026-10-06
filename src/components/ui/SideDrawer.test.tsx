import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { SideDrawer } from '@/components/ui/SideDrawer'

afterEach(() => {
  cleanup()
  localStorage.removeItem('pd-drawer-width')
})

describe('SideDrawer', () => {
  it('exposes a resize grip on the right panel', () => {
    render(
      <SideDrawer open onClose={() => undefined} title="Add service">
        Form
      </SideDrawer>,
    )

    expect(screen.getByRole('separator', { name: 'Resize panel' })).toBeInTheDocument()
  })

  it('widens the panel when the grip is dragged left', () => {
    render(
      <SideDrawer open onClose={() => undefined} title="Add service">
        Form
      </SideDrawer>,
    )

    const panel = screen.getByRole('dialog', { name: 'Add service' })
    Object.defineProperty(panel, 'offsetWidth', { configurable: true, value: 448 })

    const grip = screen.getByRole('separator', { name: 'Resize panel' })
    fireEvent.pointerDown(grip, { button: 0, pointerId: 1, clientX: 800 })
    fireEvent.pointerMove(grip, { pointerId: 1, clientX: 680 })
    fireEvent.pointerUp(grip, { pointerId: 1, clientX: 680 })

    expect(panel.style.getPropertyValue('--drawer-width')).toBe('568px')
    expect(localStorage.getItem('pd-drawer-width')).toBe('568')
  })

  it('restores the default width on grip double-click', () => {
    localStorage.setItem('pd-drawer-width', '640')

    render(
      <SideDrawer open onClose={() => undefined} title="Add service">
        Form
      </SideDrawer>,
    )

    const panel = screen.getByRole('dialog', { name: 'Add service' })
    expect(panel.style.getPropertyValue('--drawer-width')).toBe('640px')

    fireEvent.doubleClick(screen.getByRole('separator', { name: 'Resize panel' }))

    expect(panel.style.getPropertyValue('--drawer-width')).toBe('')
    expect(localStorage.getItem('pd-drawer-width')).toBeNull()
  })
})
