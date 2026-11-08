import { useEffect } from 'react'
import '@fontsource-variable/geist/wght.css'
import { ArrowLeft, CaretDown } from '@phosphor-icons/react'
import { LANDING_FAQS, SALES_EMAIL } from '@/components/landing/landingContent'
import { publicUrl } from '@/lib/publicUrl'
import { appUrl, marketingHomeUrl } from '@/lib/siteOrigins'
import '@/styles/layout-landing.css'

function subscribeUrl(): string {
  return appUrl('/subscribe?plan=growth')
}

export default function FaqPage() {
  useEffect(() => {
    document.title = 'FAQ — OneTrack'
    const description =
      'Answers about OneTrack trials, pricing, sub agents, WhatsApp, and client tracking for travel and visa agencies.'
    let meta = document.querySelector('meta[name="description"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'description')
      document.head.appendChild(meta)
    }
    meta.setAttribute('content', description)
  }, [])

  return (
    <div className="lp2 lp2-faq-page">
      <a className="lp2-skip button-sm" href="#main">
        Skip to content
      </a>
      <header className="lp2-faq-page__bar">
        <div className="lp2-wrap lp2-faq-page__bar-inner">
          <a className="lp2-nav__brand title-3" href={marketingHomeUrl()}>
            <img src={publicUrl('images/logo.svg')} alt="" width={24} height={24} />
            OneTrack
          </a>
          <div className="lp2-faq-page__bar-actions">
            <a className="lp2-nav__signin button-sm" href={appUrl('/login')}>
              Sign in
            </a>
            <a className="lp2-btn lp2-btn--solid button-sm" href={subscribeUrl()}>
              Start free trial
            </a>
          </div>
        </div>
      </header>
      <main id="main" className="lp2-faq-page__main">
        <div className="lp2-wrap lp2-faq__inner">
          <a className="lp2-faq-page__back caption-2" href={marketingHomeUrl()}>
            <ArrowLeft size={14} weight="bold" aria-hidden />
            Home
          </a>
          <h1 className="lp2-faq__title caption-3">FAQ</h1>
          <div className="lp2-faq__list">
            {LANDING_FAQS.map((item) => (
              <details key={item.question} className="lp2-faq__item">
                <summary className="title-5">
                  {item.question}
                  <CaretDown className="lp2-faq__chevron" size={12} weight="bold" />
                </summary>
                <p className="caption-2">{item.answer}</p>
              </details>
            ))}
          </div>
          <p className="lp2-faq-page__more caption-2">
            Still stuck?{' '}
            <a href={`mailto:${SALES_EMAIL}`}>{SALES_EMAIL}</a>
          </p>
        </div>
      </main>
    </div>
  )
}
