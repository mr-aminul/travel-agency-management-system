import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Folder, Plus } from 'lucide-react'
import { Badge, Button, EmptyState } from '@/components/ui'
import { cx } from '@/lib/cx'
import { useServiceIconOverrides } from '@/lib/serviceIconOverridesStore'
import { iconForService } from '@/lib/serviceIcons'
import { workDetailPath } from '@/lib/workPaths'
import type { Case } from '@/types/case'
import { caseStatusBadgeVariant } from '@/components/cases/CasesList'
import '@/styles/layout-cases.css'

export type ClientServicesWorkspaceProps = {
  cases: Case[]
  clientName: string
  selectedId?: string
  onAddService: () => void
  children: ReactNode
}

export function ClientServicesWorkspace({
  cases,
  clientName,
  selectedId,
  onAddService,
  children,
}: ClientServicesWorkspaceProps) {
  useServiceIconOverrides()

  if (cases.length === 0) {
    return (
      <section
        className="pd-service-workspace"
        aria-label={`${clientName} services`}
      >
        <EmptyState
          icon={Folder}
          title="No services yet"
          description="Add a service on this profile to track steps, documents, and payments."
          action={
            <Button onClick={onAddService}>
              <Plus size={16} strokeWidth={2.25} aria-hidden />
              Add service
            </Button>
          }
        />
      </section>
    )
  }

  return (
    <section
      className="pd-service-workspace"
      aria-label={`${clientName} services`}
    >
      <aside className="pd-service-rail">
        <div className="pd-service-rail__head">
          <p className="pd-service-rail__title">Services</p>
          <Button
            size="sm"
            variant="ghost"
            onClick={onAddService}
            aria-label="Add service"
          >
            <Plus size={14} strokeWidth={2.25} aria-hidden />
            Add
          </Button>
        </div>
        <nav className="pd-service-rail__list" aria-label="Service files">
          {cases.map((item) => {
            const selected = item.id === selectedId
            const Icon = iconForService(item.service)
            return (
              <Link
                key={item.id}
                to={workDetailPath(item)}
                className={cx(
                  'pd-service-rail__item',
                  selected && 'is-selected',
                )}
                aria-current={selected ? 'page' : undefined}
                aria-label={`${item.service}, ${item.caseId}`}
              >
                <span className="pd-service-rail__icon" aria-hidden>
                  <Icon size={14} strokeWidth={2.25} />
                </span>
                <span className="pd-service-rail__copy">
                  <span className="pd-service-rail__name">{item.service}</span>
                </span>
                <Badge variant={caseStatusBadgeVariant(item.status)}>
                  {item.status}
                </Badge>
              </Link>
            )
          })}
        </nav>
      </aside>
      <div className="pd-service-workspace__main">
        {selectedId ? (
          children
        ) : (
          <EmptyState
            icon={Folder}
            title="Open a service file"
            description="Choose a file on the left to work its pipeline."
          />
        )}
      </div>
    </section>
  )
}
