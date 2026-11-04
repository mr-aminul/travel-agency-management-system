import { useParams } from 'react-router-dom'
import { ScrollText } from 'lucide-react'
import { useTenantById } from '@/lib/tenantsStore'
import AdminActivityPage from '@/pages/admin/AdminActivityPage'

export default function TenantActivityPage() {
  const { tenantId = '' } = useParams()
  const tenant = useTenantById(tenantId)

  // Layout owns the missing-agency redirect.
  if (!tenant) return null

  return (
    <div className="pd-client-detail__overview" aria-label="Activity">
      <section className="pd-client-detail__section pd-client-detail__section--compact">
        <div className="pd-client-detail__section-head">
          <h2 className="pd-client-detail__section-title">
            <span className="pd-client-detail__section-icon" aria-hidden>
              <ScrollText size={15} strokeWidth={2.25} />
            </span>
            Activity
          </h2>
        </div>
        <AdminActivityPage lockedTenantId={tenant.id} />
      </section>
    </div>
  )
}
