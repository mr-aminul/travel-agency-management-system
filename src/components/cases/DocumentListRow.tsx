import { Check, Circle, Eye, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/shadcn/badge'
import { Button } from '@/components/shadcn/button'

export type DocumentRowTone = 'done' | 'wait' | 'need' | 'idle'

const TONE_BADGE: Record<
  DocumentRowTone,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  done: 'default',
  wait: 'secondary',
  need: 'destructive',
  idle: 'outline',
}

const TONE_MARK: Record<DocumentRowTone, string> = {
  done: 'bg-emerald-500/15 text-emerald-700',
  wait: 'bg-amber-500/15 text-amber-700',
  need: 'bg-destructive/15 text-destructive',
  idle: 'bg-muted text-muted-foreground',
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
    <li
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 border-b border-border py-2.5 last:border-b-0',
        locked && 'opacity-60',
      )}
    >
      <span className="flex min-w-0 flex-1 items-start gap-2">
        <span
          className={cn(
            'mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full',
            TONE_MARK[tone],
          )}
          aria-hidden
        >
          {tone === 'done' || tone === 'wait' ? (
            <Check size={12} strokeWidth={2.5} />
          ) : (
            <Circle size={8} strokeWidth={2.25} />
          )}
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-sm font-medium">{name}</span>
          {detail ? <span className="truncate text-xs text-muted-foreground">{detail}</span> : null}
        </span>
      </span>
      <span className="flex flex-wrap items-center gap-2">
        {status ? <Badge variant={TONE_BADGE[tone]}>{status}</Badge> : null}
        {onView ? (
          <Button variant="outline" size="sm" className="h-8 rounded-lg" onClick={onView}>
            <Eye size={14} strokeWidth={2.25} aria-hidden />
            View
          </Button>
        ) : null}
        {onUpload ? (
          <Button size="sm" className="h-8 rounded-lg" onClick={onUpload}>
            <Plus size={14} strokeWidth={2.5} aria-hidden />
            Upload
          </Button>
        ) : null}
      </span>
    </li>
  )
}
