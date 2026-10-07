import { useEffect, useMemo, useState } from 'react'
import { ArchiveRestore, Trash2 } from 'lucide-react'
import { Avatar, Button, ConfirmDialog, EmptyState, PageHeader, SearchField, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TypeConfirmDialog } from '@/components/ui'
import {
  CLIENT_TRASH_RETENTION_DAYS,
  emptyClientTrash,
  formatBalance,
  permanentlyDeleteFromTrash,
  purgeExpiredClientTrash,
  restoreClientFromTrash,
  trashDaysRemaining,
  useTrashedClients,
} from '@/lib/clientsStore'
import { formatDisplayDateTime } from '@/lib/formatDate'
import type { TrashedClient } from '@/types/client'
import '@/styles/layout-clients.css'

function formatMobile(phone: string): string {
  return phone.replace(/\D/g, '')
}

export default function TrashPage() {
  const trashed = useTrashedClients()
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
    <div className="pd-page pd-clients pd-trash" aria-label="Trash">
      <PageHeader
        title="Trash"
        description={`Deleted clients stay here for ${CLIENT_TRASH_RETENTION_DAYS} days, then are removed permanently.`}
        actions={
          trashed.length > 0 ? (
            <Button variant="danger" size="sm" onClick={() => setEmptyOpen(true)}>
              <Trash2 size={14} strokeWidth={2} aria-hidden />
              Empty trash
            </Button>
          ) : null
        }
      />

      {trashed.length > 0 ? (
        <div className="pd-clients__toolbar">
          <SearchField
            className="pd-clients__search"
            placeholder="Search trash…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onClear={() => setSearch('')}
          />
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState
          icon={Trash2}
          title={trashed.length === 0 ? 'Trash is empty' : 'No matches'}
          description={
            trashed.length === 0
              ? 'Deleted clients will appear here for 30 days.'
              : 'Try a different name or phone number.'
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>Deleted</TableHead>
              <TableHead>Days left</TableHead>
              <TableHead>Balance due</TableHead>
              <TableHead className="pd-clients__actions-head">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((entry) => {
              const daysLeft = trashDaysRemaining(entry.deletedAt)
              return (
                <TableRow key={entry.client.id}>
                  <TableCell>
                    <div className="pd-clients__identity">
                      <Avatar
                        name={entry.client.name}
                        src={entry.client.avatarUrl}
                        size="sm"
                      />
                      <p className="pd-clients__name">{entry.client.name}</p>
                    </div>
                  </TableCell>
                  <TableCell>{formatMobile(entry.client.phone)}</TableCell>
                  <TableCell>{formatDisplayDateTime(entry.deletedAt)}</TableCell>
                  <TableCell>
                    {daysLeft === 1 ? '1 day' : `${daysLeft} days`}
                  </TableCell>
                  <TableCell className="pd-clients__balance">
                    {formatBalance(entry.client.balance)}
                  </TableCell>
                  <TableCell className="pd-clients__actions-cell">
                    <div className="pd-clients__row-actions">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setRestoreError(null)
                          setRestoreTarget(entry)
                        }}
                      >
                        <ArchiveRestore size={14} strokeWidth={2} aria-hidden />
                        Restore
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setDeleteTarget(entry)}
                      >
                        Delete forever
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}

      <ConfirmDialog
        open={restoreTarget != null}
        onClose={() => {
          setRestoreTarget(null)
          setRestoreError(null)
        }}
        onConfirm={handleRestore}
        title="Restore client?"
        description={
          restoreError
            ? restoreError
            : restoreTarget
              ? `${restoreTarget.client.name} will return to your active clients list.`
              : undefined
        }
        confirmLabel="Restore"
        confirmVariant="primary"
      />

      <TypeConfirmDialog
        open={deleteTarget != null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handlePermanentDelete}
        title="Delete forever?"
        description={
          deleteTarget
            ? `This permanently removes ${deleteTarget.client.name}. Type the client name to confirm.`
            : undefined
        }
        confirmPhrase={deleteTarget?.client.name ?? ''}
        phraseLabel="Client name"
        confirmLabel="Delete forever"
      />

      <TypeConfirmDialog
        open={emptyOpen}
        onClose={() => setEmptyOpen(false)}
        onConfirm={handleEmptyTrash}
        title="Empty trash?"
        description={`Permanently delete all ${trashed.length} client${trashed.length === 1 ? '' : 's'} in trash. Type EMPTY TRASH to confirm.`}
        confirmPhrase="EMPTY TRASH"
        phraseLabel="Confirmation"
        confirmLabel="Empty trash"
      />
    </div>
  )
}
