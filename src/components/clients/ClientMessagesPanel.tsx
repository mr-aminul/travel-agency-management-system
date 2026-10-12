import { Button, ConfirmDialog, Input, Textarea } from '@/components/ui'
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react'
import { ImagePlus, X } from 'lucide-react'
import { SmsTemplatePicker } from '@/components/clients/SmsTemplatePicker'
import { readAgencyProfile } from '@/lib/agencyProfile'
import { getActiveTenantId } from '@/lib/authApi'
import {
  buildBrandedEmailHtml,
  isBrandedEmailHtml,
} from '@/lib/brandedEmailHtml'
import { sendClientEmailViaApi } from '@/lib/clientEmailApi'
import {
  sendClientMessage,
  useClientMessages,
  validateClientMessage,
} from '@/lib/clientMessagesStore'
import { formatDisplayDate } from '@/lib/formatDate'
import { sendClientSmsViaApi } from '@/lib/smsInboundApi'
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
    return address
      ? `Email · ${address}`
      : 'Email · no address on this profile'
  }
  return address
    ? `SMS · ${address}`
    : 'SMS · no phone on this profile'
}

function emailSubjectForAgency(agencyName: string, plainBody: string): string {
  const brand = agencyName.trim() || 'your agency'
  const firstLine = plainBody
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean)
  if (firstLine && firstLine.length <= 80 && !/^dear\b/i.test(firstLine)) {
    return firstLine
  }
  return `Update from ${brand}`
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
  const [useBrandedEmail, setUseBrandedEmail] = useState(false)
  const [attachment, setAttachment] = useState<
    ClientMessageAttachment | undefined
  >()
  const [error, setError] = useState<string | undefined>()
  const [isSendingSms, setIsSendingSms] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [showSmsConfirm, setShowSmsConfirm] = useState(false)
  const [showEmailConfirm, setShowEmailConfirm] = useState(false)

  const isEmail = channel === 'email'
  const address = isEmail ? client.email?.trim() ?? '' : client.phone.trim()
  const agency = readAgencyProfile(getActiveTenantId())
  const brandedPreviewHtml = useMemo(() => {
    if (!isEmail || !useBrandedEmail || !body.trim()) return ''
    return buildBrandedEmailHtml({
      body,
      agency,
      recipientName: client.name,
    })
  }, [agency, body, client.name, isEmail, useBrandedEmail])
  const isBusy = isSendingSms || isSendingEmail
  const canCompose =
    Boolean(address) &&
    !isBusy &&
    (isEmail
      ? Boolean(body.trim()) || Boolean(attachment)
      : Boolean(body.trim()))
  const historyLabel = isEmail ? 'Email history' : 'SMS history'
  const emptyLabel = isEmail ? 'No email sent yet' : 'No SMS sent yet'

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

  const blockSmsEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
    }
  }

  const openSmsConfirm = () => {
    const validation = validateClientMessage(channel, body, address)
    if (validation) {
      setError(validation)
      return
    }
    setError(undefined)
    setShowSmsConfirm(true)
  }

  const sendSms = async () => {
    setShowSmsConfirm(false)
    setIsSendingSms(true)
    setError(undefined)
    try {
      await sendClientSmsViaApi({
        clientId: client.id,
        body: body.trim(),
      })
      sendClientMessage({
        clientId: client.id,
        channel: 'sms',
        body,
      })
      setBody('')
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Could not send this SMS.',
      )
    } finally {
      setIsSendingSms(false)
    }
  }

  const openEmailConfirm = () => {
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
    setError(undefined)
    setShowEmailConfirm(true)
  }

  const sendEmail = async () => {
    setShowEmailConfirm(false)
    setIsSendingEmail(true)
    setError(undefined)
    const plain = body.trim()
    const textForSend = plain || (attachment ? 'See attached image.' : '')
    const html =
      useBrandedEmail && plain
        ? buildBrandedEmailHtml({
            body: plain,
            agency,
            recipientName: client.name,
          })
        : undefined
    const subject = emailSubjectForAgency(agency.businessName, plain)
    try {
      await sendClientEmailViaApi({
        clientId: client.id,
        subject,
        text: textForSend,
        html,
        attachment,
      })
      sendClientMessage({
        clientId: client.id,
        channel: 'email',
        body: html || textForSend,
        attachment,
      })
      setBody('')
      setUseBrandedEmail(false)
      clearAttachment()
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Could not send this email.',
      )
    } finally {
      setIsSendingEmail(false)
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
                  <div
                    className={[
                      'pd-client-messages__bubble',
                      isBrandedEmailHtml(item.body)
                        ? 'pd-client-messages__bubble--email-html'
                        : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {item.body ? (
                      isBrandedEmailHtml(item.body) ? (
                        <iframe
                          title={`Email ${item.id}`}
                          className="pd-client-messages__email-frame"
                          sandbox=""
                          srcDoc={item.body}
                        />
                      ) : (
                        <p>{item.body}</p>
                      )
                    ) : null}
                    {item.attachment ? (
                      <img
                        className="pd-client-messages__image"
                        src={item.attachment.dataUrl}
                        alt={item.attachment.name}
                      />
                    ) : null}
                  </div>
                  <p className="pd-client-messages__meta">
                    Sent · {formatMessageStamp(item.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {isEmail ? (
          <form
            className="pd-client-messages__composer pd-client-messages__composer--email"
            onSubmit={(event) => event.preventDefault()}
            noValidate
          >
            <div className="pd-client-messages__template-bar">
              <SmsTemplatePicker
                client={client}
                channel="email"
                disabled={!address || isBusy}
                onPick={(next) => {
                  setBody(next)
                  setUseBrandedEmail(true)
                  if (error) setError(undefined)
                }}
              />
            </div>
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
              disabled={!address || isBusy}
              rows={useBrandedEmail ? 5 : 8}
              error={error}
              hint={
                useBrandedEmail
                  ? 'Branded email layout — edit the text; preview updates below.'
                  : undefined
              }
            />
            {brandedPreviewHtml ? (
              <div className="pd-client-messages__email-preview">
                <p className="pd-client-messages__email-preview-label">
                  Email preview
                </p>
                <iframe
                  title="Branded email preview"
                  className="pd-client-messages__email-frame pd-client-messages__email-frame--preview"
                  sandbox=""
                  srcDoc={brandedPreviewHtml}
                />
              </div>
            ) : null}
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
                disabled={!address || isBusy}
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={!address || isBusy}
                onClick={() => fileInputRef.current?.click()}
                aria-label="Attach image"
                title="Attach image"
              >
                <ImagePlus size={14} strokeWidth={2.25} aria-hidden />
                Attach image
              </Button>
              <Button
                type="button"
                disabled={!canCompose}
                onClick={openEmailConfirm}
              >
                {isSendingEmail ? 'Sending…' : 'Send email'}
              </Button>
            </div>
          </form>
        ) : (
          <form
            className="pd-client-messages__composer pd-client-messages__composer--sms"
            onSubmit={(event) => event.preventDefault()}
            noValidate
          >
            <div className="pd-client-messages__template-bar">
              <SmsTemplatePicker
                client={client}
                channel="sms"
                disabled={!address || isSendingSms}
                onPick={(next) => {
                  setBody(next)
                  setUseBrandedEmail(false)
                  if (error) setError(undefined)
                }}
              />
            </div>
            <div className="pd-client-messages__sms-row">
              <Input
                className="pd-client-messages__input"
                value={body}
                onChange={(event) => {
                  setBody(event.target.value)
                  if (error) setError(undefined)
                }}
                onKeyDown={blockSmsEnter}
                onBlur={() => {
                  const validation = validateClientMessage(
                    channel,
                    body,
                    address,
                  )
                  if (validation) setError(validation)
                }}
                placeholder="Message"
                aria-label="Message"
                disabled={!address || isSendingSms}
                autoComplete="off"
                error={error}
              />
              <Button
                type="button"
                disabled={!canCompose}
                onClick={openSmsConfirm}
              >
                {isSendingSms ? 'Sending…' : 'Send SMS'}
              </Button>
            </div>
          </form>
        )}
      </div>

      <ConfirmDialog
        open={showSmsConfirm}
        onClose={() => setShowSmsConfirm(false)}
        onConfirm={() => {
          void sendSms()
        }}
        title={`Confirm sending to ${address}?`}
        confirmLabel="Send"
        cancelLabel="Cancel"
      />
      <ConfirmDialog
        open={showEmailConfirm}
        onClose={() => setShowEmailConfirm(false)}
        onConfirm={() => {
          void sendEmail()
        }}
        title={`Send email to ${address}?`}
        confirmLabel="Send"
        cancelLabel="Cancel"
      />
    </div>
  )
}
