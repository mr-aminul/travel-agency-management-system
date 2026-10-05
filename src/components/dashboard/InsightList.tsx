import { useNavigate } from 'react-router-dom'
import { Badge, type BadgeVariant } from '@/components/ui'

export type InsightListItem = {
  id: string
  title: string
  detail: string
  href: string
  value?: string
  badge?: { label: string; variant: BadgeVariant }
}

type InsightListProps = {
  items: InsightListItem[]
}

export function InsightList({ items }: InsightListProps) {
  const navigate = useNavigate()
  return (
    <ul className="pd-dash-list">
      {items.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            className="pd-dash-list__row"
            onClick={() => navigate(item.href)}
          >
            <span className="pd-dash-list__copy">
              <span className="pd-dash-list__title">{item.title}</span>
              <span className="pd-dash-list__detail">{item.detail}</span>
            </span>
            <span className="pd-dash-list__end">
              {item.badge ? (
                <Badge variant={item.badge.variant}>{item.badge.label}</Badge>
              ) : null}
              {item.value ? (
                <span className="pd-dash-list__value">{item.value}</span>
              ) : null}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}
