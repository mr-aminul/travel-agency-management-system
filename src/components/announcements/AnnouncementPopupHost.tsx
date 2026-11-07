import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import {
  filterAnnouncementsForDisplay,
  markAnnouncementDismissed,
  markAnnouncementShown,
} from '@/lib/announcementDisplay'
import {
  listActiveAnnouncements,
  type AnnouncementSurface,
} from '@/lib/announcementsApi'
import {
  announcementKindIcon,
  announcementKindLabel,
  normalizeAnnouncementKind,
} from '@/lib/announcementTemplates'
import { cx } from '@/lib/cx'
import { Button } from '@/components/shadcn/button'
import { AnnouncementRichBody } from '@/components/announcements/AnnouncementRichBody'
import type { ActiveAnnouncement } from '@/types/announcement'
import '@/styles/layout-announcements.css'

type AnnouncementPopupHostProps = {
  surface: AnnouncementSurface
  /** When false, host stays idle (e.g. signed-in users on landing). */
  enabled?: boolean
}

export function AnnouncementPopupHost({
  surface,
  enabled = true,
}: AnnouncementPopupHostProps) {
  const [queue, setQueue] = useState<ActiveAnnouncement[]>([])
  const [open, setOpen] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const openRef = useRef(open)
  const shownIdsRef = useRef<Set<string>>(new Set())
  openRef.current = open
  const titleId = useId()

  const refresh = useCallback(async () => {
    if (!enabled) {
      setQueue([])
      setOpen(false)
      return
    }
    try {
      const active = await listActiveAnnouncements(surface)
      const eligible = filterAnnouncementsForDisplay(active)
      setQueue(eligible)
      setOpen(eligible.length > 0)
    } catch {
      setQueue([])
      setOpen(false)
    }
  }, [enabled, surface])

  useEffect(() => {
    void refresh()
    if (!enabled) return
    const timer = window.setInterval(() => void refresh(), 60_000)
    const onFocus = () => void refresh()
    window.addEventListener('focus', onFocus)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', onFocus)
    }
  }, [enabled, refresh])

  const current = queue[0] ?? null
  const kind = normalizeAnnouncementKind(current?.kind)
  const KindIcon = announcementKindIcon(kind)

  const remaining = useMemo(
    () => Math.max(0, queue.length - 1),
    [queue.length],
  )

  useEffect(() => {
    if (!open || !current) return
    if (shownIdsRef.current.has(`${current.id}:${current.updatedAt}`)) return
    shownIdsRef.current.add(`${current.id}:${current.updatedAt}`)
    markAnnouncementShown(current)
  }, [open, current])

  const dismissCurrent = useCallback(() => {
    if (!current) {
      setOpen(false)
      return
    }
    markAnnouncementDismissed(current)
    setQueue((prev) => {
      const next = prev.filter((item) => item.id !== current.id)
      setOpen(next.length > 0)
      return next
    })
  }, [current])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    dialog.setAttribute('closedby', 'any')
  }, [])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && current) {
      if (!dialog.open) dialog.showModal()
      dialog.focus()
      return
    }
    if (dialog.open) dialog.close()
  }, [open, current])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    const syncClosed = () => {
      if (openRef.current) dismissCurrent()
    }

    const handleBackdropClick = (event: MouseEvent) => {
      if (event.target !== dialog) return
      const rect = dialog.getBoundingClientRect()
      const inside =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width
      if (!inside) dialog.close()
    }

    dialog.addEventListener('close', syncClosed)
    dialog.addEventListener('click', handleBackdropClick)
    return () => {
      dialog.removeEventListener('close', syncClosed)
      dialog.removeEventListener('click', handleBackdropClick)
    }
  }, [dismissCurrent])

  if (!current || typeof document === 'undefined') return null

  return createPortal(
    <dialog
      ref={dialogRef}
      className={cx('pd-announce-dialog', `pd-announce-dialog--${kind}`)}
      aria-labelledby={titleId}
    >
      <div className="pd-announce-dialog__shell">
        <header className="pd-announce-dialog__hero">
          <div className="pd-announce-dialog__hero-top">
            <span
              className={cx(
                'pd-announce-kind-chip',
                `pd-announce-kind-chip--${kind}`,
              )}
            >
              <KindIcon size={13} strokeWidth={2.2} aria-hidden />
              {announcementKindLabel(kind)}
            </span>
            <button
              type="button"
              className="pd-announce-dialog__close"
              onClick={dismissCurrent}
              aria-label="Dismiss announcement"
            >
              <X size={16} strokeWidth={2.25} aria-hidden />
            </button>
          </div>

          <div className="pd-announce-dialog__hero-main">
            {current.imageUrl ? (
              <img
                className="pd-announce-dialog__cover"
                src={current.imageUrl}
                alt=""
              />
            ) : (
              <div
                className={cx(
                  'pd-announce-dialog__badge',
                  `pd-announce-popup__icon--${kind}`,
                )}
                aria-hidden
              >
                <KindIcon size={30} strokeWidth={1.75} />
              </div>
            )}
            <h2 id={titleId} className="pd-announce-dialog__title">
              {current.title}
            </h2>
          </div>
        </header>

        <div className="pd-announce-dialog__body">
          <AnnouncementRichBody body={current.body} kind={kind} />
        </div>

        <footer className="pd-announce-dialog__footer">
          <Button className="h-9 rounded-lg" onClick={dismissCurrent}>
            {remaining > 0 ? `Got It · ${remaining} More` : 'Got It'}
          </Button>
        </footer>
      </div>
    </dialog>,
    document.body,
  )
}
