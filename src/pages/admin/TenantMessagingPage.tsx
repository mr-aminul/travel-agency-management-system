import { useParams } from 'react-router-dom'
import { MessageSquareText } from 'lucide-react'
import { AdminTenantMessagingEditor } from '@/components/admin/AdminTenantMessagingEditor'
import { useTenantById } from '@/lib/tenantsStore'

export default function TenantMessagingPage() {
  const { tenantId = '' } = useParams()
  const tenant = useTenantById(tenantId)

  // Layout owns the missing-agency redirect.
  if (!tenant) return null

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
