import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cx } from '@/lib/cx'

type BackButtonBase = {
  /** Destination shown as “Back to {label}”. */
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
  const text = `Back to ${label}`
  const classNames = cx('pd-back', className)
  const contents = (
    <>
      <span className="pd-btn pd-btn--primary pd-btn--icon" aria-hidden>
        <ArrowLeft size={18} strokeWidth={2.25} />
      </span>
      <span className="pd-back__text">{text}</span>
    </>
  )

  if ('to' in props) {
    return (
      <Link to={props.to} className={classNames} aria-label={text}>
        {contents}
      </Link>
    )
  }

  return (
    <button type="button" className={classNames} aria-label={text} onClick={props.onClick}>
      {contents}
    </button>
  )
}
