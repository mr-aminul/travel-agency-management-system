import {
  formatBdt,
  formatCollectionRate,
  formatCompactBdt,
} from '@/lib/dashboardInsights'

type CashPositionProps = {
  collected: number
  outstanding: number
  collectionRate: number
  bookedRevenue: number
}

export function CashPosition({
  collected,
  outstanding,
  collectionRate,
  bookedRevenue,
}: CashPositionProps) {
  const book = collected + outstanding
  const collectedPct = book === 0 ? 0 : Math.round((collected / book) * 100)
  const outstandingPct = book === 0 ? 0 : 100 - collectedPct

  return (
    <div className="pd-dash-cash">
      <div className="pd-dash-cash__hero">
        <span className="pd-dash-cash__rate">{formatCollectionRate(collectionRate)}</span>
        <span className="pd-dash-cash__rate-label">collection rate</span>
      </div>

      <div
        className="pd-dash-cash__bar"
        role="img"
        aria-label={`Collected ${collectedPct} percent, outstanding ${outstandingPct} percent`}
      >
        {collected > 0 ? (
          <span
            className="pd-dash-cash__collected"
            style={{ flexGrow: Math.max(collected, 1), flexBasis: 0 }}
          />
        ) : null}
        {outstanding > 0 ? (
          <span
            className="pd-dash-cash__due"
            style={{ flexGrow: Math.max(outstanding, 1), flexBasis: 0 }}
          />
        ) : null}
      </div>

      <dl className="pd-dash-cash__grid">
        <div>
          <dt>Collected</dt>
          <dd>{formatCompactBdt(collected)}</dd>
        </div>
        <div>
          <dt>Outstanding</dt>
          <dd>{formatCompactBdt(outstanding)}</dd>
        </div>
        <div>
          <dt>Booked fees</dt>
          <dd>{formatCompactBdt(bookedRevenue)}</dd>
        </div>
        <div>
          <dt>Open book</dt>
          <dd>{formatBdt(book)}</dd>
        </div>
      </dl>
    </div>
  )
}
