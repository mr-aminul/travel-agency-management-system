import { useId, useRef, useState, type DragEvent } from 'react'
import { CloudUpload } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cx } from '@/lib/cx'

export const DOCUMENT_FILE_ACCEPT =
  'image/jpeg,image/png,image/webp,image/*,.pdf,application/pdf,.doc,.docx,.xls,.xlsx'

const DOCUMENT_FILE_HINT = 'JPEG, PNG, PDF, and Word files'

export function FileDropzone({
  fileName,
  accept = DOCUMENT_FILE_ACCEPT,
  hint = DOCUMENT_FILE_HINT,
  label = 'Upload file',
  onFile,
}: {
  fileName?: string
  accept?: string
  hint?: string
  label?: string
  onFile: (file: File) => void
}) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const dragDepth = useRef(0)
  const [dragging, setDragging] = useState(false)

  const takeFile = (file?: File) => {
    if (!file) return
    onFile(file)
  }

  const openPicker = () => {
    inputRef.current?.click()
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
    <section
      className={cx('pd-file-drop', dragging && 'is-dragging')}
      aria-label={label}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <span className="pd-file-drop__icon" aria-hidden>
        <CloudUpload size={22} strokeWidth={1.75} />
      </span>
      <p className="pd-file-drop__title">
        {fileName
          ? 'Replace file or drag & drop a new one.'
          : 'Choose a file or drag & drop it here.'}
      </p>
      <p className="pd-file-drop__hint">
        {fileName ? `${fileName} · ${hint}` : hint}
      </p>
      <Button type="button" variant="secondary" size="sm" onClick={openPicker}>
        Browse File
      </Button>
      <input
        ref={inputRef}
        id={inputId}
        className="pd-file-drop__input"
        type="file"
        accept={accept}
        onChange={(event) => {
          takeFile(event.target.files?.[0])
          event.target.value = ''
        }}
      />
    </section>
  )
}
