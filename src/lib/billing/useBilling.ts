import { useCallback, useEffect, useState } from 'react'
import {
  fetchBillingMe,
  fetchBillingPlans,
} from '@/lib/billing/billingApi'
import { authApiConfigured } from '@/lib/billing/platformFlag'
import { PLAN_CATALOG } from '@/lib/billing/planCatalog'
import type {
  BillingSnapshot,
  PaymentInstructions,
  PlanTemplate,
} from '@/types/billing'

export function useBilling(tenantId?: string) {
  const [snapshot, setSnapshot] = useState<BillingSnapshot | null>(null)
  const [plans, setPlans] = useState<PlanTemplate[]>(PLAN_CATALOG)
  const [instructions, setInstructions] =
    useState<PaymentInstructions | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const catalog = await fetchBillingPlans()
      setPlans(catalog.plans)
      setInstructions(catalog.instructions)
      if (authApiConfigured()) {
        const me = await fetchBillingMe(tenantId)
        setSnapshot(me)
        if (me.instructions) setInstructions(me.instructions)
      } else {
        setSnapshot(null)
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not load billing.',
      )
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    void reload()
  }, [reload])

  return {
    snapshot,
    plans,
    instructions,
    loading,
    error,
    reload,
    apiEnabled: authApiConfigured(),
  }
}
