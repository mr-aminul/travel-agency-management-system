import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Button, Input } from '@/components/ui'
import {
  sendClientSms,
  useClientSms,
  validateClientSms,
} from '@/lib/clientMessagesStore'
import { formatDisplayDate } from '@/lib/formatDate'
import type { Client } from '@/types/client'
import '@/styles/layout-clients.css'

function formatMessageStamp(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return formatDisplayDate(value)
  const time = date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${formatDisplayDate(value)} · ${time}`
}

export function ClientMessagesPanel({ client }: { client: Client }) {
  const thread = useClientSms(client.id)
  const chronological = useMemo(() => [...thread].reverse(), [thread])
  const threadRef = useRef<HTMLDivElement>(null)
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | undefined>()

  const phone = client.phone.trim()
  const canSend = Boolean(phone) && Boolean(body.trim())

  useEffect(() => {
    const el = threadRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [chronological.length])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const validation = validateClientSms(body, phone)
    if (validation) {
      setError(validation)
      return
    }
    try {
      sendClientSms({ clientId: client.id, body })
      setBody('')
      setError(undefined)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not send SMS.')
    }
  }

  return (
    <div className="pd-client-messages">
      <div className="pd-client-messages__frame">
        <p className="pd-client-messages__to">
          {phone ? `SMS · ${phone}` : 'SMS · no phone on this profile'}
        </p>

        <div
          ref={threadRef}
          className="pd-client-messages__thread"
          aria-live="polite"
        >
          {chronological.length === 0 ? (
            <p className="pd-client-messages__empty">No messages yet</p>
          ) : (
            <ul className="pd-client-messages__list" aria-label="SMS history">
              {chronological.map((item) => (
                <li
                  key={item.id}
                  className="pd-client-messages__item pd-client-messages__item--out"
                >
                  <p className="pd-client-messages__bubble">{item.body}</p>
                  <p className="pd-client-messages__meta">
                    {formatMessageStamp(item.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <form
          className="pd-client-messages__composer"
          onSubmit={handleSubmit}
          noValidate
        >
          <Input
            className="pd-client-messages__input"
            value={body}
            onChange={(event) => {
              setBody(event.target.value)
              if (error) setError(undefined)
            }}
            placeholder="Message"
            aria-label="Message"
            disabled={!phone}
            autoComplete="off"
            error={error}
          />
          <Button type="submit" disabled={!canSend}>
            Send
          </Button>
        </form>
      </div>
    </div>
  )
}
