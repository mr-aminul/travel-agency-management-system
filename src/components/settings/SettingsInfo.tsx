import { Info } from 'lucide-react'
import { Tooltip } from '@/components/ui'

type SettingsInfoProps = {
  title: string
  body: string
}

export function SettingsInfo({ title, body }: SettingsInfoProps) {
  return (
    <Tooltip content={body} delay={0} wide>
      <button
        type="button"
        className="pd-settings-info"
        aria-label={`About ${title}`}
      >
        <Info size={14} strokeWidth={2} aria-hidden />
      </button>
    </Tooltip>
  )
}
