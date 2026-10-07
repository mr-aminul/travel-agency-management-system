import { Archive, MoreHorizontal, RotateCcw, Trash2 } from 'lucide-react'
import type { Client } from '@/types/client'
import { DropdownMenu } from '@/components/ui'

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
    <DropdownMenu
      label={`Actions for ${client.name}`}
      align="end"
      variant="icon"
      className={className}
      trigger={
        <MoreHorizontal size={16} strokeWidth={2} aria-hidden />
      }
      triggerProps={{
        'aria-label': `Actions for ${client.name}`,
        onClick: (event) => event.stopPropagation(),
        onPointerDown: (event) => event.stopPropagation(),
      }}
      items={[
        isArchived
          ? {
              id: 'unarchive',
              label: 'Unarchive client',
              icon: <RotateCcw size={14} strokeWidth={2} aria-hidden />,
              onSelect: () => onUnarchive(client),
            }
          : {
              id: 'archive',
              label: 'Archive client',
              icon: <Archive size={14} strokeWidth={2} aria-hidden />,
              onSelect: () => onArchive(client),
            },
        {
          id: 'delete',
          label: 'Delete client',
          danger: true,
          icon: <Trash2 size={14} strokeWidth={2} aria-hidden />,
          onSelect: () => onDelete(client),
        },
      ]}
    />
  )
}
