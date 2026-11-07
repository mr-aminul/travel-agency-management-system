import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Folder, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useServiceIconOverrides } from '@/lib/serviceIconOverridesStore'
import { iconForService } from '@/lib/serviceIcons'
import { workDetailPath } from '@/lib/workPaths'
import type { Case } from '@/types/case'
import { Badge } from '@/components/shadcn/badge'
import { Button } from '@/components/shadcn/button'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/shadcn/empty'

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
        className="flex min-h-[18rem] items-center justify-center rounded-xl border border-border bg-card p-6 shadow-sm"
        aria-label={`${clientName} services`}
      >
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Folder />
            </EmptyMedia>
            <EmptyTitle>No Services Yet</EmptyTitle>
          </EmptyHeader>
          <Button className="h-9 rounded-lg" onClick={onAddService}>
            <Plus data-icon="inline-start" />
            Add Service
          </Button>
        </Empty>
      </section>
    )
  }

  return (
    <section
      className="grid min-h-[22rem] grid-cols-1 gap-3 md:grid-cols-[minmax(12rem,16rem)_minmax(0,1fr)]"
      aria-label={`${clientName} services`}
    >
      <aside className="flex min-w-0 flex-col gap-2 rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <p className="m-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Services
          </p>
          <Button
            variant="ghost"
            className="h-9"
            onClick={onAddService}
            aria-label="Add service"
          >
            <Plus size={14} strokeWidth={2.25} aria-hidden />
            Add
          </Button>
        </div>
        <nav className="flex flex-col gap-1" aria-label="Service files">
          {cases.map((item) => {
            const selected = item.id === selectedId
            const Icon = iconForService(item.service)
            return (
              <Link
                key={item.id}
                to={workDetailPath(item)}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted',
                  selected && 'bg-muted font-semibold',
                )}
                aria-current={selected ? 'page' : undefined}
                aria-label={`${item.service}, ${item.caseId}`}
              >
                <span
                  className={cn(
                    'inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground',
                    selected && 'bg-primary/10 text-primary',
                  )}
                  aria-hidden
                >
                  <Icon size={14} strokeWidth={2.25} />
                </span>
                <span className="min-w-0 flex-1 truncate">{item.service}</span>
                <Badge variant="secondary">{item.status}</Badge>
              </Link>
            )
          })}
        </nav>
      </aside>
      <div className="min-w-0 rounded-xl border border-border bg-card p-3 shadow-sm">
        {selectedId ? (
          children
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Folder />
              </EmptyMedia>
              <EmptyTitle>Open A Service File</EmptyTitle>
            </EmptyHeader>
          </Empty>
        )}
      </div>
    </section>
  )
}
