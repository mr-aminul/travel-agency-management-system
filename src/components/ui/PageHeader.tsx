import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from '@/lib/cx'

export type PageHeaderProps = HTMLAttributes<HTMLElement> & {
  title: string
  description?: string
  /** Sits beside the title (e.g. List / Board view switch). */
  titleAside?: ReactNode
  actions?: ReactNode
}

export function PageHeader({
  title,
  description,
  titleAside,
  actions,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <header className={cx('pd-page-header', className)} {...props}>
      <div className="pd-page-header__text">
        <div className="pd-page-header__title-row">
          <h1 className="pd-page-header__title">{title}</h1>
          {titleAside ? (
            <div className="pd-page-header__title-aside">{titleAside}</div>
          ) : null}
        </div>
        {description ? (
          <p className="pd-page-header__description">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="pd-page-header__actions">{actions}</div>
      ) : null}
    </header>
  )
}
