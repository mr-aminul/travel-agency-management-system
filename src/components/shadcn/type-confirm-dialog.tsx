import { useEffect, useId, useState } from 'react'
import { Button } from '@/components/shadcn/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shadcn/dialog'
import { Field, FieldLabel } from '@/components/shadcn/field'
import { Input } from '@/components/shadcn/input'

export type TypeConfirmDialogProps = {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description?: string
  confirmPhrase: string
  confirmLabel?: string
  cancelLabel?: string
  phraseLabel?: string
  confirmVariant?: 'primary' | 'danger'
}

export function TypeConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmPhrase,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  phraseLabel = 'Type To Confirm',
}: TypeConfirmDialogProps) {
  const inputId = useId()
  const [typed, setTyped] = useState('')
  const matches = typed.trim() === confirmPhrase.trim()

  useEffect(() => {
    if (!open) setTyped('')
  }, [open])

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent className="border border-border bg-card shadow-[var(--shadow-deep)] ring-0">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </DialogHeader>
        <Field>
          <FieldLabel htmlFor={inputId}>{phraseLabel}</FieldLabel>
          <Input
            id={inputId}
            value={typed}
            autoComplete="off"
            spellCheck={false}
            placeholder={confirmPhrase}
            onChange={(event) => setTyped(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && matches) {
                event.preventDefault()
                onConfirm()
              }
            }}
          />
        </Field>
        <DialogFooter className="border-0 bg-transparent">
          <Button type="button" variant="outline" className="h-9 rounded-lg" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="h-9 rounded-lg"
            disabled={!matches}
            onClick={() => {
              if (!matches) return
              onConfirm()
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
