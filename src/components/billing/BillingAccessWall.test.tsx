import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BillingAccessWall } from './BillingAccessWall'

describe('BillingAccessWall', () => {
  it('shows trial-ended copy when reason is trial_expired', () => {
    render(
      <BillingAccessWall
        kind="expired"
        reason="trial_expired"
        onBilling={vi.fn()}
        onSignOut={vi.fn()}
      />,
    )
    expect(
      screen.getByRole('heading', { name: 'Trial Ended' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Choose A Plan' })).toBeInTheDocument()
  })

  it('shows subscription-ended copy for other expired reasons', () => {
    render(
      <BillingAccessWall
        kind="expired"
        reason="canceled"
        onBilling={vi.fn()}
        onSignOut={vi.fn()}
      />,
    )
    expect(
      screen.getByRole('heading', { name: 'Subscription Ended' }),
    ).toBeInTheDocument()
  })
})
