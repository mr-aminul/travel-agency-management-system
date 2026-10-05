import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { CopyableText } from '@/components/ui/CopyableText'

describe('CopyableText', () => {
  it('copies the value instead of acting as a mail link', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })

    render(<CopyableText value="rahim.uddin@email.com" />)

    expect(screen.queryByRole('link')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Copy email' }))
    expect(writeText).toHaveBeenCalledWith('rahim.uddin@email.com')
  })
})
