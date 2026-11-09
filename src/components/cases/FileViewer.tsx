import { DOCUMENT_FILE_ACCEPT } from '@/components/shadcn/file-dropzone'
import {
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import {
  Download,
  FileWarning,
  Maximize2,
  RotateCcw,
  Trash2,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { PdfPreview } from '@/components/cases/PdfPreview'
import {
  formatFileSize,
  getStoredFile,
  isImageMime,
  isPdfMime,
  isTextMime,
} from '@/lib/fileStore'
import { usePreviewUrl } from '@/lib/usePreviewUrl'
import { cn } from '@/lib/utils'

export type FileViewerProps = {
  fileId?: string | null
  fileName?: string | null
  mimeType?: string | null
  /** Compact preview inside drawers. */
  compact?: boolean
  /** Hide filename / type / size above the preview. */
  hideMeta?: boolean
  /** When set, an Upload action opens the file picker. */
  onUpload?: (file: File) => void
  /** When set, Delete removes the current attachment. */
  onDelete?: () => void
}

const MIN_ZOOM = 0.5
const MAX_ZOOM = 3
const ZOOM_STEP = 0.25

const viewerActionClass =
  'inline-flex size-8 items-center justify-center rounded-md text-foreground/80 hover:bg-muted hover:text-foreground'

const overlayActionClass =
  'inline-flex size-8 items-center justify-center rounded-full text-foreground/75 transition-colors hover:bg-foreground/8 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'

const viewerStageClass =
  'relative overflow-hidden rounded-xl border border-border/90 bg-[color-mix(in_srgb,var(--muted)_55%,var(--background))] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--foreground)_4%,transparent),inset_0_0_0_1px_color-mix(in_srgb,var(--foreground)_5%,transparent)]'

const fsControlBtnClass =
  'inline-flex min-h-9 min-w-9 items-center justify-center gap-1.5 rounded-md border border-white/20 bg-white/10 px-2.5 text-sm font-bold text-white hover:bg-white/[0.16] disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2694fe]'

function FilePreview({
  url,
  name,
  type,
  textPreview,
  textError,
  zoom,
  compact,
}: {
  url: string
  name: string
  type: string
  textPreview: string | null
  textError: boolean
  zoom: number
  compact?: boolean
}) {
  if (isImageMime(type)) {
    return (
      <div className="grid h-full w-full place-items-center overflow-hidden p-4">
        <img
          className="block max-h-full max-w-full rounded-sm object-contain shadow-[0_8px_24px_-12px_rgba(0,0,0,0.35)] transition-transform duration-150"
          src={url}
          alt={name}
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
        />
      </div>
    )
  }

  if (isPdfMime(type)) {
    return <PdfPreview url={url} name={name} compact={compact} fill />
  }

  if (isTextMime(type)) {
    if (textError) {
      return (
        <p className="m-0 grid min-h-40 place-items-center p-5 text-center text-[0.8125rem] leading-snug text-muted-foreground">
          Couldn’t load a text preview. Use Download instead.
        </p>
      )
    }
    return (
      <pre className="m-0 max-h-80 overflow-auto whitespace-pre-wrap break-words p-3.5 font-mono text-xs leading-normal text-foreground">
        {textPreview ?? 'Loading preview…'}
      </pre>
    )
  }

  return (
    <div className="m-0 grid min-h-40 place-items-center gap-3 p-5 text-center text-[0.8125rem] leading-snug text-muted-foreground">
      <p className="m-0">
        Inline preview isn’t available for this file type. Use Full screen or
        Download instead.
      </p>
    </div>
  )
}

function FullscreenViewer({
  url,
  name,
  type,
  sizeLabel,
  textPreview,
  textError,
  onClose,
}: {
  url: string
  name: string
  type: string
  sizeLabel: string
  textPreview: string | null
  textError: boolean
  onClose: () => void
}) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const [zoom, setZoom] = useState(1)
  const canZoom = isImageMime(type)

  const close = useEffectEvent(() => {
    onClose()
  })

  useEffect(() => {
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        close()
        return
      }

      if (!canZoom) return
      if (event.key === '+' || event.key === '=') {
        event.preventDefault()
        setZoom((current) => Math.min(MAX_ZOOM, current + ZOOM_STEP))
      }
      if (event.key === '-' || event.key === '_') {
        event.preventDefault()
        setZoom((current) => Math.max(MIN_ZOOM, current - ZOOM_STEP))
      }
      if (event.key === '0') {
        event.preventDefault()
        setZoom(1)
      }
    }

    window.addEventListener('keydown', onKeyDown, true)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown, true)
      previousFocusRef.current?.focus()
      previousFocusRef.current = null
    }
  }, [canZoom, close])

  const onPanelKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab' || !panelRef.current) return
    const focusable = panelRef.current.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], iframe, [tabindex]:not([tabindex="-1"])',
    )
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  let stage: ReactNode
  if (isImageMime(type)) {
    stage = (
      <div className="grid w-full flex-1 place-items-center overflow-auto rounded-xl bg-black/45">
        <img
          className="block max-h-[calc(100dvh-7.5rem)] max-w-full object-contain transition-transform duration-150"
          src={url}
          alt={name}
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
        />
      </div>
    )
  } else if (isPdfMime(type)) {
    stage = (
      <div className="h-full min-h-[calc(100dvh-7.5rem)] w-full flex-1 overflow-hidden rounded-xl">
        <PdfPreview url={url} name={name} fill />
      </div>
    )
  } else if (isTextMime(type)) {
    stage = textError ? (
      <p className="m-0 grid min-h-40 place-items-center p-5 text-center text-[0.8125rem] leading-snug text-white/65">
        Couldn’t load a text preview. Use Download instead.
      </p>
    ) : (
      <pre className="m-0 w-full flex-1 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-[#111112] p-5 font-mono text-sm leading-relaxed text-[#dfe2e5]">
        {textPreview ?? 'Loading preview…'}
      </pre>
    )
  } else {
    stage = (
      <div className="m-0 grid min-h-40 place-items-center gap-3 p-5 text-center text-[0.8125rem] leading-snug text-white/65">
        <p className="m-0">
          This file type can’t be previewed inline. Download it to open with
          another app.
        </p>
        <a
          className={cn(fsControlBtnClass, 'no-underline')}
          href={url}
          download={name}
        >
          <Download size={14} strokeWidth={2.25} aria-hidden />
          Download
        </a>
      </div>
    )
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[300] bg-black/80"
      role="presentation"
    >
      <div
        ref={panelRef}
        className="flex h-full w-full flex-col text-[#dfe2e5] outline-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={onPanelKeyDown}
      >
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 bg-black/45 px-3 py-2 max-md:flex-col max-md:items-stretch">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="m-0 truncate font-heading text-base font-bold text-white"
            >
              {name}
            </h2>
            <p className="mt-0.5 text-xs text-white/65">
              {type || 'Unknown type'}
              {sizeLabel ? ` · ${sizeLabel}` : ''}
              {canZoom ? ` · ${Math.round(zoom * 100)}%` : ''}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 max-md:justify-end">
            {canZoom ? (
              <>
                <button
                  type="button"
                  className={fsControlBtnClass}
                  onClick={() =>
                    setZoom((current) => Math.max(MIN_ZOOM, current - ZOOM_STEP))
                  }
                  disabled={zoom <= MIN_ZOOM}
                  aria-label="Zoom out"
                  title="Zoom out (−)"
                >
                  <ZoomOut size={18} strokeWidth={2.25} aria-hidden />
                </button>
                <button
                  type="button"
                  className={fsControlBtnClass}
                  onClick={() =>
                    setZoom((current) => Math.min(MAX_ZOOM, current + ZOOM_STEP))
                  }
                  disabled={zoom >= MAX_ZOOM}
                  aria-label="Zoom in"
                  title="Zoom in (+)"
                >
                  <ZoomIn size={18} strokeWidth={2.25} aria-hidden />
                </button>
                <button
                  type="button"
                  className={fsControlBtnClass}
                  onClick={() => setZoom(1)}
                  disabled={zoom === 1}
                  aria-label="Reset zoom"
                  title="Reset zoom (0)"
                >
                  <RotateCcw size={18} strokeWidth={2.25} aria-hidden />
                </button>
              </>
            ) : null}

            <a
              className={cn(fsControlBtnClass, 'no-underline')}
              href={url}
              download={name}
              aria-label={`Download ${name}`}
              title="Download"
            >
              <Download size={18} strokeWidth={2.25} aria-hidden />
            </a>

            <button
              ref={closeRef}
              type="button"
              className={cn(fsControlBtnClass, 'px-3')}
              onClick={close}
              aria-label="Exit full screen"
              title="Exit full screen (Esc)"
            >
              <X size={18} strokeWidth={2.25} aria-hidden />
              <span className="leading-none max-md:hidden">Exit</span>
            </button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 items-stretch justify-center overflow-hidden p-3">
          {stage}
        </div>

        <p className="m-0 shrink-0 px-4 pb-3 pt-2 text-center text-[0.6875rem] text-white/55">
          Press Esc to exit full screen
          {canZoom ? ' · + / − to zoom · 0 to reset' : ''}
        </p>
      </div>
    </div>,
    document.body,
  )
}

