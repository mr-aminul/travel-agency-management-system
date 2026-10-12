import { Kanban, ListChecks } from 'lucide-react'
import type { ServicesView } from '@/lib/workPaths'

type ServicesViewToggleProps = {
  view: ServicesView
  onChange: (view: ServicesView) => void
}

/** Segmented List / Board control for the Services page. */
export function ServicesViewToggle({ view, onChange }: ServicesViewToggleProps) {
  return (
    <div
      className="pd-services__view-toggle"
      role="group"
      aria-label="Services view"
    >
      <button
        type="button"
        className={`pd-services__view-option${view === 'list' ? ' is-selected' : ''}`}
        aria-pressed={view === 'list'}
        onClick={() => onChange('list')}
      >
        <ListChecks size={15} strokeWidth={2.25} aria-hidden />
        List
      </button>
      <button
        type="button"
        className={`pd-services__view-option${view === 'board' ? ' is-selected' : ''}`}
        aria-pressed={view === 'board'}
        onClick={() => onChange('board')}
      >
        <Kanban size={15} strokeWidth={2.25} aria-hidden />
        Board
      </button>
    </div>
  )
}
