import { type ReactNode } from 'react'
import {
  Check,
  Folder,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Phone,
} from 'lucide-react'
import { ProfilePhotoField } from '@/components/ProfilePhotoField'
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon'
import { Button } from '@/components/shadcn/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/shadcn/dropdown-menu'
import { getClientIdentityRows } from '@/lib/clientDocuments'
import { cn } from '@/lib/utils'
import type { Case } from '@/types/case'
import type { Client } from '@/types/client'
import type { ClientMessageChannel } from '@/types/clientMessage'

export type ClientProfileAsideProps = {
  client: Client
  cases: Case[]
  displayName: string
  banglaName?: string
  displayPhone: string
  displayEmail?: string
  displayWhatsapp: string
  activeDocument?: 'passport' | 'nid'
  onAvatarChange: (avatarUrl: string | undefined) => void
  onEditProfile: () => void
  onAddService: () => void
  onOpenMessages: (channel: ClientMessageChannel) => void
  onOpenDocuments: (focus?: 'passport' | 'nid') => void
  contactChip: (props: {
    value: string
    label: string
    href?: string
    to?: string
    variant?: 'identity' | 'cardField'
  }) => ReactNode
}

function paperTone(hasFile: boolean) {
  return hasFile ? ('done' as const) : ('need' as const)
}

function paperStatus(tone: 'done' | 'need') {
  return tone === 'done' ? 'On file' : 'Needed'
}

function whatsappHref(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (!digits) return '#'
  const withCountry =
    digits.startsWith('880') || digits.length > 11
      ? digits
      : digits.startsWith('0')
        ? `88${digits}`
        : digits
  return `https://wa.me/${withCountry}`
}

const actionClass =
  'inline-flex size-8 flex-1 items-center justify-center rounded-lg border border-border bg-background text-foreground transition-colors hover:bg-muted'

