import { useState, type FormEvent } from 'react'
import { ListTodo, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/shadcn/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/shadcn/card'
import { Checkbox } from '@/components/shadcn/checkbox'
import { Input } from '@/components/shadcn/input'
import { cn } from '@/lib/utils'
import {
  addClientActionItem,
  removeClientActionItem,
  setClientActionItemDone,
  useClientActionItems,
  validateClientActionItemText,
} from '@/lib/clientActionItemsStore'

export function ClientActionItems({ clientId }: { clientId: string }) {
  const items = useClientActionItems(clientId)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | undefined>()
  const openCount = items.filter((item) => !item.done).length

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
      setError(err instanceof Error ? err.message : 'Could not add action item.')
    }
  }

  return (
    <Card size="sm" className="shadow-sm" aria-label="Action items">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-theme-subtle)] text-[var(--color-theme-ink)]"
            aria-hidden
          >
            <ListTodo size={15} strokeWidth={2.25} />
          </span>
          Action Items
        </CardTitle>
        {openCount > 0 ? (
          <CardAction>
            <span className="text-xs text-muted-foreground">{openCount} open</span>
          </CardAction>
        ) : null}
        {items.length === 0 ? (
          <CardDescription>
            Track follow-ups for this client: passport copies, calls, payments.
          </CardDescription>
        ) : null}
      </CardHeader>

      {items.length > 0 ? (
        <CardContent>
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {items.map((item) => (
              <li
                key={item.id}
                className={cn(
                  'group flex min-w-0 items-start gap-2 rounded-md px-1 py-1 hover:bg-muted/60',
                  item.done && 'text-muted-foreground',
                )}
              >
                <Checkbox
                  checked={item.done}
                  onCheckedChange={(checked) =>
                    setClientActionItemDone(item.id, checked === true)
                  }
                  aria-label={item.text}
                />
                <span className={cn('min-w-0 flex-1 break-words', item.done && 'line-through')}>
                  {item.text}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0 opacity-55 group-hover:opacity-100 focus-visible:opacity-100"
                  aria-label={`Remove ${item.text}`}
                  title="Remove"
                  onClick={() => removeClientActionItem(item.id)}
                >
                  <Trash2 size={14} strokeWidth={2.25} aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      ) : null}

      <CardFooter className="flex-col items-stretch gap-2 border-t-0 bg-transparent">
        <form className="flex w-full flex-wrap items-center gap-2" onSubmit={handleAdd}>
          <Input
            className="min-w-[12rem] flex-1"
            aria-label="New action item"
            placeholder="Add an action item…"
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value)
              if (error) setError(undefined)
            }}
          />
          <Button
            type="submit"
            variant="outline"
            className="h-8"
            disabled={!draft.trim()}
          >
            <Plus data-icon="inline-start" />
            Add
          </Button>
        </form>
        {error ? (
          <p className="m-0 text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </CardFooter>
    </Card>
  )
}
