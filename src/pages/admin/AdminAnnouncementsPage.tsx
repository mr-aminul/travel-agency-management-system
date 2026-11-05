import { useAuth } from '@/lib/auth'
import { AdminAnnouncementsPanel } from '@/components/admin/AdminAnnouncementsPanel'
import '@/styles/layout-admin.css'
import '@/styles/layout-clients.css'

export default function AdminAnnouncementsPage() {
  const { user } = useAuth()
  if (user?.role !== 'platform_admin') return null

  return (
    <div className="pd-page pd-admin pd-clients" aria-label="Announcements">
      <AdminAnnouncementsPanel />
    </div>
  )
}
