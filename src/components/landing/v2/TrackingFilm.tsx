import { useState } from 'react'
import { StatusLinkShow } from '@/components/landing/stageshow/StatusLinkShow'

/**
 * Story the visitor feels: the call → OneTrack → papers → money → share → notify.
 * Beat 1 = logo card. Beat 4 = share-link button.
 */
const BEATS = [
  'Tired of client messages and calls?',
  'Introducing OneTrack',
  'Documents stay in one place',
  'Paid and due at a glance',
  'Share the link',
  'Clients get notified on time',
] as const

/** Product film: status chaos → tracking link, right after the hero board. */
export function TrackingFilm() {
  const [beat, setBeat] = useState(0)
  const title = BEATS[beat] ?? BEATS[0]

  return (
    <section className="section wrap-wide" id="product" aria-labelledby="film-title">
      <header className="section-head film-caption" data-enter>
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
      </header>
      <div className="film is-bare film-frame" data-enter>
        <div className="film-stage" data-ss-fill aria-hidden>
          <StatusLinkShow onBeat={setBeat} />
        </div>
      </div>
    </section>
  )
}
