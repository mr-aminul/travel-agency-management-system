import type { CSSProperties } from 'react'
import { ArrowRight, Path } from '@phosphor-icons/react'
import { subscribeUrl } from './landingLinks'

/** Real board stages from the product — not a 20-step carnival. */
const STAGES = [
  {
    no: '01',
    name: 'Intake',
    detail: 'Open the file. Name, passport, service and advance go on the board.',
  },
  {
    no: '02',
    name: 'Documents',
    detail: 'Upload what you have. See what is still missing before the embassy date.',
  },
  {
    no: '03',
    name: 'Submitted',
    detail: 'Move the file forward. The client gets an SMS with a tracking link.',
  },
  {
    no: '04',
    name: 'Ready to fly',
    detail: 'Visa, ticket and balance cleared. Close the file when they leave.',
  },
] as const

export function FileStages() {
  return (
    <section className="section wrap" id="steps" aria-labelledby="stages-title">
      <header className="section-head" data-enter>
        <p className="eyebrow">
          <Path weight="bold" />
          How a file moves
        </p>
        <h2 id="stages-title">Four stages on the board.</h2>
        <p>Same path your desk already knows — intake to ready — saved on one file.</p>
      </header>
      <ol className="cells stages">
        {STAGES.map((stage, index) => (
          <li key={stage.name} className="stage-card" data-enter style={{ '--enter-i': index } as CSSProperties}>
            <span className="stage-no">{stage.no}</span>
            <h3 className="stage-name">{stage.name}</h3>
            <p className="stage-detail">{stage.detail}</p>
          </li>
        ))}
      </ol>
      <div className="stages-cta" data-enter>
        <a className="btn btn-dark" href={subscribeUrl()}>
          Put a file on the board
          <ArrowRight className="arrow" weight="bold" />
        </a>
      </div>
    </section>
  )
}
