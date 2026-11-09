import { useId, useRef, useState, type DragEvent } from 'react'
import { CloudUpload } from 'lucide-react'
import { Button } from '@/components/shadcn/button'
import { cn } from '@/lib/utils'

export const DOCUMENT_FILE_ACCEPT =
  'image/jpeg,image/png,image/webp,image/*,.pdf,application/pdf,.doc,.docx,.xls,.xlsx'

export function FileDropzone({
  fileName,
  accept = DOCUMENT_FILE_ACCEPT,
  hint,
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
      className={cn(
        'flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-6 text-center',
        dragging && 'border-primary bg-primary/5',
      )}
      aria-label={label}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <span className="text-muted-foreground" aria-hidden>
        <CloudUpload size={22} strokeWidth={1.75} />
      </span>
      <p className="m-0 text-sm font-medium">
        {fileName
          ? 'Replace file or drag & drop a new one.'
          : 'Choose a file or drag & drop it here.'}
      </p>
      {fileName || hint ? (
        <p className="m-0 text-xs text-muted-foreground">
          {fileName && hint ? `${fileName} · ${hint}` : fileName || hint}
        </p>
      ) : null}
      <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg" onClick={openPicker}>
        Browse File
      </Button>
      <input
        ref={inputRef}
        id={inputId}
        className="sr-only"
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
