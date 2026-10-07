import { Navigate, useParams } from 'react-router-dom'
import { ModuleEntitlementsEditor } from '@/components/admin/ModuleEntitlementsEditor'
import { useTenantById } from '@/lib/tenantsStore'

export default function TenantModulesPage() {
  const { tenantId = '' } = useParams()
  const tenant = useTenantById(tenantId)

  if (!tenant) {
    return <Navigate to="/admin/tenants" replace />
  }

  return (
    <section className="pd-admin__modules-page" aria-label="Modules">
      <p className="pd-admin__modules-intro">
        Enable the service lines and workspaces this agency can use. Changes apply
        immediately for signed-in staff.
      </p>
      <ModuleEntitlementsEditor tenant={tenant} />
    </section>
  )
}
