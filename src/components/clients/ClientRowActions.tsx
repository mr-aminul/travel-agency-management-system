import { Archive, MoreHorizontal, RotateCcw, Trash2 } from 'lucide-react'
import { Button } from '@/components/shadcn/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/shadcn/dropdown-menu'
import type { Client } from '@/types/client'

export type ClientRowActionsProps = {
  client: Client
  onArchive: (client: Client) => void
  onUnarchive: (client: Client) => void
  onDelete: (client: Client) => void
  className?: string
}

export function ClientRowActions({
  client,
  onArchive,
  onUnarchive,
  onDelete,
  className,
}: ClientRowActionsProps) {
  const isArchived = Boolean(client.archivedAt)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={className}
          aria-label={`Actions for ${client.name}`}
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {isArchived ? (
          <DropdownMenuItem onSelect={() => onUnarchive(client)}>
            <RotateCcw />
            Unarchive Client
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={() => onArchive(client)}>
            <Archive />
            Archive Client
          </DropdownMenuItem>
        )}
        <DropdownMenuItem variant="destructive" onSelect={() => onDelete(client)}>
          <Trash2 />
          Delete Client
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
