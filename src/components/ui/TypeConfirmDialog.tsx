import { useEffect, useId, useRef, useState } from 'react'
import { Button, type ButtonVariant } from './Button'
import { Input } from './Input'
import { Modal } from './Modal'

export type TypeConfirmDialogProps = {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description?: string
  /** Exact phrase the user must type to enable confirm. */
  confirmPhrase: string
  confirmLabel?: string
  cancelLabel?: string
  phraseLabel?: string
  confirmVariant?: Extract<ButtonVariant, 'primary' | 'danger'>
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
  phraseLabel = 'Type to confirm',
  confirmVariant = 'danger',
}: TypeConfirmDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()
  const [typed, setTyped] = useState('')
  const matches = typed.trim() === confirmPhrase.trim()

  useEffect(() => {
    if (!open) setTyped('')
  }, [open])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      initialFocusRef={inputRef}
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button
            variant={confirmVariant}
            disabled={!matches}
            onClick={() => {
              if (!matches) return
              onConfirm()
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <Input
        ref={inputRef}
        id={inputId}
        label={phraseLabel}
        labelVariant="default"
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
    </Modal>
  )
}
