import { useAuth } from '@/lib/auth'
import { AdminPlansPanel } from '@/components/admin/AdminPlansPanel'
import '@/styles/layout-admin.css'

export default function AdminPlansPage() {
  const { user } = useAuth()
  if (user?.role !== 'platform_admin') return null

  return (
    <div className="pd-page pd-admin" aria-label="Plans">
      <AdminPlansPanel />
    </div>
  )
}
