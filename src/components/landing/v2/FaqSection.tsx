import type { CSSProperties } from 'react'
import { ArrowRight, Question } from '@phosphor-icons/react'
import { LANDING_FAQS } from '@/components/landing/landingContent'

export function FaqSection({ onAsk }: { onAsk: () => void }) {
  return (
    <section className="section wrap" id="faq" aria-labelledby="faq-title">
      <header className="section-head" data-enter>
        <p className="eyebrow">
          <Question weight="bold" />
          FAQ
        </p>
        <h2 id="faq-title">Questions, answered.</h2>
      </header>
      <div className="cells faq">
        {LANDING_FAQS.map((item, index) => (
          <div key={item.question} data-enter style={{ '--enter-i': index % 2 } as CSSProperties}>
            <h3>{item.question}</h3>
            <p>{item.answer}</p>
          </div>
        ))}
      </div>
      <div className="support-cta" data-enter>
        <button type="button" className="btn btn-light" onClick={onAsk}>
          Ask Inventive Lab
          <ArrowRight className="arrow" weight="bold" />
        </button>
      </div>
    </section>
  )
}
