import type { LucideIcon } from 'lucide-react'
import '@/styles/layout-ops.css'

export type StatCardItem = {
  id: string
  label: string
  value: string
  icon: LucideIcon
}

type StatCardsProps = {
  label: string
  cards: StatCardItem[]
  selectedId?: string
  onSelect?: (id: string) => void
}

export function StatCards({
  label,
  cards,
  selectedId,
  onSelect,
}: StatCardsProps) {
  return (
    <div className="pd-ops__metrics" aria-label={label}>
      {cards.map((card) => {
        const Icon = card.icon
        const isSelected = selectedId === card.id
        const className = isSelected
          ? 'pd-ops-metric-link is-selected'
          : 'pd-ops-metric-link'
        const body = (
          <>
            <span className="pd-ops-metric-link__watermark" aria-hidden="true">
              <Icon size={92} strokeWidth={1.15} />
            </span>
            <span className="pd-ops-metric-link__head">
              <span className="pd-ops-metric-link__icon" aria-hidden>
                <Icon size={18} />
              </span>
              <span className="pd-ops-metric-link__label">{card.label}</span>
            </span>
            <span className="pd-ops-metric-link__value">{card.value}</span>
          </>
        )

        if (!onSelect) {
          return (
            <div key={card.id} className={className}>
              {body}
            </div>
          )
        }

        return (
          <button
            key={card.id}
            type="button"
            className={className}
            aria-pressed={isSelected}
            onClick={() => onSelect(card.id)}
          >
            {body}
          </button>
        )
      })}
    </div>
  )
}
