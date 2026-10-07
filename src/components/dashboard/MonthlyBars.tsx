import { formatCompactBdt, type MonthBucket } from '@/lib/dashboardInsights'
import '@/styles/layout-bento.css'

type MonthlyBarsProps = {
  months: MonthBucket[]
  label: string
}

export function MonthlyBars({ months, label }: MonthlyBarsProps) {
  const max = Math.max(...months.map((month) => month.amount), 1)
  const lastIndex = months.length - 1
  return (
    <ol className="pd-month-bars" aria-label={label}>
      {months.map((month, index) => (
        <li
          key={month.key}
          className={
            index === lastIndex
              ? 'pd-month-bars__month pd-month-bars__month--current'
              : 'pd-month-bars__month'
          }
          aria-label={`${month.label}: ${formatCompactBdt(month.amount)}`}
        >
          <span className="pd-month-bars__amount">
            {month.amount > 0 ? formatCompactBdt(month.amount) : ''}
          </span>
          <span className="pd-month-bars__track" aria-hidden>
            <span
              className="pd-month-bars__fill"
              style={{ height: `${(month.amount / max) * 100}%` }}
            />
          </span>
          <span className="pd-month-bars__label">{month.label}</span>
        </li>
      ))}
    </ol>
  )
}
