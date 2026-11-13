import { useState, type CSSProperties } from 'react'
import { CaretDown } from '@phosphor-icons/react'
import { LANDING_FAQS } from '@/components/landing/landingContent'

/** Even count so the desktop 2-col grid never leaves an empty cell. */
const FAQ_PREVIEW = 4

export function FaqSection() {
  const [isExpanded, setIsExpanded] = useState(false)
  const visibleFaqs = isExpanded ? LANDING_FAQS : LANDING_FAQS.slice(0, FAQ_PREVIEW)
  const hasMore = LANDING_FAQS.length > FAQ_PREVIEW

  return (
    <section className="section wrap" id="faq" aria-labelledby="faq-title">
      <header className="section-head" data-enter>
        <h2 id="faq-title">Common questions</h2>
      </header>
      <div className="cells faq">
        {visibleFaqs.map((item, index) => {
          const isPreviewRow = index < FAQ_PREVIEW
          return (
            <div
              key={item.question}
              // Preview rows use scroll-enter; expanded rows appear immediately
              // (new nodes never get data-entered from the mount-time observer).
              {...(isPreviewRow
                ? {
                    'data-enter': '',
                    style: { '--enter-i': index % 2 } as CSSProperties,
                  }
                : {})}
            >
              <h3>{item.question}</h3>
              <p>{item.answer}</p>
            </div>
          )
        })}
      </div>
      {hasMore ? (
        <div className="faq-more" data-enter>
          <button
            type="button"
            className="btn btn-ghost faq-more__btn"
            aria-expanded={isExpanded}
            onClick={() => setIsExpanded((open) => !open)}
          >
            {isExpanded ? 'Show less' : `View more (${LANDING_FAQS.length - FAQ_PREVIEW})`}
            <CaretDown className="arrow" weight="bold" data-open={isExpanded ? '' : undefined} />
          </button>
        </div>
      ) : null}
    </section>
  )
}
