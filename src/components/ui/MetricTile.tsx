import type { LucideIcon } from 'lucide-react'

type MetricTileProps = {
  label: string
  value: string | number
  hint?: string
  icon?: LucideIcon
}

export function MetricTile({ label, value, hint, icon: Icon }: MetricTileProps) {
  return (
    <div className="pd-metric">
      <div className="pd-metric__head">
        {Icon ? (
          <span className="pd-metric__icon" aria-hidden>
            <Icon size={15} strokeWidth={2.1} />
          </span>
        ) : null}
        <span className="pd-metric__label">{label}</span>
      </div>
      <span className="pd-metric__value">{value}</span>
      {hint ? <span className="pd-metric__hint">{hint}</span> : null}
    </div>
  )
}
