import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, type LucideIcon } from 'lucide-react'
import { cx } from '@/lib/cx'
import '@/styles/layout-bento.css'

type BentoTileProps = {
  title: string
  icon: LucideIcon
  meta?: ReactNode
  /** Drill-down page; omitted when the tenant cannot open it. */
  to?: string
  className?: string
  children: ReactNode
}

export function BentoTile({
  title,
  icon: Icon,
  meta,
  to,
  className,
  children,
}: BentoTileProps) {
  return (
    <section className={cx('pd-bento-tile', className)} aria-label={title}>
      <header className="pd-bento-tile__head">
        <span className="pd-bento-tile__icon" aria-hidden>
          <Icon size={15} strokeWidth={2.25} />
        </span>
        <h2 className="pd-bento-tile__title">{title}</h2>
        {meta ? <span className="pd-bento-tile__meta">{meta}</span> : null}
        {to ? (
          <Link
            to={to}
            className="pd-bento-tile__link"
            aria-label={`Open ${title}`}
          >
            <ArrowUpRight size={15} strokeWidth={2.25} aria-hidden />
          </Link>
        ) : null}
      </header>
      <div className="pd-bento-tile__body">{children}</div>
    </section>
  )
}
