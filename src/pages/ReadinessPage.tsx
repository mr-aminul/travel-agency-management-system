import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ListChecks } from 'lucide-react'
import { useCases } from '@/lib/casesStore'
import { EmptyState, FilterPopover, PageHeader } from '@/components/ui'
import {
  buildReadinessBoard,
  buildReadinessQueue,
  type ReadinessItem,
  type ReadinessState,
} from '@/lib/clientReadiness'
import { useEnabledServiceOptions } from '@/lib/serviceCatalog'
import type { ServiceType } from '@/types/case'
import '@/styles/layout-readiness.css'

const STATE_LABEL: Record<ReadinessState, string> = {
  actionable: 'Ready',
  blocked: 'Blocked',
  'on-hold': 'On hold',
}

function initials(name: string): string {
  const parts = name
    .replace(/\b(md|dr|mrs|mr|ms)\.?\b/gi, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function place(item: ReadinessItem): string {
  if (item.destination === '—') return item.service
  const parts = item.destination.split(',')
  const country = parts[parts.length - 1]?.trim()
  return country || item.destination
}

function waitLabel(days: number): string {
  if (days <= 0) return 'Today'
  return `${days}d`
}

function ProgressRail({ item }: { item: ReadinessItem }) {
  return (
    <span className="pd-readiness__rail" aria-hidden>
      {Array.from({ length: item.stepCount }, (_, index) => {
        const position = index + 1
        const tone =
          position < item.stepNumber
            ? 'done'
            : position === item.stepNumber
              ? 'now'
              : 'next'
        return (
          <span
            key={position}
            className={`pd-readiness__bead pd-readiness__bead--${tone}`}
          />
        )
      })}
    </span>
  )
}

function NextStep({ item, size }: { item: ReadinessItem; size?: 'lg' }) {
  return (
    <span className={size === 'lg' ? 'pd-readiness__flow pd-readiness__flow--lg' : 'pd-readiness__flow'}>
      <span className="pd-readiness__pill pd-readiness__pill--now">{item.stepLabel}</span>
      <ArrowRight size={size === 'lg' ? 16 : 12} strokeWidth={2.25} aria-hidden />
      <span className="pd-readiness__pill pd-readiness__pill--next">
        {item.nextStepLabel ?? 'Done'}
      </span>
    </span>
  )
}

export default function ReadinessPage() {
  const navigate = useNavigate()
  const cases = useCases()
  const enabledServices = useEnabledServiceOptions()
  const enabledKeys = useMemo(
    () => new Set(enabledServices.map((option) => option.value)),
    [enabledServices],
  )

  const [serviceFilters, setServiceFilters] = useState<string[]>([])

  const scopedCases = useMemo(
    () => cases.filter((item) => enabledKeys.has(item.service)),
    [cases, enabledKeys],
  )

  const filters = useMemo(
    () => ({
      services: serviceFilters.length
        ? (serviceFilters as ServiceType[])
        : undefined,
    }),
    [serviceFilters],
  )

  const queue = useMemo(
    () => buildReadinessQueue(scopedCases, filters),
    [scopedCases, filters],
  )
  const board = useMemo(
    () => buildReadinessBoard(scopedCases, filters),
    [scopedCases, filters],
  )

  const focus = queue.items.slice(0, 4)

  return (
    <div className="pd-page pd-readiness" aria-label="Stage readiness">
      <PageHeader
        title="Stage readiness"
        description="Who to move next — and where everyone sits."
        actions={
          <FilterPopover
            sectionLabel="Filter"
            dimensions={[
              {
                id: 'service',
                label: 'Service',
                icon: ListChecks,
                options: enabledServices.map((option) => ({
                  value: option.value,
                  label: option.label,
                })),
                value: serviceFilters,
                onChange: setServiceFilters,
              },
            ]}
            onClearAll={
              serviceFilters.length ? () => setServiceFilters([]) : undefined
            }
          />
        }
      />

      {queue.items.length === 0 ? (
        <EmptyState
          title={serviceFilters.length ? 'No matching files' : 'No open services'}
          description={
            serviceFilters.length
              ? 'Clear the service filter to see everyone.'
              : 'Open files will appear here with their current and next step.'
          }
        />
      ) : (
        <>
          <section className="pd-readiness__focus" aria-label="Do now">
            <header className="pd-readiness__section-head">
              <h2 className="pd-readiness__section-title">Do now</h2>
              <ul className="pd-readiness__legend">
                {(['blocked', 'actionable', 'on-hold'] as const).map((state) => (
                  <li key={state}>
                    <span className={`pd-readiness__dot pd-readiness__dot--${state}`} />
                    {STATE_LABEL[state]}
                  </li>
                ))}
              </ul>
            </header>
            <div className="pd-readiness__focus-grid">
              {focus.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`pd-readiness__hero pd-readiness__hero--${item.state}`}
                  onClick={() => navigate(item.href)}
                >
                  <span className="pd-readiness__hero-top">
                    <span className="pd-readiness__avatar" aria-hidden>
                      {initials(item.clientName)}
                    </span>
                    <span className="pd-readiness__hero-copy">
                      <span className="pd-readiness__hero-name">{item.clientName}</span>
                      <span className="pd-readiness__hero-place">{place(item)}</span>
                    </span>
                    <span className="pd-readiness__wait">{waitLabel(item.daysWaiting)}</span>
                  </span>
                  <NextStep item={item} size="lg" />
                  <ProgressRail item={item} />
                </button>
              ))}
            </div>
          </section>

          <section className="pd-readiness__pipeline" aria-label="Everyone by step">
            <header className="pd-readiness__section-head">
              <h2 className="pd-readiness__section-title">Everyone</h2>
              <p className="pd-readiness__section-meta">{queue.openCount} open</p>
            </header>
            <div className="pd-readiness__lanes">
              {board.columns.map((column) => (
                <section
                  key={column.stepId}
                  className="pd-readiness__lane"
                  aria-label={`${column.label}, ${column.count}`}
                >
                  <header className="pd-readiness__lane-head">
                    <h3 className="pd-readiness__lane-title">{column.label}</h3>
                    <span className="pd-readiness__lane-count">{column.count}</span>
                  </header>
                  <ul className="pd-readiness__tiles">
                    {column.items.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          className={`pd-readiness__tile pd-readiness__tile--${item.state}`}
                          onClick={() => navigate(item.href)}
                          aria-label={`${item.clientName}, ${item.stepLabel} then ${item.nextStepLabel ?? 'done'}`}
                        >
                          <span className="pd-readiness__tile-id">
                            <span className="pd-readiness__avatar pd-readiness__avatar--sm" aria-hidden>
                              {initials(item.clientName)}
                            </span>
                            <span className="pd-readiness__tile-copy">
                              <span className="pd-readiness__name">{item.clientName}</span>
                              <span className="pd-readiness__place">{place(item)}</span>
                            </span>
                          </span>
                          <NextStep item={item} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
