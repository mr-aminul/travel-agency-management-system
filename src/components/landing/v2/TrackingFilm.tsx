import { useState } from 'react'
import { StatusLinkShow } from '@/components/landing/stageshow/StatusLinkShow'

/**
 * Beat 0 = the pain they know. Beats 1–3 = what OneTrack does on screen,
 * in plain words anyone at the desk can follow.
 */
const BEATS = [
  'Clients keep calling for status',
  'You add papers to the file',
  'You see payments clearly',
  'Client checks without calling',
] as const

/** Product film: status chaos → tracking link, right after the hero board. */
export function TrackingFilm() {
  const [beat, setBeat] = useState(0)
  const title = BEATS[beat] ?? BEATS[0]

  return (
    <section className="section wrap-wide" id="product" aria-labelledby="film-title">
      <div className="film is-bare film-frame" data-enter>
        <div className="film-caption">
          <h2 id="film-title" key={title} className="film-beat-title">
            {title.split(' ').map((word, index) => (
              <span
                key={`${title}-${index}`}
                className="film-beat-word"
                style={{ ['--i' as string]: index }}
              >
                <span>{word}</span>
              </span>
            ))}
          </h2>
        </div>
        <div className="film-stage" data-ss-fill aria-hidden>
          <StatusLinkShow onBeat={setBeat} />
        </div>
      </div>
    </section>
  )
}
