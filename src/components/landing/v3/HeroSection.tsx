import { HeroSection as TasteHero } from '@/components/landing/v2/HeroSection'
import { publicUrl } from '@/lib/publicUrl'

/** Same Taste hero + motion; Classic sky photo behind it. */
export function HeroSection() {
  return <TasteHero skyImage={publicUrl('images/landing/starry-sky-clouds-background.jpg')} />
}
