import { useState, type FormEvent, type KeyboardEvent } from 'react'
import { MoreHorizontal, StickyNote, Trash2 } from 'lucide-react'
import { Button } from '@/components/shadcn/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/shadcn/dropdown-menu'
import { Input } from '@/components/shadcn/input'
import {
  addClientActionItem,
  removeClientActionItem,
  useClientActionItems,
  validateClientActionItemText,
} from '@/lib/clientActionItemsStore'
import { formatRelativeTime } from '@/lib/formatDate'
import type { ClientActionItem } from '@/types/clientActionItem'

function NoteRow({ item }: { item: ClientActionItem }) {
  const name = item.createdByName?.trim() || 'Staff'

  return (
    <li className="group relative">
      <div className="rounded-xl border border-border bg-card px-2.5 pb-2 pt-2">
        <div className="flex items-start gap-2">
          <p className="m-0 min-w-0 flex-1 whitespace-pre-wrap break-words text-xs leading-snug text-foreground">
            {item.text}
          </p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                aria-label={`Note actions for ${name}`}
              >
                <MoreHorizontal size={13} strokeWidth={2.25} aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-36">
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => removeClientActionItem(item.id)}
              >
                <Trash2 size={14} strokeWidth={2.25} aria-hidden />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-2 flex items-center justify-end gap-1.5">
          <span className="truncate text-[0.6875rem] text-muted-foreground">
            {formatRelativeTime(item.createdAt)}
          </span>
          <span className="truncate text-[0.6875rem] font-medium text-foreground">
            {name}
          </span>
        </div>
      </div>
    </li>
  )
}

export function ClientActionItems({ clientId }: { clientId: string }) {
  const items = useClientActionItems(clientId)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | undefined>()
  const notes = [...items].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  )

  const handleAdd = (event: FormEvent) => {
    event.preventDefault()
    const validationError = validateClientActionItemText(draft)
    if (validationError) {
      setError(validationError)
      return
    }
    try {
      addClientActionItem({ clientId, text: draft })
      setDraft('')
      setError(undefined)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add note.')
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      event.currentTarget.form?.requestSubmit()
    }
  }

  return (
    <section
      className="flex h-full min-h-[16rem] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm"
      aria-label="Notes"
    >
      <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <span
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-theme-subtle)] text-[var(--color-theme-ink)]"
          aria-hidden
        >
          <StickyNote size={15} strokeWidth={2.25} />
        </span>
        <h2 className="m-0 text-sm font-semibold">Notes</h2>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {notes.length > 0 ? (
          <ul className="m-0 flex list-none flex-col gap-2 overflow-y-auto p-3">
            {notes.map((item) => (
              <NoteRow key={item.id} item={item} />
            ))}
          </ul>
        ) : (
          <div className="flex flex-1 items-center justify-center px-4 py-6">
            <p className="m-0 text-sm text-muted-foreground">No notes yet</p>
          </div>
        )}
      </div>

      <form
        className="flex flex-col gap-1.5 border-t border-border px-3 py-2.5"
        onSubmit={handleAdd}
      >
        <div className="flex items-center gap-2">
          <Input
            className="h-8 min-w-0 flex-1 text-xs"
            aria-label="New note"
            placeholder="Add a note…"
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value)
              if (error) setError(undefined)
            }}
            onKeyDown={handleKeyDown}
          />
          <Button
            type="submit"
            className="h-8 shrink-0 rounded-lg px-3 text-xs"
            disabled={!draft.trim()}
          >
            Save
          </Button>
        </div>
        {error ? (
          <p className="m-0 text-xs text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </section>
  )
}
