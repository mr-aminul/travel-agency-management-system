import { Link, useNavigate } from 'react-router-dom'
import {
  Activity,
  Building2,
  PauseCircle,
  Timer,
  Users,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import {
  ADMIN_ACTIVITY,
  ADMIN_AGENCIES,
  ADMIN_PEOPLE,
  ADMIN_PLATFORM,
  adminAgencyPath,
} from '@/lib/adminPaths'
import { useTenantMembers } from '@/lib/tenantMembersStore'
import { useTenants } from '@/lib/tenantsStore'
import { StatCards, type StatCardItem } from '@/components/StatCards'
import {
  Badge,
  Button,
  PageHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  type BadgeVariant,
} from '@/components/ui'
import type { TenantStatus } from '@/types/tenant'
import '@/styles/layout-admin.css'

function statusBadgeVariant(status: TenantStatus): BadgeVariant {
  if (status === 'active') return 'completed'
  if (status === 'trial') return 'pending'
  return 'danger'
}

export default function AdminOverviewPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const tenants = useTenants()
  const members = useTenantMembers()

  if (user?.role !== 'platform_admin') return null

  const active = tenants.filter((t) => t.status === 'active').length
  const trial = tenants.filter((t) => t.status === 'trial').length
  const suspended = tenants.filter((t) => t.status === 'suspended').length
  const activePeople = members.filter((m) => m.status === 'active').length

  const cards: StatCardItem[] = [
    {
      id: 'agencies',
      label: 'Agencies',
      value: String(tenants.length),
      hint: `${active} active`,
      icon: Building2,
      tone: 'brand',
    },
    {
      id: 'trial',
      label: 'On trial',
      value: String(trial),
      hint: 'Needs attention soon',
      icon: Timer,
      tone: trial > 0 ? 'warning' : 'muted',
    },
    {
      id: 'suspended',
      label: 'Suspended',
      value: String(suspended),
      hint: 'Cannot sign in',
      icon: PauseCircle,
      tone: suspended > 0 ? 'warning' : 'muted',
    },
    {
      id: 'people',
      label: 'Active people',
      value: String(activePeople),
      hint: 'Agency users',
      icon: Users,
      tone: 'info',
    },
  ]

  const attention = tenants.filter(
    (t) => t.status === 'trial' || t.status === 'suspended',
  )

  return (
    <div className="pd-page pd-admin" aria-label="Platform overview">
      <PageHeader
        title="Overview"
        description="Platform pulse — agencies that need attention and shortcuts into daily ops."
        actions={
          <Button onClick={() => navigate(ADMIN_AGENCIES)}>All agencies</Button>
        }
      />

      <StatCards label="Platform metrics" cards={cards} />

      <section className="pd-admin__panel" aria-labelledby="admin-attention-title">
        <header className="pd-admin__panel-header">
          <div>
            <h2 id="admin-attention-title" className="pd-admin__panel-title">
              Needs attention
            </h2>
            <p className="pd-admin__panel-desc">
              Trials and suspended agencies. Open an agency to manage status or
              enter Support Mode.
            </p>
          </div>
        </header>
        {attention.length === 0 ? (
          <p className="pd-admin__quiet">All agencies look healthy.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agency</TableHead>
                <TableHead>Status</TableHead>
                <TableHead aria-label="Open" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {attention.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell>
                    <Link
                      className="pd-admin__business-name"
                      to={adminAgencyPath(tenant.id)}
                    >
                      {tenant.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariant(tenant.status)}>
                      {tenant.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate(adminAgencyPath(tenant.id))}
                    >
                      Open
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section className="pd-admin__shortcuts" aria-label="Shortcuts">
        <Link className="pd-admin__shortcut" to={ADMIN_PEOPLE}>
          <Users size={18} aria-hidden />
          <span>
            <strong>People</strong>
            <span>Find any login across agencies</span>
          </span>
        </Link>
        <Link className="pd-admin__shortcut" to={ADMIN_ACTIVITY}>
          <Activity size={18} aria-hidden />
          <span>
            <strong>Activity</strong>
            <span>Audit log and inbound SMS</span>
          </span>
        </Link>
        <Link className="pd-admin__shortcut" to={ADMIN_PLATFORM}>
          <Building2 size={18} aria-hidden />
          <span>
            <strong>Platform</strong>
            <span>Admins, defaults, announcements</span>
          </span>
        </Link>
      </section>
    </div>
  )
}
