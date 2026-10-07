import { formatCollectionRate, type OwnerKpis } from '@/lib/dashboardInsights'
import type { PaperworkSummary } from '@/lib/dashboardOperations'

export type HealthSignalId = 'cash' | 'flow' | 'paperwork' | 'timeliness'

export type HealthSignal = {
  id: HealthSignalId
  label: string
  /** 0–1, higher is healthier. */
  score: number
  weight: number
  detail: string
}

export type HealthVerdict = 'healthy' | 'watch' | 'at-risk'

export type BusinessHealth = {
  /** Weighted 0–100. */
  score: number
  verdict: HealthVerdict
  signals: HealthSignal[]
  weakest: HealthSignal
}

type HealthInput = {
  kpis: OwnerKpis
  paperwork: PaperworkSummary
  overdueDepartures: number
}

const HEALTHY_FROM = 75
const WATCH_FROM = 50

function clampRatio(value: number): number {
  return Math.min(Math.max(value, 0), 1)
}

export function computeBusinessHealth({
  kpis,
  paperwork,
  overdueDepartures,
}: HealthInput): BusinessHealth {
  const open = kpis.openCases
  const hasBilling = kpis.collected + kpis.outstanding > 0
  const onTrack = Math.max(open - kpis.atRiskCount, 0)

  const signals: HealthSignal[] = [
    {
      id: 'cash',
      label: 'Getting paid',
      weight: 0.3,
      score: hasBilling ? clampRatio(kpis.collectionRate) : 1,
      detail: hasBilling
        ? `Clients have paid ${formatCollectionRate(kpis.collectionRate)} of what they owe`
        : 'No bills sent yet',
    },
    {
      id: 'flow',
      label: 'Work moving',
      weight: 0.3,
      score: open === 0 ? 1 : clampRatio(onTrack / open),
      detail:
        open === 0
          ? 'No work in progress'
          : `${onTrack} of ${open} services are moving without problems`,
    },
    {
      id: 'paperwork',
      label: 'Papers collected',
      weight: 0.2,
      score: clampRatio(paperwork.inHandRate),
      detail:
        paperwork.missing === 0
          ? 'No papers missing'
          : `${paperwork.missing} paper${paperwork.missing === 1 ? ' is' : 's are'} still missing`,
    },
    {
      id: 'timeliness',
      label: 'Trips on time',
      weight: 0.2,
      score: open === 0 ? 1 : clampRatio(1 - overdueDepartures / open),
      detail:
        overdueDepartures === 0
          ? 'No trips have missed their date'
          : `${overdueDepartures} trip${overdueDepartures === 1 ? ' has' : 's have'} passed the travel date`,
    },
  ]

  const score = Math.round(
    signals.reduce((sum, signal) => sum + signal.score * signal.weight, 0) * 100,
  )
  const weakest = signals.reduce((worst, signal) =>
    signal.score < worst.score ? signal : worst,
  )

  return {
    score,
    verdict:
      score >= HEALTHY_FROM ? 'healthy' : score >= WATCH_FROM ? 'watch' : 'at-risk',
    signals,
    weakest,
  }
}
