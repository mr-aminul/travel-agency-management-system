import { Link } from 'react-router-dom'
import type { DepartureCheck } from '@/lib/dashboardOperations'
import { formatDisplayDate } from '@/lib/formatDate'
import '@/styles/layout-bento.css'

type TripListProps = {
  trips: DepartureCheck[]
}

function whenLabel(daysUntil: number): string {
  if (daysUntil === 0) return 'Today'
  if (daysUntil === 1) return 'Tomorrow'
  if (daysUntil < 0) {
    const days = Math.abs(daysUntil)
    return `${days} day${days === 1 ? '' : 's'} late`
  }
  return `In ${daysUntil} days`
}

function papersLabel(trip: DepartureCheck): { text: string; isReady: boolean } {
  const isReady = trip.documentsReady >= trip.documentsRequired
  if (trip.documentsRequired === 0 || isReady) {
    return { text: 'Papers ready', isReady: true }
  }
  return {
    text: `${trip.documentsReady} of ${trip.documentsRequired} papers ready`,
    isReady: false,
  }
}

export function TripList({ trips }: TripListProps) {
  return (
    <ul className="pd-trips">
      {trips.map((trip) => {
        const papers = papersLabel(trip)
        return (
          <li key={trip.id}>
            <Link to={trip.href} className="pd-trips__row">
              <span
                className={
                  trip.daysUntil < 0
                    ? 'pd-trips__when pd-trips__when--late'
                    : 'pd-trips__when'
                }
              >
                {whenLabel(trip.daysUntil)}
              </span>
              <span className="pd-trips__copy">
                <span className="pd-trips__name">{trip.name}</span>
                <span className="pd-trips__detail">
                  {trip.detail} · {formatDisplayDate(trip.departureDate)}
                </span>
              </span>
              <span
                className={
                  papers.isReady
                    ? 'pd-trips__papers pd-trips__papers--ready'
                    : 'pd-trips__papers'
                }
              >
                {papers.text}
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
