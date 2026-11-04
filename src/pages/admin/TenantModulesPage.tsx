import { useParams } from 'react-router-dom'
import { Boxes } from 'lucide-react'
import { ModuleEntitlementsEditor } from '@/components/admin/ModuleEntitlementsEditor'
import { useTenantById } from '@/lib/tenantsStore'

export default function TenantModulesPage() {
  const { tenantId = '' } = useParams()
  const tenant = useTenantById(tenantId)

  // Layout owns the missing-agency redirect.
  if (!tenant) return null

  return (
    <div className="pd-client-detail__overview" aria-label="Product">
      <section className="pd-client-detail__section pd-client-detail__section--compact">
        <div className="pd-client-detail__section-head">
          <h2 className="pd-client-detail__section-title">
            <span className="pd-client-detail__section-icon" aria-hidden>
              <Boxes size={15} strokeWidth={2.25} />
            </span>
            Product
          </h2>
        </div>
        <ModuleEntitlementsEditor tenant={tenant} />
      </section>
    </div>
  )
}
