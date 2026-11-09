import { Kanban, ListChecks } from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from '@/components/shadcn/toggle-group'
import { whiteControlClass } from '@/components/clients/shadcnChrome'
import { cn } from '@/lib/utils'
import type { ServicesView } from '@/lib/workPaths'

type ServicesViewToggleProps = {
  view: ServicesView
  onChange: (view: ServicesView) => void
}

/** Segmented List / Board control for the Services page. */
export function ServicesViewToggle({ view, onChange }: ServicesViewToggleProps) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      spacing={0}
      value={view}
      onValueChange={(value) => {
        if (value === 'list' || value === 'board') onChange(value)
      }}
      aria-label="Services view"
    >
      <ToggleGroupItem
        value="list"
        aria-label="List view"
        className={cn(whiteControlClass, 'px-3', view === 'list' && 'is-active')}
      >
        <ListChecks data-icon="inline-start" aria-hidden />
        List
      </ToggleGroupItem>
      <ToggleGroupItem
        value="board"
        aria-label="Board view"
        className={cn(whiteControlClass, 'px-3', view === 'board' && 'is-active')}
      >
        <Kanban data-icon="inline-start" aria-hidden />
        Board
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
