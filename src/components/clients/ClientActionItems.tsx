import { useState, type FormEvent } from 'react'
import { ListTodo, Plus, Trash2 } from 'lucide-react'
import { Button, Checkbox, Input } from '@/components/ui'
import {
  addClientActionItem,
  removeClientActionItem,
  setClientActionItemDone,
  useClientActionItems,
  validateClientActionItemText,
} from '@/lib/clientActionItemsStore'
import '@/styles/layout-clients.css'

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
    <section
      className="pd-client-detail__section pd-client-detail__section--compact pd-client-action-items"
      aria-label="Action items"
    >
      <div className="pd-client-detail__section-head">
        <h2 className="pd-client-detail__section-title">
          <span className="pd-client-detail__section-icon" aria-hidden>
            <ListTodo size={15} strokeWidth={2.25} />
          </span>
          Action items
        </h2>
        {openCount > 0 ? (
          <span className="pd-client-action-items__meta">
            {openCount} open
          </span>
        ) : null}
      </div>

      {items.length === 0 ? (
        <p className="pd-client-action-items__empty">
          Track follow-ups for this client: passport copies, calls, payments.
        </p>
      ) : (
        <ul className="pd-client-action-items__list">
          {items.map((item) => (
            <li
              key={item.id}
              className={[
                'pd-client-action-items__row',
                item.done ? 'is-done' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <Checkbox
                className="pd-client-action-items__check"
                label={item.text}
                checked={item.done}
                onChange={(event) =>
                  setClientActionItemDone(item.id, event.target.checked)
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="pd-client-action-items__remove"
                aria-label={`Remove ${item.text}`}
                title="Remove"
                onClick={() => removeClientActionItem(item.id)}
              >
                <Trash2 size={14} strokeWidth={2.25} aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form className="pd-client-action-items__composer" onSubmit={handleAdd}>
        <Input
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
          variant="secondary"
          size="sm"
          disabled={!draft.trim()}
        >
          <Plus size={14} strokeWidth={2.25} aria-hidden />
          Add
        </Button>
      </form>
      {error ? (
        <p className="pd-client-action-items__error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  )
}
