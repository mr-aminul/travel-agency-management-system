import {
  useId,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
  type ReactNode,
} from 'react'
import { Camera } from 'lucide-react'
import { Avatar, type AvatarKind } from '@/components/ui'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { cx } from '@/lib/cx'

export const PROFILE_PHOTO_MAX_BYTES = 10 * 1024 * 1024
export const PROFILE_PHOTO_ACCEPT = 'image/png,image/jpeg,image/webp'
const PROFILE_PHOTO_HINT = 'JPG, PNG or WebP · max 10 MB'

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
    if (fileDraft) {
      onChange(fileDraft)
      setPhotoUrlDraft('')
      setError(undefined)
      setMode('view')
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
    setFileDraft(normalized)
    setError(undefined)
    setMode('view')
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
    <div className="pd-profile-photo">
      <div className="pd-profile-photo__control">
        <Avatar name={displayName} src={value} size="xl" kind={kind} />
        <button
          type="button"
          className="pd-profile-photo__upload"
          aria-label={openLabel}
          title={value ? 'View or update photo' : PROFILE_PHOTO_HINT}
          onClick={openPicker}
        >
          <Camera size={18} strokeWidth={2} aria-hidden />
        </button>
      </div>
      {children ? (
        <div className="pd-profile-photo__name">{children}</div>
      ) : null}

      <Modal
        open={pickerOpen}
        onClose={closePicker}
        title={modalTitle}
        className="pd-profile-photo-picker"
        actions={
          mode === 'view' ? (
            <>
              <Button
                type="button"
                variant="danger"
                className="pd-profile-photo-picker__remove-action"
                onClick={handleRemove}
              >
                Remove
              </Button>
              <Button type="button" variant="secondary" onClick={closePicker}>
                Close
              </Button>
              <Button type="button" onClick={startEdit}>
                Update
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="secondary" onClick={cancelEdit}>
                Cancel
              </Button>
              <Button
                type="submit"
                form={formId}
                disabled={busy || !canSave}
              >
                Save
              </Button>
            </>
          )
        }
      >
        {mode === 'view' && shownPhoto ? (
          <div className="pd-profile-photo-picker__view">
            <img
              className="pd-profile-photo-picker__preview"
              src={shownPhoto}
              alt={`${displayName} profile photo`}
            />
            <p className="pd-profile-photo-picker__caption">{displayName}</p>
          </div>
        ) : (
          <form
            id={formId}
            className="pd-profile-photo-picker__body"
            onSubmit={handleSave}
          >
            <div
              className={cx(
                'pd-profile-photo-picker__stage',
                dragging && 'is-dragging',
              )}
              onDragEnter={onDragEnter}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
            >
              {shownPhoto ? (
                <img
                  className="pd-profile-photo-picker__preview"
                  src={shownPhoto}
                  alt=""
                />
              ) : (
                <span className="pd-profile-photo-picker__placeholder" aria-hidden>
                  <Camera size={28} strokeWidth={1.75} />
                </span>
              )}
              <p className="pd-profile-photo-picker__hint">{PROFILE_PHOTO_HINT}</p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={() => fileInputRef.current?.click()}
              >
                Choose photo
              </Button>
              <input
                ref={fileInputRef}
                id={fileInputId}
                className="pd-profile-photo-picker__file"
                type="file"
                accept={PROFILE_PHOTO_ACCEPT}
                onChange={(event) => {
                  takeFile(event.target.files?.[0])
                  event.target.value = ''
                }}
              />
            </div>
            {error ? (
              <p className="pd-profile-photo-picker__error" role="alert">
                {error}
              </p>
            ) : null}
            <div className="pd-profile-photo-picker__divider" role="separator">
              <span>or use a photo URL</span>
            </div>
            <Input
              id={urlFieldId}
              label="Photo URL"
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
          </form>
        )}
      </Modal>
    </div>
  )
}
