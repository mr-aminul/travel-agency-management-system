import { Navigate, useParams } from 'react-router-dom'
import { MessageSquareText } from 'lucide-react'
import { AdminTenantMessagingEditor } from '@/components/admin/AdminTenantMessagingEditor'
import { ADMIN_AGENCIES } from '@/lib/adminPaths'
import { useTenantById } from '@/lib/tenantsStore'

export default function TenantMessagingPage() {
  const { tenantId = '' } = useParams()
  const tenant = useTenantById(tenantId)

  if (!tenant) {
    return <Navigate to={ADMIN_AGENCIES} replace />
  }

  return (
    <div
      className="pd-client-detail__overview"
      aria-label="SMS and Email Permission"
    >
      <section className="pd-client-detail__section pd-client-detail__section--compact">
        <div className="pd-client-detail__section-head">
          <h2 className="pd-client-detail__section-title">
            <span className="pd-client-detail__section-icon" aria-hidden>
              <MessageSquareText size={15} strokeWidth={2.25} />
            </span>
            SMS and Email Permission
          </h2>
        </div>
        <AdminTenantMessagingEditor tenantId={tenant.id} />
      </section>
    </div>
  )
}
