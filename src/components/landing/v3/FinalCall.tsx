import { ArrowRight } from '@phosphor-icons/react'
import { subscribeUrl } from './landingLinks'

export function FinalCall({ onAsk }: { onAsk: () => void }) {
  return (
    <section className="lp2-final lp2-paper" aria-labelledby="ot3-final-title">
      <div className="lp2-wrap lp2-final__inner" data-enter>
        <h2 id="ot3-final-title" className="lp2-final__title">
          <span>Put your next file</span>
          <span>on OneTrack</span>
        </h2>
        <p className="lp2-final__risk body-3">
          Free for 14 days. No card needed.
        </p>
        <div className="lp2-final__actions">
          <a className="lp2-btn lp2-btn--navy button-md" href={subscribeUrl()}>
            Start free trial
            <ArrowRight size={18} weight="bold" />
          </a>
          <button type="button" className="lp2-btn lp2-btn--ghost button-md" onClick={onAsk}>
            Ask Inventive Lab
          </button>
        </div>
      </div>
    </section>
  )
}
