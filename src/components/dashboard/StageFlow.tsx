import { ChevronRight } from 'lucide-react'
import type { StageFlowRow } from '@/lib/dashboardOperations'
import type { CaseStage } from '@/types/case'
import '@/styles/layout-bento.css'

const STAGE_LABEL: Record<CaseStage, string> = {
  Intake: 'Just started',
  Processing: 'In process',
  Documents: 'Collecting papers',
  Travel: 'Ready to travel',
  Closed: 'Done',
}

type StageFlowProps = {
  rows: StageFlowRow[]
}

export function StageFlow({ rows }: StageFlowProps) {
  const busiest = Math.max(...rows.map((row) => row.count), 1)
  return (
    <ol className="pd-stage-flow">
      {rows.map((row, index) => (
        <li
          key={row.stage}
          className={`pd-stage-flow__stage pd-stage-flow__stage--${row.stage.toLowerCase()}`}
        >
          <span className="pd-stage-flow__column" aria-hidden>
            <span
              className="pd-stage-flow__fill"
              style={{ height: `${Math.max((row.count / busiest) * 100, row.count ? 8 : 0)}%` }}
            />
          </span>
          <span className="pd-stage-flow__count">{row.count}</span>
          <span className="pd-stage-flow__label">{STAGE_LABEL[row.stage]}</span>
          {index < rows.length - 1 ? (
            <ChevronRight
              className="pd-stage-flow__arrow"
              size={14}
              strokeWidth={2.25}
              aria-hidden
            />
          ) : null}
        </li>
      ))}
    </ol>
  )
}
