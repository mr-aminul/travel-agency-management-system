import { useEffect } from 'react'
import { Folder, Plus } from 'lucide-react'
import { ServiceFileCard } from '@/components/cases/ServiceFileCard'
import { Button } from '@/components/shadcn/button'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/shadcn/empty'
import { flashAndReveal } from '@/lib/scrollWithin'
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
}

export function ClientServicesWorkspace({
  client,
  cases,
  selectedId,
  selectedDocId = null,
  onAddService,
}: ClientServicesWorkspaceProps) {
  useEffect(() => {
    if (!selectedId) return
    const frame = window.requestAnimationFrame(() => {
      flashAndReveal(`service-file-${selectedId}`)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [selectedId, selectedDocId])

  return (
    <section
      id="client-services"
      className="flex min-w-0 flex-col gap-4"
      aria-label={`${client.name} services`}
    >
      <div className="flex items-center justify-end">
        <Button type="button" className="h-9 rounded-lg" onClick={onAddService}>
          <Plus data-icon="inline-start" />
          Add Service
        </Button>
      </div>
      {cases.length === 0 ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Folder />
              </EmptyMedia>
              <EmptyTitle>No Services Yet</EmptyTitle>
            </EmptyHeader>
          </Empty>
        </div>
      ) : (
        cases.map((item) => (
          <ServiceFileCard
            key={item.id}
            caseId={item.id}
            selectedDocId={selectedId === item.id ? selectedDocId : null}
          />
        ))
      )}
    </section>
  )
}
