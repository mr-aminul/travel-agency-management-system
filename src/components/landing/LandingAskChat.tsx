import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { ChatCircle, PaperPlaneTilt, X } from '@phosphor-icons/react'
import { ApiError, apiFetch } from '@/lib/apiClient'
import { SALES_EMAIL, SALES_MAILTO } from '@/components/landing/landingContent'
import { authApiConfigured } from '@/lib/billing/platformFlag'

type LandingAskChatProps = {
  open: boolean
  onOpen: () => void
  onClose: () => void
}

type ChatStatus = 'idle' | 'sending' | 'sent' | 'error'

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const body = error.body
    if (
      body &&
      typeof body === 'object' &&
      'error' in body &&
      typeof (body as { error: unknown }).error === 'string'
    ) {
      return (body as { error: string }).error
    }
  }
  if (error instanceof Error && error.message) return error.message
  return 'Could not send your message. Try email instead.'
}

export function LandingAskChat({ open, onOpen, onClose }: LandingAskChatProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<ChatStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const timer = window.setTimeout(() => nameRef.current?.focus(), 50)
    return () => {
      document.removeEventListener('keydown', onKey)
      window.clearTimeout(timer)
    }
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node | null
      if (!target) return
      if (panelRef.current?.contains(target)) return
      const askBtn = document.querySelector('.lp2-ask')
      if (askBtn?.contains(target)) return
      onClose()
    }
    document.addEventListener('mousedown', onPointer)
    return () => document.removeEventListener('mousedown', onPointer)
  }, [open, onClose])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (!authApiConfigured()) {
      window.location.href = SALES_MAILTO
      return
    }

    setStatus('sending')
    try {
      await apiFetch<{ ok: boolean }>('/api/platform/public/contact', {
        method: 'POST',
        skipAuth: true,
        body: { name, email, message },
      })
      setStatus('sent')
      setMessage('')
    } catch (err) {
      setStatus('error')
      setError(errorMessage(err))
    }
  }

  return (
    <>
      <button
        type="button"
        className="lp2-ask button-sm"
        aria-expanded={open}
        aria-controls={open ? titleId : undefined}
        aria-label={open ? 'Close chat' : 'Ask us'}
        onClick={() => (open ? onClose() : onOpen())}
      >
        {open ? <X size={20} weight="bold" /> : <ChatCircle size={20} weight="fill" />}
        <span aria-hidden>{open ? 'Close' : 'Ask us'}</span>
      </button>

      {open ? (
        <div
          ref={panelRef}
          className="lp2-chat"
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
        >
          <header className="lp2-chat__head">
            <div>
              <p className="lp2-chat__eyebrow caption-3">Inventive Lab</p>
              <h2 className="lp2-chat__title title-2" id={titleId}>
                Ask us anything
              </h2>
            </div>
            <button
              type="button"
              className="lp2-chat__close"
              aria-label="Close chat"
              onClick={onClose}
            >
              <X size={18} weight="bold" />
            </button>
          </header>

          <div className="lp2-chat__thread">
            <div className="lp2-chat__bubble lp2-chat__bubble--bot body-6">
              Hi. Tell us what your agency needs and we will reply by email from
              Dhaka.
            </div>
            {status === 'sent' ? (
              <div className="lp2-chat__bubble lp2-chat__bubble--bot body-6">
                Got it. We received your message and will reply to {email || 'your email'}.
              </div>
            ) : null}
          </div>

          {status === 'sent' ? (
            <div className="lp2-chat__done">
              <button
                type="button"
                className="lp2-btn lp2-btn--navy button-sm"
                onClick={() => {
                  setStatus('idle')
                  setError(null)
                }}
              >
                Send another
              </button>
              <button type="button" className="lp2-btn lp2-btn--ghost button-sm" onClick={onClose}>
                Close
              </button>
            </div>
          ) : (
            <form className="lp2-chat__form" onSubmit={handleSubmit}>
              <label className="lp2-chat__field">
                <span className="caption-3">Name</span>
                <input
                  ref={nameRef}
                  className="lp2-chat__input"
                  name="name"
                  autoComplete="name"
                  required
                  maxLength={120}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
              <label className="lp2-chat__field">
                <span className="caption-3">Email</span>
                <input
                  className="lp2-chat__input"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={200}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
              <label className="lp2-chat__field">
                <span className="caption-3">Message</span>
                <textarea
                  className="lp2-chat__input lp2-chat__textarea"
                  name="message"
                  required
                  minLength={5}
                  maxLength={4000}
                  rows={4}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Ask about trial, pricing, or a walkthrough…"
                />
              </label>
              {error ? <p className="lp2-chat__error caption-2">{error}</p> : null}
              <div className="lp2-chat__actions">
                <button
                  type="submit"
                  className="lp2-btn lp2-btn--amber button-sm"
                  disabled={status === 'sending'}
                >
                  {status === 'sending' ? 'Sending…' : 'Send'}
                  <PaperPlaneTilt size={16} weight="fill" />
                </button>
                <a className="lp2-chat__mail caption-2" href={SALES_MAILTO}>
                  Or email {SALES_EMAIL}
                </a>
              </div>
            </form>
          )}
        </div>
      ) : null}
    </>
  )
}