export function ClientProfileAside({
  client,
  cases,
  displayName,
  banglaName,
  displayPhone,
  displayEmail,
  displayWhatsapp,
  activeDocument,
  onAvatarChange,
  onEditProfile,
  onAddService,
  onOpenMessages,
  onOpenDocuments,
  contactChip,
}: ClientProfileAsideProps) {
  const email = displayEmail?.trim() || ''
  const papers = getClientIdentityRows(client, cases)

  return (
    <aside
      className="flex min-w-0 flex-col lg:sticky lg:top-0 lg:z-[1] lg:max-h-[calc(100dvh-8.5rem)] lg:overflow-y-auto"
      aria-label="Client profile"
    >
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div
          className="relative h-[4.75rem] w-full overflow-hidden"
          style={{
            background: [
              'radial-gradient(130% 150% at 100% 0%, color-mix(in srgb, var(--color-theme-bright) 70%, transparent) 0%, transparent 58%)',
              'radial-gradient(100% 140% at 0% 100%, color-mix(in srgb, var(--color-theme-mid) 55%, transparent) 0%, transparent 62%)',
              'linear-gradient(135deg, var(--color-theme), var(--color-theme-darker))',
            ].join(', '),
          }}
          aria-hidden
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'radial-gradient(color-mix(in srgb, var(--color-theme-bright) 55%, transparent) 0.06rem, transparent 0.07rem)',
              backgroundSize: '0.75rem 0.75rem',
              maskImage: 'linear-gradient(to left, black 0%, transparent 70%)',
              WebkitMaskImage:
                'linear-gradient(to left, black 0%, transparent 70%)',
            }}
          />
        </div>

        <div className="relative -mt-8 px-3.5 pb-3">
          <div className="flex items-end gap-2.5">
            <div className="inline-flex shrink-0 rounded-full bg-card p-1 shadow-sm">
              <ProfilePhotoField
                name={displayName}
                fallbackName="Client"
                kind="client"
                value={client.avatarUrl}
                onChange={onAvatarChange}
              />
            </div>

            <div className="flex min-w-0 flex-1 items-start justify-between gap-2 pb-1">
              <div className="min-w-0">
                <h1 className="m-0 truncate text-[0.9375rem] font-semibold leading-tight tracking-tight text-foreground">
                  {contactChip({ value: displayName, label: 'Client Name' })}
                </h1>
                {banglaName ? (
                  <p className="m-0 mt-0.5 truncate text-xs text-muted-foreground">
                    {contactChip({
                      value: banglaName,
                      label: 'Bangla Name',
                    })}
                  </p>
                ) : null}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    className="size-7 shrink-0 rounded-full border-border bg-card shadow-sm"
                    aria-label="More client actions"
                  >
                    <MoreHorizontal size={14} strokeWidth={2.25} aria-hidden />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-40">
                  <DropdownMenuItem onSelect={onAddService}>
                    <Folder size={14} strokeWidth={2.25} aria-hidden />
                    Add Service
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={onEditProfile}>
                    <Pencil size={14} strokeWidth={2.25} aria-hidden />
                    Edit Profile
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="mt-2 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-sm text-foreground">
              <Phone
                size={13}
                strokeWidth={2.25}
                className="shrink-0 text-muted-foreground"
                aria-hidden
              />
              <span className="min-w-0 flex-1">
                {contactChip({
                  value: displayPhone,
                  label: 'Phone Number',
                  variant: 'cardField',
                })}
              </span>
            </div>
            {email ? (
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Mail
                  size={13}
                  strokeWidth={2.25}
                  className="shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate">
                  {contactChip({
                    value: email,
                    label: 'Email',
                    href: `mailto:${email}`,
                    variant: 'cardField',
                  })}
                </span>
              </div>
            ) : (
              <button
                type="button"
                className="flex items-center gap-2 text-left text-sm text-muted-foreground transition-colors hover:text-foreground"
                onClick={onEditProfile}
              >
                <Mail size={13} strokeWidth={2.25} aria-hidden />
                Add an email
              </button>
            )}
          </div>

          <nav
            className="mt-2.5 flex items-center gap-1.5"
            aria-label="Contact actions"
          >
            <a
              className={actionClass}
              href={`tel:${displayPhone}`}
              aria-label={`Call ${displayName}`}
              title="Call"
            >
              <Phone size={14} strokeWidth={2.25} aria-hidden />
            </a>
            <a
              className={actionClass}
              href={whatsappHref(displayWhatsapp)}
              target="_blank"
              rel="noreferrer"
              aria-label={`WhatsApp ${displayName}`}
              title="WhatsApp"
            >
              <WhatsAppIcon size={14} />
            </a>
            <button
              type="button"
              className={actionClass}
              onClick={() => onOpenMessages('sms')}
              aria-label={`Messages ${displayName}`}
              title="Messages"
            >
              <MessageSquare size={14} strokeWidth={2.25} aria-hidden />
            </button>
            <button
              type="button"
              className={actionClass}
              onClick={() => onOpenMessages('email')}
              aria-label={`Email ${displayName}`}
              title="Email"
            >
              <Mail size={14} strokeWidth={2.25} aria-hidden />
            </button>
          </nav>
        </div>

        <section aria-label="Identity" className="border-t border-border">
          <h2 className="m-0 border-b border-border px-3.5 py-2.5 text-sm font-semibold">
            Identity
          </h2>
          <ul className="m-0 flex list-none flex-col p-0">
            {papers.map((doc) => {
              const active = activeDocument === doc.kind
              const tone = paperTone(doc.hasFile || Boolean(doc.value))
              const detail = doc.value?.trim() || paperStatus(tone)
              return (
                <li
                  key={doc.kind}
                  className="border-b border-border last:border-b-0"
                >
                  <button
                    type="button"
                    className={cn(
                      'flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm hover:bg-muted/70',
                      active && 'bg-primary/10 font-medium',
                    )}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => onOpenDocuments(doc.kind)}
                  >
                    <span
                      className={cn(
                        'inline-flex size-4 shrink-0 items-center justify-center rounded-full',
                        tone === 'done' &&
                          'bg-emerald-500/15 text-emerald-700',
                        tone === 'need' &&
                          'bg-destructive/15 text-destructive',
                      )}
                      aria-hidden
                    >
                      {tone === 'done' ? (
                        <Check size={12} strokeWidth={2.5} />
                      ) : (
                        <span className="size-1.5 rounded-full bg-current" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{doc.label}</span>
                    <span
                      className={cn(
                        'max-w-[9rem] shrink-0 truncate text-xs tabular-nums text-muted-foreground',
                        !doc.value && tone === 'need' && 'text-destructive',
                      )}
                    >
                      {detail}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      </section>
    </aside>
  )
}
