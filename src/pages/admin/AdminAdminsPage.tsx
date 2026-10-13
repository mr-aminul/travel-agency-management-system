import { useAuth } from '@/lib/auth'
import { AdminPlatformAdminsPanel } from '@/components/admin/AdminPlatformAdminsPanel'
import '@/styles/layout-admin.css'
import '@/styles/layout-clients.css'

export default function AdminAdminsPage() {
  const { user } = useAuth()
  if (user?.role !== 'platform_admin') return null

  return (
    <div className="pd-page pd-admin pd-clients" aria-label="Admins">
      <AdminPlatformAdminsPanel />
    </div>
  )
}
