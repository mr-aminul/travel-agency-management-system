import { Check, Circle, Eye, Plus } from 'lucide-react'
import { cx } from '@/lib/cx'
import { Badge, Button, type BadgeVariant } from '@/components/ui'

export type DocumentRowTone = 'done' | 'wait' | 'need' | 'idle'

const TONE_BADGE: Record<DocumentRowTone, BadgeVariant> = {
  done: 'completed',
  wait: 'in-progress',
  need: 'pending',
  idle: 'on-hold',
}

export function DocumentListRow({
  name,
  detail,
  status,
  tone,
  locked = false,
  onView,
  onUpload,
}: {
  name: string
  detail?: string
  status: string
  tone: DocumentRowTone
  locked?: boolean
  onView?: () => void
  onUpload?: () => void
}) {
  return (
    <li className={cx('pd-doc-check__item', locked && 'is-later')}>
      <span className="pd-doc-check__main">
        <span
          className={cx('pd-doc-check__mark', tone !== 'idle' && `is-${tone}`)}
          aria-hidden
        >
          {tone === 'done' || tone === 'wait' ? (
            <Check size={14} strokeWidth={2.5} />
          ) : (
            <Circle size={10} strokeWidth={2.25} />
          )}
        </span>
        <span className="pd-doc-check__text">
          <span className="pd-doc-check__name">{name}</span>
          {detail ? <span className="pd-doc-check__file">{detail}</span> : null}
        </span>
      </span>
      <span className="pd-doc-check__side">
        <Badge variant={TONE_BADGE[tone]}>{status}</Badge>
        {onView ? (
          <Button variant="secondary" size="sm" onClick={onView}>
            <Eye size={14} strokeWidth={2.25} aria-hidden />
            View
          </Button>
        ) : null}
        {onUpload ? (
          <Button size="sm" onClick={onUpload}>
            <Plus size={14} strokeWidth={2.5} aria-hidden />
            Upload
          </Button>
        ) : null}
      </span>
    </li>
  )
}
