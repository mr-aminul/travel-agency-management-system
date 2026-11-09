import { useEffect, useMemo, useState } from 'react'
import { ArchiveRestore, Search, Trash2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/shadcn/confirm-dialog'
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/shadcn/empty'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/shadcn/avatar'
import { Button } from '@/components/shadcn/button'
import { Input } from '@/components/shadcn/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shadcn/table'
import { TypeConfirmDialog } from '@/components/shadcn/type-confirm-dialog'
import {
  chromeHeadClass,
  elevatedPageClass,
  whiteControlClass,
} from '@/components/clients/shadcnChrome'
import { cn } from '@/lib/utils'
import { useCases } from '@/lib/casesStore'
import { deriveClientBalance } from '@/lib/clientDerived'
import {
  emptyClientTrash,
  formatBalance,
  permanentlyDeleteFromTrash,
  purgeExpiredClientTrash,
  restoreClientFromTrash,
  trashDaysRemaining,
  useTrashedClients,
} from '@/lib/clientsStore'
import { groupCasesByClientId } from '@/lib/clientServiceStatus'
import { formatDisplayDateTime } from '@/lib/formatDate'
import type { TrashedClient } from '@/types/client'
import '@/styles/layout-clients.css'

function formatMobile(phone: string): string {
  return phone.replace(/\D/g, '')
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export default function TrashPage() {
  const trashed = useTrashedClients()
  const cases = useCases()
  const casesByClientId = useMemo(() => groupCasesByClientId(cases), [cases])
  const [search, setSearch] = useState('')
  const [restoreTarget, setRestoreTarget] = useState<TrashedClient | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TrashedClient | null>(null)
  const [emptyOpen, setEmptyOpen] = useState(false)
  const [restoreError, setRestoreError] = useState<string | null>(null)

  useEffect(() => {
    purgeExpiredClientTrash()
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return trashed
    return trashed.filter(({ client }) => {
      const phoneDigits = formatMobile(client.phone)
      const queryDigits = formatMobile(q)
      return (
        client.name.toLowerCase().includes(q) ||
        client.phone.toLowerCase().includes(q) ||
        client.passport?.toLowerCase().includes(q) ||
        (queryDigits.length > 0 && phoneDigits.includes(queryDigits))
      )
    })
  }, [trashed, search])

  const handleRestore = () => {
    if (!restoreTarget) return
    setRestoreError(null)
    try {
      restoreClientFromTrash(restoreTarget.client.id)
      setRestoreTarget(null)
    } catch (error) {
      setRestoreError(
        error instanceof Error ? error.message : 'Could not restore client.',
      )
    }
  }

  const handlePermanentDelete = () => {
    if (!deleteTarget) return
    permanentlyDeleteFromTrash(deleteTarget.client.id)
    setDeleteTarget(null)
  }

  const handleEmptyTrash = () => {
    emptyClientTrash()
    setEmptyOpen(false)
  }

  return (
    <div
      className={cn(elevatedPageClass, 'pd-page pd-page--elevated pd-clients pd-trash')}
      data-elevated-canvas
      aria-label="Trash"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="m-0 text-xl font-semibold tracking-tight">Trash</h1>
        {trashed.length > 0 ? (
          <Button
            variant="destructive"
            className="h-9 rounded-lg"
            onClick={() => setEmptyOpen(true)}
          >
            <Trash2 size={14} strokeWidth={2} aria-hidden />
            Empty Trash
          </Button>
        ) : null}
      </div>

      {trashed.length > 0 ? (
        <div className="relative min-w-56 max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search Trash…"
            className={cn('pl-8', whiteControlClass)}
          />
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <Empty className="bg-card shadow-sm">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Trash2 aria-hidden />
            </EmptyMedia>
            <EmptyTitle>
              {trashed.length === 0 ? 'Trash Is Empty' : 'No Matches'}
            </EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="overflow-auto rounded-xl border bg-card shadow-md">
          <Table>
            <TableHeader>
              <TableRow className="border-0 hover:bg-transparent">
                <TableHead className={chromeHeadClass}>Name</TableHead>
                <TableHead className={chromeHeadClass}>Mobile</TableHead>
                <TableHead className={chromeHeadClass}>Deleted</TableHead>
                <TableHead className={chromeHeadClass}>Days Left</TableHead>
                <TableHead className={chromeHeadClass}>Balance Due</TableHead>
                <TableHead className={cn(chromeHeadClass, 'pd-clients__actions-head')}>
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((entry) => {
                const daysLeft = trashDaysRemaining(entry.deletedAt)
                return (
                  <TableRow key={entry.client.id}>
                    <TableCell>
                      <div className="pd-clients__identity">
                        <Avatar size="sm">
                          {entry.client.avatarUrl ? (
                            <AvatarImage src={entry.client.avatarUrl} alt="" />
                          ) : null}
                          <AvatarFallback>
                            {initials(entry.client.name) || 'C'}
                          </AvatarFallback>
                        </Avatar>
                        <p className="pd-clients__name">{entry.client.name}</p>
                      </div>
                    </TableCell>
                    <TableCell>{formatMobile(entry.client.phone)}</TableCell>
                    <TableCell>{formatDisplayDateTime(entry.deletedAt)}</TableCell>
                    <TableCell>
                      {daysLeft === 1 ? '1 day' : `${daysLeft} days`}
                    </TableCell>
                    <TableCell className="pd-clients__balance">
                      {formatBalance(
                        deriveClientBalance(
                          casesByClientId.get(entry.client.id) ?? [],
                        ),
                      )}
                    </TableCell>
                    <TableCell className="pd-clients__actions-cell">
                      <div className="pd-clients__row-actions">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-9 rounded-lg"
                          onClick={() => {
                            setRestoreError(null)
                            setRestoreTarget(entry)
                          }}
                        >
                          <ArchiveRestore size={14} strokeWidth={2} aria-hidden />
                          Restore
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-9 rounded-lg"
                          onClick={() => setDeleteTarget(entry)}
                        >
                          Delete Forever
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <ConfirmDialog
        open={restoreTarget != null}
        onClose={() => {
          setRestoreTarget(null)
          setRestoreError(null)
        }}
        onConfirm={handleRestore}
        title={
          restoreTarget
            ? `Restore ${restoreTarget.client.name}?`
            : 'Restore Client?'
        }
        description={restoreError ?? undefined}
        confirmLabel="Restore"
        confirmVariant="primary"
      />

      <TypeConfirmDialog
        open={deleteTarget != null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handlePermanentDelete}
        title={
          deleteTarget
            ? `Permanently Delete ${deleteTarget.client.name}?`
            : 'Delete Forever?'
        }
        confirmPhrase={deleteTarget?.client.name ?? ''}
        phraseLabel="Client Name"
        confirmLabel="Delete Forever"
      />

      <TypeConfirmDialog
        open={emptyOpen}
        onClose={() => setEmptyOpen(false)}
        onConfirm={handleEmptyTrash}
        title={`Permanently Delete ${trashed.length} Client${trashed.length === 1 ? '' : 's'}?`}
        confirmPhrase="EMPTY TRASH"
        phraseLabel="Confirmation"
        confirmLabel="Empty Trash"
      />
    </div>
  )
}
