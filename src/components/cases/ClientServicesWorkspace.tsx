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
        className="flex min-h-[22rem] items-center justify-center rounded-xl border border-border bg-card p-6 shadow-sm"
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
      className="grid min-h-[22rem] min-w-0 grid-cols-1 gap-0 overflow-hidden rounded-xl border border-border bg-card shadow-sm md:grid-cols-[minmax(12rem,15rem)_minmax(0,1fr)]"
      aria-label={`${clientName} services`}
    >
      <aside className="flex min-w-0 flex-col border-b border-border bg-[color-mix(in_srgb,var(--color-surface)_70%,var(--color-bg))] md:border-r md:border-b-0">
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
          <p className="m-0 text-xs font-semibold text-muted-foreground">
            Services
          </p>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onAddService}
            aria-label="Add Service"
          >
            <Plus size={14} strokeWidth={2.25} aria-hidden />
          </Button>
        </div>
        <nav
          className="flex flex-row gap-1 overflow-x-auto p-2 md:flex-col"
          aria-label="Service files"
        >
          {cases.map((item) => {
            const selected = item.id === selectedId
            const Icon = iconForService(item.service)
            return (
              <Link
                key={item.id}
                to={workDetailPath(item)}
                className={cn(
                  'inline-flex min-w-[10rem] max-w-full items-center gap-2 rounded-lg border border-transparent px-2.5 py-2 text-sm transition-colors md:min-w-0',
                  selected
                    ? 'border-primary/25 bg-primary/10 font-semibold text-foreground'
                    : 'hover:bg-muted',
                )}
                aria-current={selected ? 'page' : undefined}
                aria-label={`${item.service}, ${item.caseId}`}
              >
                <span
                  className={cn(
                    'inline-flex size-7 shrink-0 items-center justify-center rounded-md',
                    selected
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground',
                  )}
                  aria-hidden
                >
                  <Icon size={14} strokeWidth={2.25} />
                </span>
                <span className="min-w-0 flex-1 truncate">{item.service}</span>
                <Badge variant="secondary" className="shrink-0">
                  {item.status}
                </Badge>
              </Link>
            )
          })}
        </nav>
      </aside>

      <div className="min-w-0 p-3 sm:p-4">
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