function UploadFileButton({
  onUpload,
  actionClass = viewerActionClass,
}: {
  onUpload: (file: File) => void
  actionClass?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <>
      <button
        type="button"
        className={actionClass}
        aria-label="Upload"
        title="Upload"
        onClick={() => inputRef.current?.click()}
      >
        <Upload size={14} strokeWidth={2.25} aria-hidden />
      </button>
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept={DOCUMENT_FILE_ACCEPT}
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) onUpload(file)
          event.target.value = ''
        }}
      />
    </>
  )
}

function FileViewerActions({
  onUpload,
  onDelete,
  extra,
  overlay = false,
}: {
  onUpload?: (file: File) => void
  onDelete?: () => void
  extra?: ReactNode
  overlay?: boolean
}) {
  if (!onUpload && !onDelete && !extra) return null
  const actionClass = overlay ? overlayActionClass : viewerActionClass
  return (
    <div
      className={cn(
        'flex shrink-0 items-center',
        overlay
          ? 'gap-0.5 rounded-full border border-white/50 bg-background/90 p-1 shadow-[0_8px_24px_-10px_rgba(0,0,0,0.45)] ring-1 ring-black/5 backdrop-blur-md dark:border-white/10 dark:ring-white/10'
          : 'gap-1.5',
      )}
    >
      {onUpload ? (
        <UploadFileButton onUpload={onUpload} actionClass={actionClass} />
      ) : null}
      {extra}
      {onDelete ? (
        <>
          {overlay && (onUpload || extra) ? (
            <span
              className="mx-0.5 h-4 w-px shrink-0 bg-border/80"
              aria-hidden
            />
          ) : null}
          <button
            type="button"
            className={cn(
              actionClass,
              'text-destructive hover:bg-destructive/10',
            )}
            aria-label="Delete"
            title="Delete"
            onClick={onDelete}
          >
            <Trash2 size={14} strokeWidth={2.25} aria-hidden />
          </button>
        </>
      ) : null}
    </div>
  )
}

