import { useParams } from 'react-router-dom'
import { Boxes } from 'lucide-react'
import { AdminTenantMessagingEditor } from '@/components/admin/AdminTenantMessagingEditor'
import { ModuleEntitlementsEditor } from '@/components/admin/ModuleEntitlementsEditor'
import { useTenantById } from '@/lib/tenantsStore'

export default function TenantModulesPage() {
  const { tenantId = '' } = useParams()
  const tenant = useTenantById(tenantId)

  // Layout owns the missing-agency redirect.
  if (!tenant) return null

  return (
    <div className="flex flex-col gap-4" aria-label="Access">
      <div className="flex items-center gap-2">
        <span
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-theme-subtle)] text-[var(--color-theme-ink)]"
          aria-hidden
        >
          <Boxes size={15} strokeWidth={2.25} />
        </span>
        <h2 className="m-0 text-sm font-semibold">Access</h2>
      </div>
      <section className="overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm">
        <ModuleEntitlementsEditor tenant={tenant} />
      </section>
      <div className="max-w-3xl">
        <AdminTenantMessagingEditor tenantId={tenant.id} />
      </div>
    </div>
  )
}
