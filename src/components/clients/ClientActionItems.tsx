import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import {
  MoreHorizontal,
  Pencil,
  Plus,
  StickyNote,
  Trash2,
  UserRound,
} from 'lucide-react'
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
  updateClientActionItemText,
  useClientActionItems,
  validateClientActionItemText,
} from '@/lib/clientActionItemsStore'
import { formatRelativeTime } from '@/lib/formatDate'
import { cn } from '@/lib/utils'
import type { ClientActionItem } from '@/types/clientActionItem'

const composerActionClass =
  'h-9 gap-1.5 rounded-lg border-input bg-[var(--color-surface)] px-3 text-sm text-foreground shadow-xs hover:border-primary hover:bg-primary hover:text-primary-foreground dark:bg-[var(--color-surface)] dark:hover:bg-primary dark:hover:text-primary-foreground'

function NoteRow({ item }: { item: ClientActionItem }) {
  const name = item.createdByName?.trim() || 'Staff'
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(item.text)
  const [error, setError] = useState<string | undefined>()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editing) setDraft(item.text)
  }, [editing, item.text])

  useEffect(() => {
    if (!editing) return
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [editing])

  const cancelEdit = () => {
    setEditing(false)
    setDraft(item.text)
    setError(undefined)
  }

  const saveEdit = () => {
    const validationError = validateClientActionItemText(draft)
    if (validationError) {
      setError(validationError)
      return
    }
    if (draft.trim() === item.text) {
      cancelEdit()
      return
    }
    try {
      updateClientActionItemText(item.id, draft)
      setEditing(false)
      setError(undefined)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update note.')
    }
  }

  return (
    <li className="group m-0 p-0">
      <div className="flex items-start gap-2.5 px-3.5 py-2.5 transition-colors hover:bg-muted/40">
        <span
          className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-theme-subtle)] text-[var(--color-theme-ink)]"
          aria-hidden
        >
          <UserRound size={15} strokeWidth={2.25} />
        </span>
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="flex flex-col gap-1.5">
              <Input
                ref={inputRef}
                className={cn(
                  'h-9 rounded-lg border-input bg-[var(--color-surface)] text-sm shadow-xs',
                  error && 'border-destructive',
                )}
                aria-label="Edit note"
                value={draft}
                onChange={(event) => {
                  setDraft(event.target.value)
                  if (error) setError(undefined)
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    saveEdit()
                  }
                  if (event.key === 'Escape') {
                    event.preventDefault()
                    cancelEdit()
                  }
                }}
              />
              {error ? (
                <p className="m-0 text-xs text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={composerActionClass}
                  onClick={saveEdit}
                  disabled={!draft.trim()}
                >
                  Save
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 px-3 text-sm"
                  onClick={cancelEdit}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="m-0 whitespace-pre-wrap break-words text-sm leading-snug text-foreground">
                {item.text}
              </p>
              <p className="mt-1 m-0 flex min-w-0 flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                <span className="truncate font-medium text-foreground/80">
                  {name}
                </span>
                <span aria-hidden>·</span>
                <span className="shrink-0 tabular-nums">
                  {formatRelativeTime(item.createdAt)}
                </span>
              </p>
            </>
          )}
        </div>
        {editing ? null : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-7 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
                aria-label={`Note actions for ${name}`}
              >
                <MoreHorizontal size={14} strokeWidth={2.25} aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-auto min-w-0">
              <DropdownMenuItem onSelect={() => setEditing(true)}>
                <Pencil size={14} strokeWidth={2.25} aria-hidden />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => removeClientActionItem(item.id)}
              >
                <Trash2 size={14} strokeWidth={2.25} aria-hidden />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
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
      className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm"
      aria-label="Notes"
    >
      <div className="flex items-center gap-2 border-b border-border px-3.5 py-2.5">
        <span
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-theme-subtle)] text-[var(--color-theme-ink)]"
          aria-hidden
        >
          <StickyNote size={15} strokeWidth={2.25} />
        </span>
        <h2 className="m-0 text-sm font-semibold">Notes</h2>
        {notes.length > 0 ? (
          <span className="ml-auto text-xs tabular-nums text-muted-foreground">
            {notes.length}
          </span>
        ) : null}
      </div>

      {notes.length > 0 ? (
        <ul className="m-0 max-h-[22rem] list-none divide-y divide-border overflow-y-auto p-0">
          {notes.map((item) => (
            <NoteRow key={item.id} item={item} />
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-2.5 px-3.5 py-8 text-center">
          <span
            className="inline-flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground"
            aria-hidden
          >
            <StickyNote size={16} strokeWidth={2} />
          </span>
          <p className="m-0 text-sm text-muted-foreground">No Notes Yet</p>
        </div>
      )}

      <form
        className="flex flex-col gap-1.5 border-t border-border px-3.5 py-2.5"
        onSubmit={handleAdd}
      >
        <div className="flex items-center gap-2">
          <Input
            className={cn(
              'h-9 min-w-0 flex-1 rounded-lg border-input bg-[var(--color-surface)] text-sm shadow-xs',
              error && 'border-destructive',
            )}
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
            variant="outline"
            size="sm"
            className={composerActionClass}
            disabled={!draft.trim()}
            aria-label="Add Note"
          >
            <Plus data-icon="inline-start" aria-hidden />
            Add
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
