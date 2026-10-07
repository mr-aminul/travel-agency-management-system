import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'
import { EmptyState } from '@/components/ui'

type DashboardPanelProps = {
  title: string
  description?: string
  meta?: string
  children: ReactNode
  empty?: { title: string; description: string }
  isEmpty?: boolean
  className?: string
}

export function DashboardPanel({
  title,
  description,
  meta,
  children,
  empty,
  isEmpty = false,
  className,
}: DashboardPanelProps) {
  return (
    <section className={cx('pd-dash-panel', className)}>
      <header className="pd-dash-panel__head">
        <div className="pd-dash-panel__heading">
          <h2 className="pd-dash-panel__title">{title}</h2>
          {description ? (
            <p className="pd-dash-panel__description">{description}</p>
          ) : null}
        </div>
        {meta ? <p className="pd-dash-panel__meta">{meta}</p> : null}
      </header>
      {isEmpty && empty ? (
        <EmptyState title={empty.title} description={empty.description} />
      ) : (
        children
      )}
    </section>
  )
}
