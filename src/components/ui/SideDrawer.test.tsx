import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { SideDrawer } from '@/components/ui/SideDrawer'

afterEach(() => {
  cleanup()
  localStorage.removeItem('pd-drawer-width')
})

describe('SideDrawer', () => {
  it('mounts on document.body so it can cover shell chrome', () => {
    render(
      <SideDrawer open onClose={() => undefined} title="Add service">
        Form
      </SideDrawer>,
    )

    const dialog = screen.getByRole('dialog', { name: 'Add service' })
    expect(dialog.closest('.pd-drawer')?.parentElement).toBe(document.body)
  })

  it('exposes a resize grip on the right panel', () => {
    render(
      <SideDrawer open onClose={() => undefined} title="Add service">
        Form
      </SideDrawer>,
    )

    expect(screen.getByRole('separator', { name: 'Resize panel' })).toBeInTheDocument()
  })

  it('slides the panel in from the right when opened', () => {
    render(
      <SideDrawer open onClose={() => undefined} title="Add service">
        Form
      </SideDrawer>,
    )

    expect(screen.getByRole('dialog', { name: 'Add service' })).toHaveClass('is-entering')
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

  it('does not replay the enter animation after a resize drag ends', () => {
    render(
      <SideDrawer open onClose={() => undefined} title="Add service">
        Form
      </SideDrawer>,
    )

    const panel = screen.getByRole('dialog', { name: 'Add service' })
    Object.defineProperty(panel, 'offsetWidth', { configurable: true, value: 448 })

    const grip = screen.getByRole('separator', { name: 'Resize panel' })
    fireEvent.pointerDown(grip, { button: 0, pointerId: 1, clientX: 800 })
    expect(panel).not.toHaveClass('is-entering')

    fireEvent.pointerMove(grip, { pointerId: 1, clientX: 680 })
    fireEvent.pointerUp(grip, { pointerId: 1, clientX: 680 })

    expect(panel).not.toHaveClass('is-entering')
    expect(panel).not.toHaveClass('is-resizing')
  })

  it('ignores the backdrop click that follows a resize drag', () => {
    const onClose = vi.fn()
    render(
      <SideDrawer open onClose={onClose} title="Add service">
        Form
      </SideDrawer>,
    )

    const panel = screen.getByRole('dialog', { name: 'Add service' })
    Object.defineProperty(panel, 'offsetWidth', { configurable: true, value: 448 })

    const grip = screen.getByRole('separator', { name: 'Resize panel' })
    fireEvent.pointerDown(grip, { button: 0, pointerId: 1, clientX: 800 })
    fireEvent.pointerMove(grip, { pointerId: 1, clientX: 680 })
    fireEvent.pointerUp(grip, { pointerId: 1, clientX: 680 })
    fireEvent.click(screen.getByRole('button', { name: 'Close panel' }))

    expect(onClose).not.toHaveBeenCalled()
  })
})
