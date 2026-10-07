import type { LucideIcon } from 'lucide-react'
import '@/styles/layout-bento.css'

type KpiTileProps = {
  label: string
  value: string
  hint: string
  icon: LucideIcon
}

export function KpiTile({ label, value, hint, icon: Icon }: KpiTileProps) {
  return (
    <section className="pd-bento-tile pd-kpi" aria-label={label}>
      <span className="pd-kpi__label">
        <Icon size={14} strokeWidth={2.25} aria-hidden />
        {label}
      </span>
      <span className="pd-kpi__value">{value}</span>
      <span className="pd-kpi__hint">{hint}</span>
    </section>
  )
}
