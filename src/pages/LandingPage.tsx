import { useEffect, useRef, useState } from 'react'
import { AnnouncementPopupHost } from '@/components/announcements/AnnouncementPopupHost'
import { LandingAskChat } from '@/components/landing/LandingAskChat'
import { BeforeAfter } from '@/components/landing/v2/BeforeAfter'
import { FaqSection } from '@/components/landing/v2/FaqSection'
import { FeatureCards } from '@/components/landing/v2/FeatureCards'
import { FileStages } from '@/components/landing/v2/FileStages'
import { HeroSection } from '@/components/landing/v2/HeroSection'
import { LightFlood } from '@/components/landing/v2/LightFlood'
import { PricingSection } from '@/components/landing/v2/PricingSection'
import { ServicesStrip } from '@/components/landing/v2/ServicesStrip'
import { SiteFooter } from '@/components/landing/v2/SiteFooter'
import { SiteNav } from '@/components/landing/v2/SiteNav'
import { TrackingFilm } from '@/components/landing/v2/TrackingFilm'
import { WhoUsesIt } from '@/components/landing/v2/WhoUsesIt'
import { useEnterOnScroll } from '@/components/landing/v2/sceneHooks'
import '@/styles/layout-landing.css'
import '@/styles/layout-landing-taste.css'

const PAGE_TITLE = 'OneTrack — One board for every travel file'
const PAGE_DESCRIPTION =
  'OneTrack keeps visas, documents, payments and client updates in one place for travel agencies in Bangladesh. Start a 14 day trial with no card.'
const THEME_COLOR = '#050d22'

function upsertMeta(name: string, content: string) {
  let meta = document.querySelector(`meta[name="${name}"]`)
  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute('name', name)
    document.head.appendChild(meta)
  }
  meta.setAttribute('content', content)
}

export default function LandingPage() {
  const rootRef = useRef<HTMLDivElement>(null)
  const [isAskOpen, setIsAskOpen] = useState(false)
  const openAsk = () => setIsAskOpen(true)
  const closeAsk = () => setIsAskOpen(false)
  useEnterOnScroll(rootRef)

  useEffect(() => {
    document.title = PAGE_TITLE
    upsertMeta('description', PAGE_DESCRIPTION)
    upsertMeta('robots', 'index, follow')
    upsertMeta('theme-color', THEME_COLOR)
  }, [])

  return (
    <div className="ot" ref={rootRef}>
      <a className="ot-skip" href="#main">
        Skip to content
      </a>
      <SiteNav />
      <main id="main">
        <HeroSection />
        <ServicesStrip />
        <FileStages />
        <FeatureCards />
        <BeforeAfter />
        <WhoUsesIt />
        <TrackingFilm />
        <PricingSection onAsk={openAsk} />
        <FaqSection onAsk={openAsk} />
        <LightFlood />
      </main>
      <SiteFooter onAsk={openAsk} />
      <LandingAskChat open={isAskOpen} onOpen={openAsk} onClose={closeAsk} />
      <AnnouncementPopupHost surface="landing" />
    </div>
  )
}
