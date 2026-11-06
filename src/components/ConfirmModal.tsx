import { ConfirmDialog } from '@/components/ui'

interface SignOutConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
}

export function SignOutConfirmModal({
  open,
  onClose,
  onConfirm,
}: SignOutConfirmModalProps) {
  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Sign out?"
      confirmLabel="Sign out"
      confirmVariant="danger"
    />
  )
}
