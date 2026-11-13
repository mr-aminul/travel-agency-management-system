import { ArrowRight } from '@phosphor-icons/react'
import { StatusLinkShow } from '@/components/landing/stageshow/StatusLinkShow'
import { publicUrl } from '@/lib/publicUrl'
import { appUrl } from '@/lib/siteOrigins'
import { subscribeUrl } from './landingLinks'

/** Real product film: fewer client calls when status lives on a link. */
export function TrackingFilm() {
  return (
    <section className="section wrap-wide" aria-labelledby="film-title">
      <div className="film" data-enter>
        <div className="film-top">
          <div>
            <div className="film-brand">
              <span className="film-brand-mark">
                <img src={publicUrl('images/logo.svg')} alt="" />
              </span>
              <span>
                <b>Client tracking</b> on OneTrack
              </span>
            </div>
            <h2 id="film-title">Clients check status. You keep working.</h2>
            <p>Send one SMS with a link. The file stage updates on their phone — fewer calls to the desk.</p>
          </div>
          <div className="film-actions">
            <a className="btn btn-dark" href={subscribeUrl()}>
              Start free trial
              <ArrowRight className="arrow" weight="bold" />
            </a>
            <a className="btn btn-light" href={appUrl('/track')}>
              Try a tracking link
            </a>
          </div>
        </div>
        <div className="film-stage" data-ss-wide data-ss-fill aria-hidden>
          <StatusLinkShow />
        </div>
      </div>
    </section>
  )
}
