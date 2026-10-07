import { Button, Input, Textarea } from '@/components/ui'
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'
import { ImagePlus, X } from 'lucide-react'
import {
  sendClientMessage,
  useClientMessages,
  validateClientMessage,
} from '@/lib/clientMessagesStore'
import { formatDisplayDate } from '@/lib/formatDate'
import type { Client } from '@/types/client'
import type {
  ClientMessageAttachment,
  ClientMessageChannel,
} from '@/types/clientMessage'
import '@/styles/layout-clients.css'

const MAX_IMAGE_BYTES = 2 * 1024 * 1024

function formatMessageStamp(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return formatDisplayDate(value)
  const time = date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${formatDisplayDate(value)} · ${time}`
}

function readImageAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () =>
      reject(reader.error ?? new Error('Unable to read image'))
    reader.readAsDataURL(file)
  })
}

function channelCopy(channel: ClientMessageChannel, address: string) {
  if (channel === 'email') {
    return address ? `Email · ${address}` : 'Email · no address on this profile'
  }
  return address ? `SMS · ${address}` : 'SMS · no phone on this profile'
}

export function ClientMessagesPanel({
  client,
  channel = 'sms',
}: {
  client: Client
  channel?: ClientMessageChannel
}) {
  const thread = useClientMessages(client.id, channel)
  const chronological = useMemo(() => [...thread].reverse(), [thread])
  const threadRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fileInputId = useId()
  const [body, setBody] = useState('')
  const [attachment, setAttachment] = useState<
    ClientMessageAttachment | undefined
  >()
  const [error, setError] = useState<string | undefined>()

  const isEmail = channel === 'email'
  const address = isEmail ? client.email?.trim() ?? '' : client.phone.trim()
  const canSend =
    Boolean(address) &&
    (isEmail
      ? Boolean(body.trim()) || Boolean(attachment)
      : Boolean(body.trim()))
  const historyLabel = isEmail ? 'Email history' : 'SMS history'
  const emptyLabel = isEmail ? 'No emails yet' : 'No messages yet'

  useEffect(() => {
    const el = threadRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [chronological.length])

  const clearAttachment = () => {
    setAttachment(undefined)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Choose an image file to attach.')
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError('Keep attached images under 2 MB.')
      return
    }
    try {
      const dataUrl = await readImageAsDataUrl(file)
      setAttachment({
        name: file.name,
        dataUrl,
        mimeType: file.type || 'image/jpeg',
      })
      if (error) setError(undefined)
    } catch {
      setError('Could not read that image.')
    }
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const validation = validateClientMessage(
      channel,
      body,
      address,
      attachment,
    )
    if (validation) {
      setError(validation)
      return
    }
    try {
      sendClientMessage({
        clientId: client.id,
        channel,
        body,
        attachment: isEmail ? attachment : undefined,
      })
      setBody('')
      clearAttachment()
      setError(undefined)
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : isEmail
            ? 'Could not send email.'
            : 'Could not send SMS.',
      )
    }
  }

  return (
    <div className="pd-client-messages">
      <div
        className={[
          'pd-client-messages__frame',
          isEmail ? 'pd-client-messages__frame--email' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <p className="pd-client-messages__to">
          {channelCopy(channel, address)}
        </p>

        <div
          ref={threadRef}
          className="pd-client-messages__thread"
          aria-live="polite"
        >
          {chronological.length === 0 ? (
            <p className="pd-client-messages__empty">{emptyLabel}</p>
          ) : (
            <ul className="pd-client-messages__list" aria-label={historyLabel}>
              {chronological.map((item) => (
                <li
                  key={item.id}
                  className="pd-client-messages__item pd-client-messages__item--out"
                >
                  <div className="pd-client-messages__bubble">
                    {item.body ? <p>{item.body}</p> : null}
                    {item.attachment ? (
                      <img
                        className="pd-client-messages__image"
                        src={item.attachment.dataUrl}
                        alt={item.attachment.name}
                      />
                    ) : null}
                  </div>
                  <p className="pd-client-messages__meta">
                    {formatMessageStamp(item.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {isEmail ? (
          <form
            className="pd-client-messages__composer pd-client-messages__composer--email"
            onSubmit={handleSubmit}
            noValidate
          >
            <Textarea
              className="pd-client-messages__editor"
              value={body}
              onChange={(event) => {
                setBody(event.target.value)
                if (error) setError(undefined)
              }}
              onBlur={() => {
                const validation = validateClientMessage(
                  channel,
                  body,
                  address,
                  attachment,
                )
                if (validation) setError(validation)
              }}
              placeholder="Write your email…"
              aria-label="Email"
              disabled={!address}
              rows={8}
              error={error}
            />
            {attachment ? (
              <div className="pd-client-messages__attach-preview">
                <img
                  src={attachment.dataUrl}
                  alt={attachment.name}
                  className="pd-client-messages__attach-thumb"
                />
                <span className="pd-client-messages__attach-name">
                  {attachment.name}
                </span>
                <button
                  type="button"
                  className="pd-client-messages__attach-remove"
                  onClick={clearAttachment}
                  aria-label="Remove attached image"
                  title="Remove image"
                >
                  <X size={14} strokeWidth={2.25} aria-hidden />
                </button>
              </div>
            ) : null}
            <div className="pd-client-messages__composer-actions">
              <input
                ref={fileInputRef}
                id={fileInputId}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/*"
                className="pd-client-messages__file"
                onChange={handleImage}
                disabled={!address}
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={!address}
                onClick={() => fileInputRef.current?.click()}
                aria-label="Attach image"
                title="Attach image"
              >
                <ImagePlus size={14} strokeWidth={2.25} aria-hidden />
                Attach image
              </Button>
              <Button type="submit" disabled={!canSend}>
                Send email
              </Button>
            </div>
          </form>
        ) : (
          <form
            className="pd-client-messages__composer pd-client-messages__composer--sms"
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
              onBlur={() => {
                const validation = validateClientMessage(
                  channel,
                  body,
                  address,
                  attachment,
                )
                if (validation) setError(validation)
              }}
              placeholder="Message"
              aria-label="Message"
              disabled={!address}
              autoComplete="off"
              error={error}
            />
            <Button type="submit" disabled={!canSend}>
              Send
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
