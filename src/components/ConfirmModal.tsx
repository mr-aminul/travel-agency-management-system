import { ConfirmDialog } from '@/components/shadcn/confirm-dialog'

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
      title="Sign Out?"
      confirmLabel="Sign Out"
      confirmVariant="danger"
    />
  )
}
