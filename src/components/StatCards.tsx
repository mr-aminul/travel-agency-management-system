import type { LucideIcon } from 'lucide-react'
import { Sparkline } from '@/components/dashboard/Sparkline'
import { Button } from '@/components/shadcn/button'
import {
  summaryStatClass,
  summaryStatGroupClass,
  summaryStatLabelClass,
  summaryStatPeekClass,
  summaryStatValueClass,
} from '@/components/clients/shadcnChrome'
import { cn } from '@/lib/utils'

/** @deprecated Tone is ignored; all cards use theme chrome like Clients/Services. */
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
    <div
      className={cn(summaryStatGroupClass, className)}
      role="group"
      aria-label={label}
    >
      {cards.map((card) => {
        const Icon = card.icon
        const isSelected = selectedId === card.id
        const body = (
          <>
            <Icon
              className={summaryStatPeekClass}
              size={76}
              strokeWidth={1.25}
              aria-hidden
            />
            <span className={summaryStatLabelClass}>
              <Icon size={14} strokeWidth={1.75} aria-hidden />
              {card.label}
              {card.delta ? (
                <span className="ml-1 text-[0.7rem] font-semibold text-white/70">
                  {card.delta}
                </span>
              ) : null}
            </span>
            <span className="relative z-[1] flex w-full items-end justify-between gap-2">
              <span className={summaryStatValueClass}>{card.value}</span>
              {card.sparkline && card.sparkline.length > 1 ? (
                <Sparkline
                  values={card.sparkline}
                  tone={card.deltaTone ?? 'flat'}
                  label={`${card.label} trend`}
                />
              ) : null}
            </span>
            {card.hint ? (
              <span className="relative z-[1] text-[0.72rem] font-medium text-white/70">
                {card.hint}
              </span>
            ) : null}
          </>
        )

        if (!onSelect) {
          return (
            <div key={card.id} className={summaryStatClass}>
              {body}
            </div>
          )
        }

        return (
          <Button
            key={card.id}
            type="button"
            variant="ghost"
            className={summaryStatClass}
            aria-pressed={isSelected}
            onClick={() => onSelect(card.id)}
          >
            {body}
          </Button>
        )
      })}
    </div>
  )
}
