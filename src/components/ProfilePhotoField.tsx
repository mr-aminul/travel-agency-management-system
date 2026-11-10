import {
  useId,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
  type ReactNode,
} from 'react'
import {
  Building2,
  Camera,
  Crown,
  Handshake,
  IdCard,
  UserRound,
  type LucideIcon,
} from 'lucide-react'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/shadcn/avatar'
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
import { cn } from '@/lib/utils'

export type AvatarKind =
  | 'business'
  | 'owner'
  | 'staff'
  | 'client'
  | 'subAgent'

const AVATAR_KIND_ICON: Record<AvatarKind, LucideIcon> = {
  business: Building2,
  owner: Crown,
  staff: IdCard,
  client: UserRound,
  subAgent: Handshake,
}

export const PROFILE_PHOTO_MAX_BYTES = 10 * 1024 * 1024
export const PROFILE_PHOTO_ACCEPT = 'image/png,image/jpeg,image/webp'
const PROFILE_PHOTO_HINT = 'JPG, PNG or WebP · max 10 MB'

const previewImageClass =
  'block size-[min(14rem,64vw)] rounded-full object-cover bg-[var(--color-bg-muted,var(--color-bg))] shadow-[inset_0_0_0_0.0625rem_var(--color-border)]'

const cameraOverlayClass = cn(
  'absolute inset-0 z-[2] inline-flex items-center justify-center rounded-full',
  'bg-black/55 text-white opacity-0 transition-opacity',
  'group-hover:opacity-100 focus-visible:opacity-100',
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1',
  'focus-visible:outline-[color-mix(in_srgb,var(--color-theme)_55%,transparent)]',
)

type PickerMode = 'view' | 'edit'

type ProfilePhotoFieldProps = {
  name?: string
  fallbackName?: string
  kind?: AvatarKind
  value?: string
  onChange: (photoUrl: string | undefined) => void
  encodeFile?: (file: File) => Promise<string>
  children?: ReactNode
}

function readImageAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () =>
      reject(reader.error ?? new Error('Unable to read image'))
    reader.readAsDataURL(file)
  })
}

export function validateProfilePhotoFile(file: File): string | undefined {
  if (!file.type.startsWith('image/')) {
    return 'Please choose a JPG, PNG, or WebP image.'
  }
  if (file.size > PROFILE_PHOTO_MAX_BYTES) {
    return 'Please choose an image under 10 MB.'
  }
  return undefined
}

export function normalizeProfilePhotoUrl(raw: string): string | undefined {
  const trimmed = raw.trim()
  if (!trimmed) return undefined
  if (trimmed.startsWith('data:image/')) return trimmed
  try {
    const url = new URL(trimmed)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return undefined
    }
    return trimmed
  } catch {
    return undefined
  }
}

function resetEditDraft(value?: string) {
  return {
    photoUrlDraft: value?.startsWith('http') ? value : '',
    fileDraft: undefined as string | undefined,
    error: undefined as string | undefined,
    busy: false,
  }
}

