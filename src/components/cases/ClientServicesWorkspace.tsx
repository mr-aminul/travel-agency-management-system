import { useEffect } from 'react'
import { ArrowLeft, Folder, Plus } from 'lucide-react'
import { ServiceFileCard } from '@/components/cases/ServiceFileCard'
import { Badge } from '@/components/shadcn/badge'
import { Button } from '@/components/shadcn/button'
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/shadcn/empty'
import { getCurrentStepLabel } from '@/lib/caseChecklist'
import { formatDestination } from '@/lib/destinationCountries'
import { flashAndReveal } from '@/lib/scrollWithin'
import { cn } from '@/lib/utils'
import type { Case } from '@/types/case'
import type { Client } from '@/types/client'

export type ClientServicesWorkspaceProps = {
  client: Client
  cases: Case[]
  /** Deep-linked service file id (from the route). */
  selectedId?: string
  /** Open paper under the selected service (`?doc=`). */
  selectedDocId?: string | null
  onAddService: () => void
  /**
   * `stack` = every card (Clients v1).
   * `focus` = compact list, then one open file (Clients v3).
   */
  layout?: 'stack' | 'focus'
  onSelectService?: (caseId: string) => void
  onClearService?: () => void
}

export function ClientServicesWorkspace({
  client,
  cases,
  selectedId,
  selectedDocId = null,
  onAddService,
  layout = 'stack',
  onSelectService,
  onClearService,
}: ClientServicesWorkspaceProps) {
  useEffect(() => {
    if (!selectedId) return
    const frame = window.requestAnimationFrame(() => {
      flashAndReveal(`service-file-${selectedId}`)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [selectedId, selectedDocId])

  const selected = selectedId
    ? cases.find((item) => item.id === selectedId)
    : undefined

  return (
    <section
      id="client-services"
      className="flex min-w-0 flex-col gap-3"
      aria-label={`${client.name} services`}
    >
      {cases.length === 0 ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Folder />
              </EmptyMedia>
              <EmptyTitle>No Services Yet</EmptyTitle>
            </EmptyHeader>
            <EmptyContent>
              <Button
                type="button"
                className="h-9 rounded-lg"
                onClick={onAddService}
              >
                <Plus data-icon="inline-start" />
                Add Service
              </Button>
            </EmptyContent>
          </Empty>
        </div>
      ) : layout === 'focus' && selected ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 rounded-lg shadow-xs"
              onClick={onClearService}
            >
              <ArrowLeft data-icon="inline-start" />
              Services
            </Button>
            <span className="text-sm text-muted-foreground">
              {selected.service}
            </span>
          </div>
          <ServiceFileCard
            caseId={selected.id}
            selectedDocId={selectedDocId}
          />
        </>
      ) : layout === 'focus' ? (
        <>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {cases.map((item) => {
              const destination =
                formatDestination(
                  item.destination ?? '',
                  item.serviceCountry ?? '',
                ) || item.status
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-3 text-left shadow-sm transition-colors hover:bg-muted/50',
                    )}
                    onClick={() => onSelectService?.(item.id)}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-foreground">
                        {item.service}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {getCurrentStepLabel(item)}
                        {destination ? ` · ${destination}` : ''}
                      </span>
                    </span>
                    <Badge
                      variant={
                        item.status === 'Completed'
                          ? 'default'
                          : item.status === 'Cancelled'
                            ? 'destructive'
                            : 'secondary'
                      }
                    >
                      {item.status}
                    </Badge>
                  </button>
                </li>
              )
            })}
          </ul>
          <Button
            type="button"
            variant="outline"
            className="h-9 w-full justify-center rounded-xl border-dashed shadow-none"
            onClick={onAddService}
          >
            <Plus data-icon="inline-start" />
            Add Service
          </Button>
        </>
      ) : (
        <>
          {cases.map((item) => (
            <ServiceFileCard
              key={item.id}
              caseId={item.id}
              selectedDocId={selectedId === item.id ? selectedDocId : null}
            />
          ))}
          <Button
            type="button"
            variant="outline"
            className="h-9 w-full justify-center rounded-xl border-dashed shadow-none"
            onClick={onAddService}
          >
            <Plus data-icon="inline-start" />
            Add Service
          </Button>
        </>
      )}
    </section>
  )
}
