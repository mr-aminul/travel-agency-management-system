import { FileText } from 'lucide-react'
import { Badge } from '@/components/shadcn/badge'
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/shadcn/empty'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shadcn/table'
import {
  chromeHeadClass,
  tableShellClass,
} from '@/components/clients/shadcnChrome'
import {
  listClientFileRows,
  type ClientFileRow,
  type IdentityKind,
} from '@/lib/clientDocuments'
import { cn } from '@/lib/utils'
import type { Case } from '@/types/case'
import type { Client } from '@/types/client'

export type ClientFilesWorkspaceProps = {
  client: Client
  cases: Case[]
  onOpenIdentity: (kind: IdentityKind) => void
  onOpenServicePaper: (caseId: string, docId: string) => void
}

function statusVariant(
  row: ClientFileRow,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (row.statusLabel === 'Missing' || row.statusLabel === 'Number Only') {
    return 'destructive'
  }
  if (row.statusLabel === 'Approved' || row.statusLabel === 'On File') {
    return 'default'
  }
  return 'outline'
}

export function ClientFilesWorkspace({
  client,
  cases,
  onOpenIdentity,
  onOpenServicePaper,
}: ClientFilesWorkspaceProps) {
  const rows = listClientFileRows(client, cases)

  const openRow = (row: ClientFileRow) => {
    if (row.kind === 'identity' && row.identityKind) {
      onOpenIdentity(row.identityKind)
      return
    }
    if (row.caseId && row.docId) {
      onOpenServicePaper(row.caseId, row.docId)
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3.5 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-theme-subtle)] text-[var(--color-theme-ink)]"
            aria-hidden
          >
            <FileText size={15} strokeWidth={2.25} />
          </span>
          <h2 className="m-0 text-sm font-semibold">Files</h2>
          <Badge
            variant="secondary"
            className="h-5 min-w-5 justify-center rounded-full px-1.5 tabular-nums"
          >
            {rows.length}
          </Badge>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="px-4 py-10">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FileText />
              </EmptyMedia>
              <EmptyTitle>No Files Yet</EmptyTitle>
            </EmptyHeader>
          </Empty>
        </div>
      ) : (
        <div className={cn(tableShellClass, 'rounded-none border-0 shadow-none')}>
          <Table>
            <TableHeader>
              <TableRow className="border-0 hover:bg-transparent">
                <TableHead className={chromeHeadClass}>Document</TableHead>
                <TableHead className={chromeHeadClass}>Source</TableHead>
                <TableHead className={chromeHeadClass}>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn('cursor-pointer')}
                  onClick={() => openRow(row)}
                >
                  <TableCell className="px-[0.85rem] py-2.5 font-medium">
                    {row.name}
                  </TableCell>
                  <TableCell className="px-[0.85rem] py-2.5 text-sm text-muted-foreground">
                    {row.source}
                  </TableCell>
                  <TableCell className="px-[0.85rem] py-2.5">
                    <Badge variant={statusVariant(row)}>{row.statusLabel}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