export function ProfilePhotoField({
  name,
  fallbackName = 'Sub Agent',
  kind = 'client',
  value,
  onChange,
  encodeFile,
  children,
}: ProfilePhotoFieldProps) {
  const formId = useId()
  const urlFieldId = useId()
  const fileInputId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragDepth = useRef(0)
  const displayName = name || fallbackName
  const KindIcon = AVATAR_KIND_ICON[kind]
  const [pickerOpen, setPickerOpen] = useState(false)
  const [mode, setMode] = useState<PickerMode>('edit')
  const [photoUrlDraft, setPhotoUrlDraft] = useState('')
  const [fileDraft, setFileDraft] = useState<string | undefined>()
  const [error, setError] = useState<string | undefined>()
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)

  const shownPhoto = fileDraft || value
  const canSave = Boolean(fileDraft || photoUrlDraft.trim())
  const openLabel = value ? 'View photo' : 'Upload photo'
  const modalTitle =
    mode === 'view' ? 'Profile photo' : value ? 'Update photo' : 'Upload photo'

  const applyDraft = (draft: ReturnType<typeof resetEditDraft>) => {
    setPhotoUrlDraft(draft.photoUrlDraft)
    setFileDraft(draft.fileDraft)
    setError(draft.error)
    setBusy(draft.busy)
    setDragging(false)
  }

  const closePicker = () => {
    setPickerOpen(false)
    setMode('edit')
    applyDraft(resetEditDraft())
  }

  const openPicker = () => {
    setMode(value ? 'view' : 'edit')
    applyDraft(resetEditDraft(value))
    setPickerOpen(true)
  }

  const startEdit = () => {
    applyDraft(resetEditDraft(value))
    setMode('edit')
  }

  const cancelEdit = () => {
    if (value) {
      applyDraft(resetEditDraft(value))
      setMode('view')
      return
    }
    closePicker()
  }

  const handleFile = async (file: File) => {
    const fileError = validateProfilePhotoFile(file)
    if (fileError) {
      setError(fileError)
      return
    }
    setBusy(true)
    setError(undefined)
    try {
      setFileDraft(await (encodeFile ?? readImageAsDataUrl)(file))
      setPhotoUrlDraft('')
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Unable to read that image. Try another file.',
      )
    } finally {
      setBusy(false)
    }
  }

  const takeFile = (file?: File) => {
    if (!file) return
    void handleFile(file)
  }

  const handleSave = (event: FormEvent) => {
    event.preventDefault()
    event.stopPropagation()
    if (fileDraft) {
      onChange(fileDraft)
      closePicker()
      return
    }
    const trimmed = photoUrlDraft.trim()
    if (!trimmed) {
      setError('Choose a photo or enter a photo URL.')
      return
    }
    const normalized = normalizeProfilePhotoUrl(trimmed)
    if (!normalized) {
      setError('Enter a valid http(s) image URL.')
      return
    }
    onChange(normalized)
    closePicker()
  }

  const handleRemove = () => {
    onChange(undefined)
    closePicker()
  }

  const onDragEnter = (event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    event.stopPropagation()
    dragDepth.current += 1
    setDragging(true)
  }

  const onDragOver = (event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = 'copy'
  }

  const onDragLeave = (event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    event.stopPropagation()
    dragDepth.current -= 1
    if (dragDepth.current <= 0) {
      dragDepth.current = 0
      setDragging(false)
    }
  }

  const onDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    event.stopPropagation()
    dragDepth.current = 0
    setDragging(false)
    takeFile(event.dataTransfer.files?.[0])
  }

  return (
    <div
      className={cn(
        children
          ? 'grid w-full grid-cols-[4rem_minmax(0,1fr)] items-center gap-x-4 pt-2.5'
          : 'flex w-auto justify-center',
      )}
    >
      <div className="group relative size-16 shrink-0">
        <Avatar
          className={cn(
            'size-16 overflow-hidden after:hidden',
            'bg-[color-mix(in_srgb,var(--color-theme)_14%,var(--color-bg-muted,var(--color-bg)))]',
            'text-[var(--color-theme)]',
          )}
        >
          {value ? <AvatarImage src={value} alt="" /> : null}
          <AvatarFallback
            className={cn(
              'bg-[color-mix(in_srgb,var(--color-theme)_14%,var(--color-bg-muted,var(--color-bg)))]',
              'text-[var(--color-theme)]',
            )}
          >
            <KindIcon className="size-7" strokeWidth={1.75} aria-hidden />
          </AvatarFallback>
        </Avatar>
        <button
          type="button"
          className={cameraOverlayClass}
          aria-label={openLabel}
          onClick={openPicker}
        >
          <Camera size={18} strokeWidth={2} className="text-white" aria-hidden />
        </button>
      </div>
      {children ? (
        <div className="min-w-0 w-full [&>*]:max-w-full [&>*]:w-full">
          {children}
        </div>
      ) : null}

      <Dialog
        open={pickerOpen}
        onOpenChange={(open) => {
          if (!open) closePicker()
        }}
      >
        <DialogContent
          className={cn(
            'w-[min(22rem,calc(100vw-2rem))] max-w-[min(22rem,calc(100vw-2rem))] gap-0 p-5',
            'border border-[var(--color-border)] bg-[var(--color-surface-raised,var(--color-surface))]',
            'shadow-[var(--shadow-deep)] ring-0',
          )}
        >
          <DialogHeader className="text-center">
            <DialogTitle>{modalTitle}</DialogTitle>
          </DialogHeader>
          {mode === 'view' && shownPhoto ? (
            <div className="mt-4 grid justify-items-center gap-3">
              <img
                className={previewImageClass}
                src={shownPhoto}
                alt={`${displayName} profile photo`}
              />
              <p className="m-0 text-center text-sm font-semibold text-[var(--color-text)]">
                {displayName}
              </p>
            </div>
          ) : (
            <form
              id={formId}
              className="mt-4 grid gap-4"
              onSubmit={handleSave}
            >
              <div
                className={cn(
                  'grid justify-items-center gap-3 rounded-xl py-1 transition-colors duration-150',
                  dragging &&
                    'bg-[color-mix(in_srgb,var(--color-theme)_7%,transparent)]',
                )}
                onDragEnter={onDragEnter}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
              >
                {shownPhoto ? (
                  <img className={previewImageClass} src={shownPhoto} alt="" />
                ) : (
                  <span
                    className={cn(
                      previewImageClass,
                      'inline-flex items-center justify-center text-[var(--color-text-muted)]',
                    )}
                    aria-hidden
                  >
                    <Camera size={28} strokeWidth={1.75} />
                  </span>
                )}
                <p className="m-0 text-center text-xs font-medium text-[var(--color-text-muted)]">
                  {PROFILE_PHOTO_HINT}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose photo
                </Button>
                <input
                  ref={fileInputRef}
                  id={fileInputId}
                  className="sr-only"
                  type="file"
                  accept={PROFILE_PHOTO_ACCEPT}
                  onChange={(event) => {
                    takeFile(event.target.files?.[0])
                    event.target.value = ''
                  }}
                />
              </div>
              {error ? (
                <p
                  className="-mt-1 m-0 text-center text-[0.8125rem] text-[var(--color-danger,#b42318)]"
                  role="alert"
                >
                  {error}
                </p>
              ) : null}
              <div
                className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 text-center text-xs font-medium text-[var(--color-text-muted)]"
                role="separator"
              >
                <span
                  className="h-px bg-[var(--color-border)]"
                  aria-hidden
                />
                <span className="whitespace-nowrap">or use a photo URL</span>
                <span
                  className="h-px bg-[var(--color-border)]"
                  aria-hidden
                />
              </div>
              <Field className="w-full min-w-0">
                <FieldLabel htmlFor={urlFieldId}>Photo URL</FieldLabel>
                <Input
                  id={urlFieldId}
                  type="url"
                  inputMode="url"
                  placeholder="https://…"
                  value={photoUrlDraft}
                  disabled={busy}
                  onChange={(event) => {
                    setPhotoUrlDraft(event.target.value)
                    setFileDraft(undefined)
                    if (error) setError(undefined)
                  }}
                />
              </Field>
            </form>
          )}
          <DialogFooter className="mt-4 justify-end border-0 bg-transparent">
            {mode === 'view' ? (
              <>
                <Button
                  type="button"
                  variant="destructive"
                  className="sm:mr-auto"
                  onClick={handleRemove}
                >
                  Remove
                </Button>
                <Button type="button" variant="outline" onClick={closePicker}>
                  Close
                </Button>
                <Button type="button" onClick={startEdit}>
                  Update
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={cancelEdit}>
                  Cancel
                </Button>
                <Button type="submit" form={formId} disabled={busy || !canSave}>
                  Save
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
