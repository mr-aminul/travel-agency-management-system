import { useEffect, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { cx } from '@/lib/cx'

export type CopyableTextProps = {
  value: string
  /** Spoken as “Copy {label}”. Defaults to “email”. */
  label?: string
  className?: string
}

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value)
  } catch {
    const field = document.createElement('textarea')
    field.value = value
    field.setAttribute('readonly', '')
    field.style.position = 'fixed'
    field.style.opacity = '0'
    document.body.appendChild(field)
    field.select()
    document.execCommand('copy')
    field.remove()
  }
}

export function CopyableText({
  value,
  label = 'email',
  className,
}: CopyableTextProps) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 1500)
    return () => window.clearTimeout(timer)
  }, [copied])

  const handleCopy = async () => {
    try {
      await copyText(value)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <span className={cx('pd-copyable', className)}>
      {value}
      <button
        type="button"
        className="pd-copyable__copy"
        onClick={() => {
          void handleCopy()
        }}
        aria-label={copied ? `${label} copied` : `Copy ${label}`}
        title={copied ? 'Copied' : `Copy ${label}`}
      >
        {copied ? (
          <Check size={13} strokeWidth={2.25} aria-hidden />
        ) : (
          <Copy size={13} strokeWidth={2.25} aria-hidden />
        )}
      </button>
    </span>
  )
}
