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
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import {
  formatFileSize,
  getStoredFile,
  isImageMime,
  isPdfMime,
  isTextMime,
} from '@/lib/fileStore'

export type FileViewerProps = {
  fileId?: string | null
  fileName?: string | null
  mimeType?: string | null
  /** Compact preview inside drawers. */
  compact?: boolean
}

const MIN_ZOOM = 0.5
const MAX_ZOOM = 3
const ZOOM_STEP = 0.25

function FilePreview({
  url,
  name,
  type,
  textPreview,
  textError,
  zoom,
}: {
  url: string
  name: string
  type: string
  textPreview: string | null
  textError: boolean
  zoom: number
}) {
  if (isImageMime(type)) {
    return (
      <div className="pd-file-viewer__image-wrap">
        <img
          className="pd-file-viewer__image"
          src={url}
          alt={name}
          style={{ transform: `scale(${zoom})` }}
        />
      </div>
    )
  }

  if (isPdfMime(type)) {
    return (
      <iframe
        className="pd-file-viewer__frame"
        title={name}
        src={url}
      />
    )
  }

  if (isTextMime(type)) {
    if (textError) {
      return (
        <p className="pd-file-viewer__fallback">
          Couldn’t load a text preview. Use Download instead.
        </p>
      )
    }
    return (
      <pre className="pd-file-viewer__text">
        {textPreview ?? 'Loading preview…'}
      </pre>
    )
  }

  return (
    <div className="pd-file-viewer__fallback">
      <p>
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
      <div className="pd-file-fs__image-stage">
        <img
          className="pd-file-fs__image"
          src={url}
          alt={name}
          style={{ transform: `scale(${zoom})` }}
        />
      </div>
    )
  } else if (isPdfMime(type)) {
    stage = (
      <iframe className="pd-file-fs__frame" title={name} src={url} />
    )
  } else if (isTextMime(type)) {
    stage = textError ? (
      <p className="pd-file-viewer__fallback">
        Couldn’t load a text preview. Use Download instead.
      </p>
    ) : (
      <pre className="pd-file-fs__text">
        {textPreview ?? 'Loading preview…'}
      </pre>
    )
  } else {
    stage = (
      <div className="pd-file-viewer__fallback">
        <p>
          This file type can’t be previewed inline. Download it to open with
          another app.
        </p>
        <a className="pd-file-viewer__action" href={url} download={name}>
          <Download size={14} strokeWidth={2.25} aria-hidden />
          Download
        </a>
      </div>
    )
  }

  return createPortal(
    <div className="pd-file-fs" role="presentation">
      <div
        ref={panelRef}
        className="pd-file-fs__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={onPanelKeyDown}
      >
        <header className="pd-file-fs__toolbar">
          <div className="pd-file-fs__title-block">
            <h2 id={titleId} className="pd-file-fs__title">
              {name}
            </h2>
            <p className="pd-file-fs__meta">
              {type || 'Unknown type'}
              {sizeLabel ? ` · ${sizeLabel}` : ''}
              {canZoom ? ` · ${Math.round(zoom * 100)}%` : ''}
            </p>
          </div>

          <div className="pd-file-fs__controls">
            {canZoom ? (
              <>
                <button
                  type="button"
                  className="pd-file-fs__btn"
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
                  className="pd-file-fs__btn"
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
                  className="pd-file-fs__btn"
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
              className="pd-file-fs__btn"
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
              className="pd-file-fs__btn is-close"
              onClick={close}
              aria-label="Exit full screen"
              title="Exit full screen (Esc)"
            >
              <X size={18} strokeWidth={2.25} aria-hidden />
              <span className="pd-file-fs__btn-label">Exit</span>
            </button>
          </div>
        </header>

        <div className="pd-file-fs__stage">{stage}</div>

        <p className="pd-file-fs__hint">
          Press Esc to exit full screen
          {canZoom ? ' · + / − to zoom · 0 to reset' : ''}
        </p>
      </div>
    </div>,
    document.body,
  )
}

export function FileViewer({
  fileId,
  fileName,
  mimeType,
  compact = false,
}: FileViewerProps) {
  const stored = getStoredFile(fileId)
  const name = stored?.fileName || fileName || 'Attachment'
  const type = stored?.mimeType || mimeType || ''
  const url = stored?.url
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

  if (!url) {
    return (
      <div className="pd-file-viewer is-empty">
        <FileWarning size={20} strokeWidth={2} aria-hidden />
        <div>
          <p className="pd-file-viewer__name">{name}</p>
          <p className="pd-file-viewer__hint">
            Preview unavailable. Re-upload the file to view it here.
          </p>
        </div>
      </div>
    )
  }

  const sizeLabel = stored ? formatFileSize(stored.size) : ''

  return (
    <>
      <div className={compact ? 'pd-file-viewer is-compact' : 'pd-file-viewer'}>
        <header className="pd-file-viewer__header">
          <div className="pd-file-viewer__meta">
            <p className="pd-file-viewer__name">{name}</p>
            <p className="pd-file-viewer__hint">
              {type || 'Unknown type'}
              {sizeLabel ? ` · ${sizeLabel}` : ''}
            </p>
          </div>
          <div className="pd-file-viewer__actions">
            <button
              type="button"
              className="pd-file-viewer__action"
              onClick={() => setFullscreen(true)}
            >
              <Maximize2 size={14} strokeWidth={2.25} aria-hidden />
              Full screen
            </button>
            <a className="pd-file-viewer__action" href={url} download={name}>
              <Download size={14} strokeWidth={2.25} aria-hidden />
              Download
            </a>
          </div>
        </header>

        <div className="pd-file-viewer__stage">
          <FilePreview
            url={url}
            name={name}
            type={type}
            textPreview={textPreview}
            textError={textError}
            zoom={1}
          />
        </div>
      </div>

      {fullscreen ? (
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
