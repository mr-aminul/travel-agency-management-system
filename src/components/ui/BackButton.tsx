import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cx } from '@/lib/cx'

type BackButtonBase = {
  /** Destination used for the accessible name (“Back to {label}”). */
  label: string
  className?: string
}

type BackButtonLink = BackButtonBase & {
  to: string
  onClick?: never
}

type BackButtonAction = BackButtonBase & {
  to?: never
  onClick: () => void
}

export type BackButtonProps = BackButtonLink | BackButtonAction

export function BackButton({ label, className, ...props }: BackButtonProps) {
  const ariaLabel = `Back to ${label}`
  const classNames = cx('pd-back', className)
  const contents = (
    <span className="pd-btn pd-btn--primary pd-btn--icon" aria-hidden>
      <ArrowLeft size={18} strokeWidth={2.25} />
    </span>
  )

  if (typeof props.to === 'string') {
    return (
      <Link to={props.to} className={classNames} aria-label={ariaLabel}>
        {contents}
      </Link>
    )
  }

  return (
    <button type="button" className={classNames} aria-label={ariaLabel} onClick={props.onClick}>
      {contents}
    </button>
  )
}
