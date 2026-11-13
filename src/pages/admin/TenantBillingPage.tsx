import { CreditCard } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { AdminTenantBillingPanel } from '@/components/admin/AdminTenantBillingPanel'
import { useTenantById } from '@/lib/tenantsStore'

export default function TenantBillingPage() {
  const { tenantId = '' } = useParams()
  const tenant = useTenantById(tenantId)

  // Layout owns the missing-agency redirect.
  if (!tenant) return null

  return (
    <div className="flex flex-col gap-4" aria-label="Billing">
      <div className="flex items-center gap-2">
        <span
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-theme-subtle)] text-[var(--color-theme-ink)]"
          aria-hidden
        >
          <CreditCard size={15} strokeWidth={2.25} />
        </span>
        <h2 className="m-0 text-sm font-semibold">Billing</h2>
      </div>
      <AdminTenantBillingPanel tenantId={tenant.id} variant="workspace" />
    </div>
  )
}