export function FileViewer({
  fileId,
  fileName,
  mimeType,
  compact = false,
  hideMeta = false,
  onUpload,
  onDelete,
}: FileViewerProps) {
  const stored = getStoredFile(fileId)
  const name = fileName || stored?.fileName || 'Attachment'
  const type = mimeType || stored?.mimeType || ''
  const sourceUrl = stored?.url
  const { previewUrl, previewFailed } = usePreviewUrl(sourceUrl)
  const url = previewUrl
  const [textPreview, setTextPreview] = useState<string | null>(null)
  const [textError, setTextError] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)

  useEffect(() => {
    let cancelled = false
    setTextPreview(null)
    setTextError(false)

    if (!url || !isTextMime(type)) return

    fetch(url)
      .then((response) => response.text())
      .then((text) => {
        if (!cancelled) setTextPreview(text.slice(0, 20_000))
      })
      .catch(() => {
        if (!cancelled) setTextError(true)
      })

    return () => {
      cancelled = true
    }
  }, [url, type])

  if (!sourceUrl || previewFailed) {
    return (
      <div className="flex items-start gap-3 rounded-xl border bg-card p-3 text-muted-foreground">
        <FileWarning size={20} strokeWidth={2} aria-hidden />
        <div className="min-w-0">
          {hideMeta ? null : (
            <p className="m-0 break-words text-sm font-semibold text-foreground">
              {name}
            </p>
          )}
          <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
            Preview unavailable. Re-upload the file to view it here.
          </p>
        </div>
        {onUpload || onDelete ? (
          <FileViewerActions onUpload={onUpload} onDelete={onDelete} />
        ) : null}
      </div>
    )
  }

  const sizeLabel = stored ? formatFileSize(stored.size) : ''
  const actionClass = hideMeta ? overlayActionClass : viewerActionClass
  const toolbar = (
    <FileViewerActions
      onUpload={onUpload}
      onDelete={onDelete}
      overlay={hideMeta}
      extra={
        <>
          <button
            type="button"
            className={actionClass}
            aria-label="Full screen"
            title="Full screen"
            onClick={() => setFullscreen(true)}
          >
            <Maximize2 size={14} strokeWidth={2.25} aria-hidden />
          </button>
          {url ? (
            <a
              className={cn(actionClass, 'no-underline')}
              href={url}
              download={name}
              aria-label={`Download ${name}`}
              title="Download"
            >
              <Download size={14} strokeWidth={2.25} aria-hidden />
            </a>
          ) : null}
        </>
      }
    />
  )

  const stage = url ? (
    <FilePreview
      url={url}
      name={name}
      type={type}
      textPreview={textPreview}
      textError={textError}
      zoom={1}
      compact={compact}
    />
  ) : null

  return (
    <>
      {hideMeta ? (
        <div
          className={cn(
            'group/viewer',
            viewerStageClass,
            compact ? 'h-64' : 'h-[28rem]',
          )}
        >
          {stage}
          {toolbar ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/25 via-black/8 to-transparent pt-14">
              <div className="pointer-events-auto flex justify-end p-3">
                {toolbar}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col overflow-hidden rounded-xl border border-border/90 bg-card">
          <header className="flex items-center justify-between gap-2 px-3 py-2.5">
            <div className="min-w-0">
              <p className="m-0 break-words text-sm font-semibold text-foreground">
                {name}
              </p>
              <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                {type || 'Unknown type'}
                {sizeLabel ? ` · ${sizeLabel}` : ''}
              </p>
            </div>
            {toolbar}
          </header>

          <div
            className={cn(
              viewerStageClass,
              'rounded-none border-0 border-t border-border/70',
              compact ? 'h-64' : 'h-[28rem]',
            )}
          >
            {stage}
          </div>
        </div>
      )}

      {fullscreen && url ? (
        <FullscreenViewer
          url={url}
          name={name}
          type={type}
          sizeLabel={sizeLabel}
          textPreview={textPreview}
          textError={textError}
          onClose={() => setFullscreen(false)}
        />
      ) : null}
    </>
  )
}
