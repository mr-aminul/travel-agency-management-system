import type { LucideIcon } from 'lucide-react'
import { Sparkline } from '@/components/dashboard/Sparkline'
import { cx } from '@/lib/cx'
import '@/styles/layout-ops.css'

export type StatCardTone = 'brand' | 'info' | 'success' | 'warning' | 'muted'

export type StatCardItem = {
  id: string
  label: string
  value: string
  hint?: string
  icon: LucideIcon
  tone?: StatCardTone
  delta?: string | null
  deltaTone?: 'up' | 'down' | 'flat'
  sparkline?: number[]
}

type StatCardsProps = {
  label: string
  cards: StatCardItem[]
  selectedId?: string
  onSelect?: (id: string) => void
  className?: string
}

export function StatCards({
  label,
  cards,
  selectedId,
  onSelect,
  className,
}: StatCardsProps) {
  return (
    <div className={cx('pd-ops__metrics', className)} aria-label={label}>
      {cards.map((card) => {
        const Icon = card.icon
        const isSelected = selectedId === card.id
        const tone = card.tone ?? 'brand'
        const deltaTone = card.deltaTone ?? 'flat'
        const className = [
          'pd-ops-metric-link',
          `pd-ops-metric-link--${tone}`,
          isSelected ? 'is-selected' : '',
        ]
          .filter(Boolean)
          .join(' ')
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
              {card.delta ? (
                <span
                  className={`pd-ops-metric-link__delta pd-ops-metric-link__delta--${deltaTone}`}
                >
                  {card.delta}
                </span>
              ) : null}
            </span>
            <span className="pd-ops-metric-link__value-row">
              <span className="pd-ops-metric-link__value">{card.value}</span>
              {card.sparkline && card.sparkline.length > 1 ? (
                <Sparkline
                  values={card.sparkline}
                  tone={deltaTone}
                  label={`${card.label} trend`}
                />
              ) : null}
            </span>
            {card.hint ? (
              <span className="pd-ops-metric-link__hint">{card.hint}</span>
            ) : null}
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
