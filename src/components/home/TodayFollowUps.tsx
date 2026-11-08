import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  CheckCircle2,
  ClipboardCheck,
  FileWarning,
  ListTodo,
} from 'lucide-react'
import { useCases } from '@/lib/casesStore'
import { useClients } from '@/lib/clientsStore'
import { isPathAllowed } from '@/lib/modules'
import { useRequests } from '@/lib/requestsStore'
import { findSubAgentById } from '@/lib/subAgentsStore'
import { usePendingChanges } from '@/lib/subAgentPendingChanges'
import {
  buildTodayFollowUps,
  todayBucketsWithWork,
  todayFollowUpsHeadline,
  todayFollowUpsTotal,
  type TodayBucketId,
  type TodayFollowUpItem,
} from '@/lib/todayFollowUps'
import { useActiveTenant } from '@/lib/useActiveTenant'
import { useAuth } from '@/lib/useAuth'
import '@/styles/layout-home.css'

const BUCKET_ICON = {
  money: Banknote,
  docs: FileWarning,
  stuck: AlertTriangle,
  approvals: ClipboardCheck,
} as const

export function TodayFollowUps() {
  const { user } = useAuth()
  const tenant = useActiveTenant()
  const cases = useCases()
  const clients = useClients()
  const requests = useRequests()
  const pendingChanges = usePendingChanges(tenant.id)

  const includeApprovals = isPathAllowed(
    '/approvals',
    tenant.enabledModules,
    user?.role ?? 'agency_user',
  )

  const summary = useMemo(
    () =>
      buildTodayFollowUps({
        cases,
        clients,
        requests,
        pendingChanges,
        includeApprovals,
        approvalsScopeSubAgentId:
          user?.role === 'sub_agent' ? user.subAgentId : undefined,
        resolveSubAgentName: (id) => findSubAgentById(id)?.name,
      }),
    [
      cases,
      clients,
      requests,
      pendingChanges,
      includeApprovals,
      user?.role,
      user?.subAgentId,
    ],
  )

  const total = todayFollowUpsTotal(summary)
  const queues = todayBucketsWithWork(summary, { includeApprovals })

  return (
    <section
      className="pd-today pd-today--desk"
      aria-label={`Today. ${todayFollowUpsHeadline(summary)}`}
      data-tour="home-today"
    >
      <header className="pd-today__head">
        <div className="pd-today__title-row">
          <span className="pd-today__icon" aria-hidden>
            <ListTodo size={16} strokeWidth={2.25} />
          </span>
          <h1 className="pd-today__title">Today</h1>
          {total > 0 ? (
            <span className="pd-today__count">{total}</span>
          ) : (
            <span className="pd-today__clear" aria-hidden>
              <CheckCircle2 size={16} strokeWidth={2.25} />
            </span>
          )}
        </div>
      </header>

      {total === 0 ? (
        <p className="pd-today__empty">Nothing due today.</p>
      ) : (
        <div className="pd-today__queues">
          {queues.map((bucket) => (
            <TodayQueue
              key={bucket.id}
              id={bucket.id}
              label={bucket.label}
              items={summary[bucket.id].items}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function TodayQueue({
  id,
  label,
  items,
}: {
  id: TodayBucketId
  label: string
  items: TodayFollowUpItem[]
}) {
  const Icon = BUCKET_ICON[id]

  return (
    <section className="pd-today__queue" aria-label={label}>
      <h2 className="pd-today__queue-title">
        <span className="pd-today__queue-label">{label}</span>
        <span className="pd-today__queue-count">{items.length}</span>
      </h2>
      <ul className="pd-today__list">
        {items.map((row) => (
          <li key={row.id}>
            <Link to={row.href} className="pd-today__row">
              <span className="pd-today__row-icon" aria-hidden>
                <Icon size={15} strokeWidth={2.25} />
              </span>
              <span className="pd-today__row-text">
                <span className="pd-today__row-title">{row.title}</span>
                <span className="pd-today__row-detail">{row.detail}</span>
              </span>
              <span className="pd-today__row-go" aria-hidden>
                <ArrowRight size={14} strokeWidth={2.25} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
