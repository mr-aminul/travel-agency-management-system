import { ConfirmDialog } from '@/components/shadcn/confirm-dialog'
import { Button } from '@/components/shadcn/button'
import { Input } from '@/components/shadcn/input'
import { Textarea } from '@/components/shadcn/textarea'
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/shadcn/toggle-group'
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react'
import { ImagePlus, Mail, MessageSquare, X } from 'lucide-react'
import { SmsTemplatePicker } from '@/components/clients/SmsTemplatePicker'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/shadcn/empty'
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
import { useBilling } from '@/lib/billing/useBilling'
import { sendClientSmsViaApi } from '@/lib/smsInboundApi'
import type { Client } from '@/types/client'
import type {
  ClientMessageAttachment,
  ClientMessageChannel,
} from '@/types/clientMessage'
import { cn } from '@/lib/utils'

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
  onChannelChange,
  embedded = false,
}: {
  client: Client
  channel?: ClientMessageChannel
  onChannelChange?: (channel: ClientMessageChannel) => void
  /** Fill a sheet or side panel without the outer card chrome. */
  embedded?: boolean
}) {
  const thread = useClientMessages(client.id, channel)
  const chronological = useMemo(() => [...thread].reverse(), [thread])
  const threadRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fileInputId = useId()
  const { snapshot: billingSnapshot } = useBilling()
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
  const platformAllowsSms = billingSnapshot?.billing?.smsEnabled !== false
  const agencySmsOn = billingSnapshot?.billing?.agencySmsEnabled !== false
  const smsSendingOn = platformAllowsSms && agencySmsOn
  const smsDisabledReason = !platformAllowsSms
    ? 'SMS is turned off for this agency. Contact support if you need it back on.'
    : !agencySmsOn
      ? 'SMS sending is turned off in your billing settings. Turn it back on to send messages.'
      : undefined
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
      : smsSendingOn && Boolean(body.trim()))
  const historyLabel = isEmail ? 'Email history' : 'SMS history'
  const emptyLabel = isEmail ? 'No email sent yet' : 'No SMS sent yet'

  useEffect(() => {
    const el = threadRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [chronological.length])

  useEffect(() => {
    setBody('')
    setUseBrandedEmail(false)
    setAttachment(undefined)
    setError(undefined)
    setShowSmsConfirm(false)
    setShowEmailConfirm(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [channel])

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
    <div className={cn('flex flex-col', embedded && 'min-h-0 flex-1')}>
      <div
        className={cn(
          'flex flex-col overflow-hidden bg-card',
          embedded
            ? 'min-h-0 flex-1 border-0 shadow-none'
            : 'min-h-[28rem] rounded-xl border border-border shadow-sm',
        )}
      >
        <div className="flex flex-col gap-2 border-b border-border px-3.5 py-2.5">
          {onChannelChange ? (
            <ToggleGroup
              type="single"
              value={channel}
              onValueChange={(value) => {
                if (value === 'sms' || value === 'email') {
                  onChannelChange(value)
                }
              }}
              variant="outline"
              spacing={0}
              className="grid w-full grid-cols-2"
              aria-label="Message channel"
            >
              <ToggleGroupItem
                value="sms"
                className="h-9 justify-center gap-1.5 rounded-none px-3 first:rounded-l-lg last:rounded-r-lg"
              >
                <MessageSquare size={14} strokeWidth={2.25} aria-hidden />
                SMS
              </ToggleGroupItem>
              <ToggleGroupItem
                value="email"
                className="h-9 justify-center gap-1.5 rounded-none px-3 first:rounded-l-lg last:rounded-r-lg"
              >
                <Mail size={14} strokeWidth={2.25} aria-hidden />
                Email
              </ToggleGroupItem>
            </ToggleGroup>
          ) : null}
          <p className="m-0 text-xs font-semibold text-muted-foreground">
            {channelCopy(channel, address)}
          </p>
        </div>

        <div
          ref={threadRef}
          className="min-h-[16rem] max-h-[28rem] flex-1 overflow-y-auto bg-[color-mix(in_srgb,var(--color-bg)_88%,var(--color-surface))] p-4"
          aria-live="polite"
        >
          {chronological.length === 0 ? (
            <div className="flex min-h-[14rem] items-center justify-center">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <MessageSquare />
                  </EmptyMedia>
                  <EmptyTitle>{emptyLabel}</EmptyTitle>
                </EmptyHeader>
              </Empty>
            </div>
          ) : (
            <ul
              className="m-0 flex list-none flex-col gap-3 p-0"
              aria-label={historyLabel}
            >
              {chronological.map((item) => (
                <li
                  key={item.id}
                  className="flex max-w-[min(24rem,88%)] flex-col items-end gap-1 self-end"
                >
                  <div
                    className={cn(
                      'm-0 flex flex-col gap-2 whitespace-pre-wrap rounded-[1rem_1rem_0.3rem_1rem] bg-primary px-3.5 py-2.5 text-sm leading-snug text-primary-foreground shadow-sm',
                      isBrandedEmailHtml(item.body) &&
                        'max-w-[min(100%,28rem)] overflow-hidden bg-[#eef2f6] p-0 text-inherit shadow-none',
                    )}
                  >
                    {item.body ? (
                      isBrandedEmailHtml(item.body) ? (
                        <iframe
                          title={`Email ${item.id}`}
                          className="block min-h-[18rem] w-full border-0 bg-white"
                          sandbox=""
                          srcDoc={item.body}
                        />
                      ) : (
                        <p className="m-0">{item.body}</p>
                      )
                    ) : null}
                    {item.attachment ? (
                      <img
                        className="max-h-48 max-w-full rounded-md"
                        src={item.attachment.dataUrl}
                        alt={item.attachment.name}
                      />
                    ) : null}
                  </div>
                  <p className="m-0 text-[0.6875rem] text-muted-foreground">
                    Sent · {formatMessageStamp(item.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {isEmail ? (
          <form
            className="flex flex-col gap-3 border-t border-border bg-card p-3.5"
            onSubmit={(event) => event.preventDefault()}
            noValidate
          >
            <div className="flex flex-wrap items-center gap-2">
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
              className="min-h-[8rem]"
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
              aria-invalid={error ? true : undefined}
            />
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            {brandedPreviewHtml ? (
              <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-background p-2.5">
                <p className="m-0 text-xs font-semibold text-muted-foreground">
                  Email Preview
                </p>
                <iframe
                  title="Branded email preview"
                  className="block min-h-[12rem] w-full border-0 bg-white"
                  sandbox=""
                  srcDoc={brandedPreviewHtml}
                />
              </div>
            ) : null}
            {attachment ? (
              <div className="flex items-center gap-2">
                <img
                  src={attachment.dataUrl}
                  alt={attachment.name}
                  className="size-10 rounded object-cover"
                />
                <span className="min-w-0 flex-1 truncate text-sm">
                  {attachment.name}
                </span>
                <button
                  type="button"
                  className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
                  onClick={clearAttachment}
                  aria-label="Remove attached image"
                  title="Remove image"
                >
                  <X size={14} strokeWidth={2.25} aria-hidden />
                </button>
              </div>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                id={fileInputId}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/*"
                className="sr-only"
                onChange={handleImage}
                disabled={!address || isBusy}
              />
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-lg"
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
                className="h-9 rounded-lg"
                disabled={!canCompose}
                onClick={openEmailConfirm}
              >
                {isSendingEmail ? 'Sending…' : 'Send email'}
              </Button>
            </div>
          </form>
        ) : smsSendingOn ? (
          <form
            className="flex flex-col gap-3 border-t border-border bg-card p-3.5"
            onSubmit={(event) => event.preventDefault()}
            noValidate
          >
            <div className="flex flex-wrap items-center gap-2">
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
            <div className="flex flex-wrap items-end gap-2">
              <Input
                className="min-w-[12rem] flex-1"
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
              />
              <Button
                type="button"
                className="h-9 rounded-lg"
                disabled={!canCompose}
                onClick={openSmsConfirm}
              >
                {isSendingSms ? 'Sending…' : 'Send SMS'}
              </Button>
            </div>
            {error ? (
              <p className="m-0 text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
          </form>
        ) : (
          <div className="border-t border-border bg-card p-3.5">
            <p className="m-0 text-sm text-muted-foreground" role="status">
              {smsDisabledReason}
            </p>
          </div>
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
