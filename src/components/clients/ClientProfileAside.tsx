import { type ReactNode } from 'react'
import {
  Check,
  Folder,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Phone,
  Wallet,
} from 'lucide-react'
import { ProfilePhotoField } from '@/components/ProfilePhotoField'
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon'
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
  /** Optional: record payment from the person strip (Clients v3). */
  onOpenPayments?: () => void
  /** Quiet strip: compact identity chips, no heavy Identity block. */
  density?: 'default' | 'quiet'
  /**
   * `aside` = sticky left column (default).
   * `top` = full-width header above tabs (easy to trial / revert).
   */
  layout?: 'aside' | 'top'
  /** Renders under the profile card (e.g. Next list). */
  children?: ReactNode
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
  return tone === 'done' ? '' : 'Needed'
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
  'inline-flex h-8 min-w-0 items-center justify-center rounded-lg border border-white/80 bg-white text-[var(--color-theme)] shadow-[var(--shadow-card)] transition-colors hover:bg-white/90'

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
  onOpenPayments,
  density = 'default',
  layout = 'aside',
  children,
  contactChip,
}: ClientProfileAsideProps) {
  const email = displayEmail?.trim() || ''
  const papers = getClientIdentityRows(client, cases)
  const quiet = density === 'quiet' || layout === 'top'
  const isTop = layout === 'top'

  const moreMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex size-7 items-center justify-center outline-none',
            isTop
              ? 'text-white/70 hover:text-white focus-visible:text-white'
              : 'absolute top-2.5 right-2.5 z-[1] text-white/70 hover:text-white focus-visible:text-white',
          )}
          aria-label="More client actions"
        >
          <MoreHorizontal size={14} strokeWidth={2.25} aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuItem onSelect={onAddService}>
          <Folder size={14} strokeWidth={2.25} aria-hidden />
          Add Service
        </DropdownMenuItem>
        {onOpenPayments ? (
          <DropdownMenuItem onSelect={onOpenPayments}>
            <Wallet size={14} strokeWidth={2.25} aria-hidden />
            Record Payment
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onSelect={onEditProfile}>
          <Pencil size={14} strokeWidth={2.25} aria-hidden />
          Edit Profile
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const contactActions = (
    <nav
      className={cn(
        'flex items-center gap-1.5',
        isTop ? 'shrink-0' : 'mt-3.5 w-full',
      )}
      aria-label="Contact actions"
    >
      <a
        className={cn(actionClass, !isTop && 'flex-1')}
        href={`tel:${displayPhone}`}
        aria-label={`Call ${displayName}`}
        title="Call"
      >
        <Phone size={14} strokeWidth={2.25} aria-hidden />
      </a>
      <a
        className={cn(actionClass, !isTop && 'flex-1')}
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
        className={cn(actionClass, !isTop && 'flex-1')}
        onClick={() => onOpenMessages('sms')}
        aria-label={`Messages ${displayName}`}
        title="Messages"
      >
        <MessageSquare size={14} strokeWidth={2.25} aria-hidden />
      </button>
      <button
        type="button"
        className={cn(actionClass, !isTop && 'flex-1')}
        onClick={() => onOpenMessages('email')}
        aria-label={`Email ${displayName}`}
        title="Email"
      >
        <Mail size={14} strokeWidth={2.25} aria-hidden />
      </button>
      {isTop ? moreMenu : null}
    </nav>
  )

  const identityQuiet = (
    <div
      className="flex flex-wrap gap-1.5 border-t border-border/70 bg-[var(--color-surface-raised,var(--card))] px-3.5 py-2.5"
      aria-label="Identity"
    >
      {papers.map((doc) => {
        const active = activeDocument === doc.kind
        const tone = paperTone(doc.hasFile || Boolean(doc.value))
        return (
          <button
            key={doc.kind}
            type="button"
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors',
              active
                ? 'border-primary bg-primary/10 text-foreground'
                : 'border-border bg-background text-muted-foreground hover:text-foreground',
            )}
            aria-current={active ? 'page' : undefined}
            onClick={() => onOpenDocuments(doc.kind)}
          >
            <span
              className={cn(
                'inline-flex size-3.5 shrink-0 items-center justify-center rounded-full',
                tone === 'done' &&
                  'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
                tone === 'need' && 'bg-destructive/15 text-destructive',
              )}
              aria-hidden
            >
              {tone === 'done' ? (
                <Check size={10} strokeWidth={2.5} />
              ) : (
                <span className="size-1 rounded-full bg-current" />
              )}
            </span>
            {doc.label}
            {doc.value ? (
              <span className="max-w-[8rem] truncate text-muted-foreground">
                {doc.value}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )

  const identityDefault = (
    <section
      aria-label="Identity"
      className="border-t border-border/70 bg-[var(--color-surface-raised,var(--card))]"
    >
      <h2 className="m-0 border-b border-border/70 px-3.5 py-2.5 text-sm font-semibold text-foreground">
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
                  'flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm text-foreground hover:bg-muted/70',
                  active && 'bg-primary/10 font-medium',
                )}
                aria-current={active ? 'page' : undefined}
                onClick={() => onOpenDocuments(doc.kind)}
              >
                <span
                  className={cn(
                    'inline-flex size-4 shrink-0 items-center justify-center rounded-full',
                    tone === 'done' &&
                      'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
                    tone === 'need' && 'bg-destructive/15 text-destructive',
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
                {detail ? (
                  <span
                    className={cn(
                      'max-w-[9rem] shrink-0 truncate text-xs tabular-nums text-muted-foreground',
                      !doc.value && tone === 'need' && 'text-destructive',
                    )}
                  >
                    {detail}
                  </span>
                ) : null}
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )

  const card = (
    <section
      className={cn(
        'pd-client-profile-aside-card',
        isTop && 'pd-client-profile-aside-card--top',
      )}
    >
      <div className="pd-client-profile-aside-card__cover">
        {!isTop ? moreMenu : null}

        <div
          className={cn(
            'relative [&_a]:!text-white [&_nav_a]:!text-[var(--color-theme)]',
            isTop
              ? 'flex flex-wrap items-center gap-3 px-4 py-3.5'
              : 'px-3.5 pb-3.5 pt-3.5',
          )}
        >
          <div
            className={cn(
              'flex min-w-0 items-start gap-2.5',
              isTop && 'min-w-[16rem] flex-1 items-center',
            )}
          >
            <div className="inline-flex shrink-0 [&_[data-slot=avatar]]:!bg-white [&_[data-slot=avatar-fallback]]:!bg-white">
              <ProfilePhotoField
                name={displayName}
                fallbackName="Client"
                kind="client"
                value={client.avatarUrl}
                onChange={onAvatarChange}
              />
            </div>

            <div className={cn('min-w-0 flex-1', !isTop && 'pt-0.5 pr-8')}>
              <h1 className="m-0 text-lg font-semibold leading-snug tracking-tight break-words text-white [overflow-wrap:anywhere] [&_.group]:inline [&_span]:break-words">
                {contactChip({ value: displayName, label: 'Client Name' })}
              </h1>
              {banglaName ? (
                <p className="m-0 mt-0.5 text-xs leading-snug break-words text-white/75 [overflow-wrap:anywhere] [&_.group]:inline [&_span]:break-words">
                  {contactChip({
                    value: banglaName,
                    label: 'Bangla Name',
                  })}
                </p>
              ) : null}

              <div
                className={cn(
                  'mt-1 flex gap-0.5',
                  isTop
                    ? 'flex-wrap items-center gap-x-3 gap-y-0.5'
                    : 'flex-col',
                )}
              >
                <div className="flex min-w-0 items-center gap-1.5 text-xs leading-snug text-white/90">
                  <Phone
                    size={11}
                    strokeWidth={2.25}
                    className="shrink-0 text-white/65"
                    aria-hidden
                  />
                  <span className="min-w-0 truncate">
                    {contactChip({
                      value: displayPhone,
                      label: 'Phone Number',
                      variant: 'cardField',
                    })}
                  </span>
                </div>
                {email ? (
                  <div className="flex min-w-0 items-center gap-1.5 text-xs leading-snug text-white/90">
                    <Mail
                      size={11}
                      strokeWidth={2.25}
                      className="shrink-0 text-white/65"
                      aria-hidden
                    />
                    <span className="min-w-0 truncate">
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
                    className="flex items-center gap-1.5 text-left text-xs leading-snug text-white/65 transition-colors hover:text-white"
                    onClick={onEditProfile}
                  >
                    <Mail size={11} strokeWidth={2.25} aria-hidden />
                    Add an email
                  </button>
                )}
              </div>
            </div>
          </div>

          {contactActions}
        </div>
      </div>

      {quiet ? identityQuiet : identityDefault}
    </section>
  )

  if (isTop) {
    return (
      <header className="flex min-w-0 flex-col gap-3" aria-label="Client profile">
        {card}
        {children}
      </header>
    )
  }

  return (
    <aside
      className="flex min-w-0 flex-col lg:sticky lg:top-0 lg:z-[1] lg:max-h-[calc(100dvh-8.5rem)]"
      aria-label="Client profile"
    >
      {/* Padding keeps the card shadow inside the sticky scroller so it isn’t clipped. */}
      <div className="flex min-h-0 flex-col gap-3 lg:overflow-y-auto lg:p-2 lg:-m-2">
        {card}
        {children}
      </div>
    </aside>
  )
}
