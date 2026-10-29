import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Eye,
  Heading1,
  Heading2,
  ImagePlus,
  Italic,
  List,
  ListOrdered,
  Pencil,
  Printer,
  Search,
  Trash2,
  Underline as UnderlineIcon,
} from 'lucide-react'
import { BackButton, Button, Input, SearchField, Select } from '@/components/ui'
import { cx } from '@/lib/cx'
import { DEFAULT_BRAND_NAME } from '@/lib/agencyProfile'
import { useAgencyProfile } from '@/layout/useAgencyProfile'
import { useClients } from '@/lib/clientsStore'
import { fillDocumentHtml } from '@/lib/documentMergeFill'
import { formatPrintDate } from '@/lib/documentPrint'
import { MergeField } from '@/components/documents/mergeFieldExtension'
import { MergeFieldMentionMenu } from '@/components/documents/mergeFieldMention'
import {
  DocumentImage,
  type DocumentImageAlign,
} from '@/components/documents/documentImageExtension'
import {
  DEFAULT_CANVAS_BODY_HTML,
  DOCUMENT_MERGE_FIELDS,
  DOCUMENT_MERGE_GROUP_LABELS,
  type DocumentMergeField,
  type DocumentMergeGroup,
} from '@/types/documentMergeFields'
import {
  type DocumentTemplate,
  type DocumentTemplateDraft,
} from '@/types/documentTemplate'
import type { Client } from '@/types/client'

const DIRECTION_OPTIONS = [
  { value: 'ltr', label: 'Left to right' },
  { value: 'rtl', label: 'Right to left' },
]

const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024

type DocumentCanvasEditorProps = {
  initial?: DocumentTemplate
  error?: string | null
  submitLabel: string
  onSubmit: (draft: DocumentTemplateDraft) => void
  onCancel: () => void
}

type ImageSelection = {
  width: number
  align: DocumentImageAlign
  alt: string
}

function ToolbarButton({
  active,
  disabled,
  label,
  onClick,
  children,
}: {
  active?: boolean
  disabled?: boolean
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      className={cx('pd-doc-canvas__tool', active && 'is-active')}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function readImageAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('Could not read image.'))
    }
    reader.onerror = () => reject(new Error('Could not read image.'))
    reader.readAsDataURL(file)
  })
}

function samplePreviewClient(tenantId: string): Client {
  return {
    id: 'CL-PREVIEW',
    tenantId,
    name: 'Rahim Uddin',
    banglaName: 'রহিম উদ্দিন',
    fatherName: 'Karim Uddin',
    motherName: 'Salma Begum',
    email: 'rahim@example.com',
    phone: '01700 000 000',
    address: 'House 12, Road 4, Dhanmondi, Dhaka',
    presentAddress: 'House 12, Road 4, Dhanmondi, Dhaka',
    permanentAddress: 'Village Example, Upazila Example',
    district: 'Dhaka',
    passport: 'A12345678',
    passportExpiry: '2030-01-15',
    passportIssuedOn: '2020-01-15',
    passportPlaceOfIssue: 'Dhaka',
    nid: '1234567890',
    profession: 'Electrician',
    preferredJob: 'Electrician',
    preferredCountry: 'Saudi Arabia',
    nationality: 'Bangladeshi',
    gender: 'Male',
    services: [],
    balance: 0,
    activeCases: 0,
    idChecked: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  }
}

export function DocumentCanvasEditor({
  initial,
  error,
  submitLabel,
  onSubmit,
  onCancel,
}: DocumentCanvasEditorProps) {
  const profile = useAgencyProfile()
  const clients = useClients()
  const agencyName = profile.businessName.trim() || DEFAULT_BRAND_NAME
  const [name, setName] = useState(initial?.name ?? '')
  const [direction, setDirection] = useState<'ltr' | 'rtl'>(
    initial?.direction === 'rtl' ? 'rtl' : 'ltr',
  )
  const [title, setTitle] = useState(initial?.title ?? initial?.name ?? '')
  const [licenseNo, setLicenseNo] = useState(initial?.licenseNo ?? '')
  const [country, setCountry] = useState(initial?.country ?? '')
  const [fieldQuery, setFieldQuery] = useState('')
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')
  const [previewQuery, setPreviewQuery] = useState('')
  const [previewClientId, setPreviewClientId] = useState<string | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [imageSelection, setImageSelection] = useState<ImageSelection | null>(
    null,
  )
  const [bodyHtml, setBodyHtml] = useState(
    initial?.bodyHtml?.trim()
      ? initial.bodyHtml
      : DEFAULT_CANVAS_BODY_HTML,
  )
  const imageInputRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({
        placeholder: 'Start writing… Type @ to insert a field',
      }),
      MergeField,
      DocumentImage.configure({
        inline: false,
        allowBase64: true,
      }),
    ],
    content: bodyHtml,
    editorProps: {
      attributes: {
        class: 'pd-doc-canvas__prose',
        spellcheck: 'true',
      },
    },
    onUpdate: ({ editor: current }) => {
      setBodyHtml(current.getHTML())
    },
    onSelectionUpdate: ({ editor: current }) => {
      if (!current.isActive('image')) {
        setImageSelection(null)
        return
      }
      const attrs = current.getAttributes('image')
      setImageSelection({
        width: Number(attrs.width) || 60,
        align: (attrs.align as DocumentImageAlign) || 'center',
        alt: typeof attrs.alt === 'string' ? attrs.alt : '',
      })
    },
  })

  useEffect(() => {
    if (!editor) return
    editor.view.dom.setAttribute('dir', direction)
    editor.setEditable(mode === 'edit')
  }, [editor, direction, mode])

  const previewClient = useMemo(() => {
    if (previewClientId) {
      return clients.find((item) => item.id === previewClientId) ?? null
    }
    return samplePreviewClient(clients[0]?.tenantId ?? 'demo')
  }, [clients, previewClientId])

  const previewHits = useMemo(() => {
    const q = previewQuery.trim().toLowerCase()
    if (q.length < 2) return []
    return clients
      .filter((client) => {
        return (
          client.name.toLowerCase().includes(q) ||
          client.id.toLowerCase().includes(q) ||
          (client.passport ?? '').toLowerCase().includes(q)
        )
      })
      .slice(0, 6)
  }, [clients, previewQuery])

  const filledPreviewHtml = useMemo(() => {
    const html = editor?.getHTML() ?? bodyHtml
    return fillDocumentHtml(html, {
      client: previewClient,
      agency: profile,
      license: licenseNo.trim() || '864',
      date: formatPrintDate(),
      country,
      documentTitle: title.trim() || name.trim(),
    })
  }, [
    editor,
    bodyHtml,
    previewClient,
    profile,
    licenseNo,
    country,
    title,
    name,
    mode,
  ])

  const groupedFields = useMemo(() => {
    const q = fieldQuery.trim().toLowerCase()
    const filtered = DOCUMENT_MERGE_FIELDS.filter((field) => {
      if (!q) return true
      return (
        field.label.toLowerCase().includes(q) ||
        field.key.toLowerCase().includes(q) ||
        field.chip.toLowerCase().includes(q)
      )
    })
    const groups: DocumentMergeGroup[] = [
      'client',
      'passport',
      'agency',
      'document',
    ]
    return groups
      .map((groupKey) => ({
        group: groupKey,
        label: DOCUMENT_MERGE_GROUP_LABELS[groupKey],
        items: filtered.filter((field) => field.group === groupKey),
      }))
      .filter((section) => section.items.length > 0)
  }, [fieldQuery])

  const insertField = (field: DocumentMergeField) => {
    if (!editor || mode !== 'edit') return
    editor
      .chain()
      .focus()
      .insertMergeField({ key: field.key, label: field.chip })
      .run()
  }

  const handleImagePick = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !editor) return
    setImageError(null)
    if (!file.type.startsWith('image/')) {
      setImageError('Choose a PNG, JPG, or WebP image.')
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError('Keep images under 1.5 MB so templates stay light.')
      return
    }
    try {
      const src = await readImageAsDataUrl(file)
      editor
        .chain()
        .focus()
        .setDocumentImage({
          src,
          alt: file.name.replace(/\.[^.]+$/, '') || 'Image',
          width: 60,
          align: 'center',
        })
        .run()
    } catch {
      setImageError('Could not add that image. Try another file.')
    }
  }

  const updateSelectedImage = (patch: Partial<ImageSelection>) => {
    if (!editor || !imageSelection) return
    const next = { ...imageSelection, ...patch }
    setImageSelection(next)
    editor
      .chain()
      .focus()
      .updateDocumentImage({
        width: next.width,
        align: next.align,
        alt: next.alt,
      })
      .run()
  }

  const removeSelectedImage = () => {
    if (!editor) return
    editor.chain().focus().deleteSelection().run()
    setImageSelection(null)
  }

  const handleSave = () => {
    const html = editor?.getHTML() ?? bodyHtml
    onSubmit({
      name,
      group: initial?.group ?? 'Manpower',
      format: 'canvas',
      layout: 'letter',
      direction,
      title: title.trim() || name.trim(),
      licenseNo,
      country,
      bodyHtml: html,
      headerRows: [],
      letterIntro: '',
      letterItems: [],
      declaration: '',
    })
  }

  const handlePrint = () => {
    window.print()
  }

  const sheetTitle = title.trim()
  const previewSheet = (
    <>
      {sheetTitle ? (
        <h1 className="pd-doc-canvas__sheet-title">{sheetTitle}</h1>
      ) : null}
      <div
        className="pd-doc-canvas__prose pd-doc-canvas__prose--filled"
        dangerouslySetInnerHTML={{
          __html: filledPreviewHtml || '<p></p>',
        }}
      />
    </>
  )

  return (
    <div
      className={cx(
        'pd-doc-canvas',
        mode === 'preview' && 'pd-doc-canvas--preview',
      )}
      aria-label="Document template editor"
    >
      <header className="pd-doc-canvas__top pd-doc-canvas__no-print">
        <div className="pd-doc-canvas__top-start">
          <BackButton label="documents" onClick={onCancel} />
          <div className="pd-doc-canvas__identity">
            <Input
              aria-label="Template name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Template name"
            />
            <p className="pd-doc-canvas__hint">
              Craft the page like a Word document. Type @ to insert an auto-fill
              field, or pick one from the list.
            </p>
          </div>
        </div>
        <div className="pd-doc-canvas__top-actions">
          <Button
            variant={mode === 'preview' ? 'primary' : 'secondary'}
            onClick={() =>
              setMode((current) => (current === 'edit' ? 'preview' : 'edit'))
            }
          >
            {mode === 'preview' ? (
              <>
                <Pencil size={16} /> Edit
              </>
            ) : (
              <>
                <Eye size={16} /> Preview
              </>
            )}
          </Button>
          <Button variant="secondary" onClick={handlePrint}>
            <Printer size={16} /> Print
          </Button>
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>{submitLabel}</Button>
        </div>
      </header>

      {error ? (
        <p className="pd-doc-canvas__error pd-doc-canvas__no-print" role="alert">
          {error}
        </p>
      ) : null}
      {imageError ? (
        <p className="pd-doc-canvas__error pd-doc-canvas__no-print" role="alert">
          {imageError}
        </p>
      ) : null}

      <div className="pd-doc-canvas__meta pd-doc-canvas__no-print">
        <Select
          label="Text direction"
          value={direction}
          options={DIRECTION_OPTIONS}
          onChange={(event) =>
            setDirection(event.target.value === 'rtl' ? 'rtl' : 'ltr')
          }
        />
        <Input
          label="Printed title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Optional heading on the page"
        />
        <Input
          label="License number"
          value={licenseNo}
          onChange={(event) => setLicenseNo(event.target.value)}
          placeholder="Used by License no. field"
        />
        <Input
          label="Destination country"
          value={country}
          onChange={(event) => setCountry(event.target.value)}
          placeholder="Used by Country field"
        />
      </div>

      <div className="pd-doc-canvas__workspace">
        <aside
          className="pd-doc-canvas__fields pd-doc-canvas__no-print"
          aria-label={mode === 'preview' ? 'Preview client' : 'Auto-fill fields'}
        >
          {mode === 'preview' ? (
            <>
              <div className="pd-doc-canvas__fields-head">
                <h2>Preview with client</h2>
                <p>
                  Pick a real client to see how fields fill, or keep the sample
                  data.
                </p>
                <SearchField
                  value={previewQuery}
                  onChange={(event) => setPreviewQuery(event.target.value)}
                  onClear={() => setPreviewQuery('')}
                  placeholder="Search client…"
                />
              </div>
              <div className="pd-doc-canvas__fields-body">
                <button
                  type="button"
                  className={cx(
                    'pd-doc-canvas__field',
                    !previewClientId && 'is-selected',
                  )}
                  onClick={() => setPreviewClientId(null)}
                >
                  <span>Sample client data</span>
                  <span className="pd-doc-canvas__field-chip">Demo</span>
                </button>
                {previewHits.map((client) => (
                  <button
                    key={client.id}
                    type="button"
                    className={cx(
                      'pd-doc-canvas__field',
                      previewClientId === client.id && 'is-selected',
                    )}
                    onClick={() => {
                      setPreviewClientId(client.id)
                      setPreviewQuery('')
                    }}
                  >
                    <span>{client.name}</span>
                    <span className="pd-doc-canvas__field-chip">
                      {client.passport || client.id}
                    </span>
                  </button>
                ))}
                <p className="pd-doc-canvas__fields-empty">
                  Previewing as{' '}
                  <strong>{previewClient?.name ?? 'Sample client'}</strong>
                  {' · '}
                  {agencyName}
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="pd-doc-canvas__fields-head">
                <h2>Insert information</h2>
                <p>
                  Type @ in the document or click a field. It fills from the
                  client profile when you preview or print.
                </p>
                <label className="pd-doc-canvas__search">
                  <Search size={16} aria-hidden />
                  <input
                    type="search"
                    value={fieldQuery}
                    onChange={(event) => setFieldQuery(event.target.value)}
                    placeholder="Search fields…"
                  />
                </label>
              </div>
              <div className="pd-doc-canvas__fields-body">
                {groupedFields.map((section) => (
                  <div
                    key={section.group}
                    className="pd-doc-canvas__field-group"
                  >
                    <p className="pd-doc-canvas__field-label">{section.label}</p>
                    <ul>
                      {section.items.map((field) => (
                        <li key={field.key}>
                          <button
                            type="button"
                            className="pd-doc-canvas__field"
                            onClick={() => insertField(field)}
                          >
                            <span>{field.label}</span>
                            <span className="pd-doc-canvas__field-chip">
                              {field.chip}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                {groupedFields.length === 0 ? (
                  <p className="pd-doc-canvas__fields-empty">
                    No matching fields.
                  </p>
                ) : null}
              </div>
            </>
          )}
        </aside>

        <div className="pd-doc-canvas__stage">
          <MergeFieldMentionMenu editor={editor} enabled={mode === 'edit'} />
          {mode === 'edit' ? (
            <>
              <div
                className="pd-doc-canvas__toolbar pd-doc-canvas__no-print"
                role="toolbar"
                aria-label="Formatting"
              >
                <ToolbarButton
                  label="Bold"
                  active={editor?.isActive('bold')}
                  disabled={!editor}
                  onClick={() => editor?.chain().focus().toggleBold().run()}
                >
                  <Bold size={16} />
                </ToolbarButton>
                <ToolbarButton
                  label="Italic"
                  active={editor?.isActive('italic')}
                  disabled={!editor}
                  onClick={() => editor?.chain().focus().toggleItalic().run()}
                >
                  <Italic size={16} />
                </ToolbarButton>
                <ToolbarButton
                  label="Underline"
                  active={editor?.isActive('underline')}
                  disabled={!editor}
                  onClick={() =>
                    editor?.chain().focus().toggleUnderline().run()
                  }
                >
                  <UnderlineIcon size={16} />
                </ToolbarButton>
                <span className="pd-doc-canvas__tool-sep" aria-hidden />
                <ToolbarButton
                  label="Heading 1"
                  active={editor?.isActive('heading', { level: 1 })}
                  disabled={!editor}
                  onClick={() =>
                    editor?.chain().focus().toggleHeading({ level: 1 }).run()
                  }
                >
                  <Heading1 size={16} />
                </ToolbarButton>
                <ToolbarButton
                  label="Heading 2"
                  active={editor?.isActive('heading', { level: 2 })}
                  disabled={!editor}
                  onClick={() =>
                    editor?.chain().focus().toggleHeading({ level: 2 }).run()
                  }
                >
                  <Heading2 size={16} />
                </ToolbarButton>
                <span className="pd-doc-canvas__tool-sep" aria-hidden />
                <ToolbarButton
                  label="Bulleted list"
                  active={editor?.isActive('bulletList')}
                  disabled={!editor}
                  onClick={() =>
                    editor?.chain().focus().toggleBulletList().run()
                  }
                >
                  <List size={16} />
                </ToolbarButton>
                <ToolbarButton
                  label="Numbered list"
                  active={editor?.isActive('orderedList')}
                  disabled={!editor}
                  onClick={() =>
                    editor?.chain().focus().toggleOrderedList().run()
                  }
                >
                  <ListOrdered size={16} />
                </ToolbarButton>
                <span className="pd-doc-canvas__tool-sep" aria-hidden />
                <ToolbarButton
                  label="Align left"
                  active={editor?.isActive({ textAlign: 'left' })}
                  disabled={!editor}
                  onClick={() =>
                    editor?.chain().focus().setTextAlign('left').run()
                  }
                >
                  <AlignLeft size={16} />
                </ToolbarButton>
                <ToolbarButton
                  label="Align center"
                  active={editor?.isActive({ textAlign: 'center' })}
                  disabled={!editor}
                  onClick={() =>
                    editor?.chain().focus().setTextAlign('center').run()
                  }
                >
                  <AlignCenter size={16} />
                </ToolbarButton>
                <ToolbarButton
                  label="Align right"
                  active={editor?.isActive({ textAlign: 'right' })}
                  disabled={!editor}
                  onClick={() =>
                    editor?.chain().focus().setTextAlign('right').run()
                  }
                >
                  <AlignRight size={16} />
                </ToolbarButton>
                <span className="pd-doc-canvas__tool-sep" aria-hidden />
                <ToolbarButton
                  label="Insert image"
                  disabled={!editor}
                  onClick={() => imageInputRef.current?.click()}
                >
                  <ImagePlus size={16} />
                </ToolbarButton>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="pd-doc-canvas__file"
                  onChange={handleImagePick}
                />
              </div>

              {imageSelection ? (
                <div
                  className="pd-doc-canvas__image-controls pd-doc-canvas__no-print"
                  aria-label="Image adjustments"
                >
                  <label className="pd-doc-canvas__image-control">
                    <span>Width</span>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      step={5}
                      value={imageSelection.width}
                      onChange={(event) =>
                        updateSelectedImage({
                          width: Number(event.target.value),
                        })
                      }
                    />
                    <strong>{imageSelection.width}%</strong>
                  </label>
                  <div
                    className="pd-doc-canvas__image-align"
                    role="group"
                    aria-label="Image alignment"
                  >
                    <ToolbarButton
                      label="Image left"
                      active={imageSelection.align === 'left'}
                      onClick={() => updateSelectedImage({ align: 'left' })}
                    >
                      <AlignLeft size={16} />
                    </ToolbarButton>
                    <ToolbarButton
                      label="Image center"
                      active={imageSelection.align === 'center'}
                      onClick={() => updateSelectedImage({ align: 'center' })}
                    >
                      <AlignCenter size={16} />
                    </ToolbarButton>
                    <ToolbarButton
                      label="Image right"
                      active={imageSelection.align === 'right'}
                      onClick={() => updateSelectedImage({ align: 'right' })}
                    >
                      <AlignRight size={16} />
                    </ToolbarButton>
                  </div>
                  <label className="pd-doc-canvas__image-control pd-doc-canvas__image-control--grow">
                    <span>Alt text</span>
                    <input
                      type="text"
                      value={imageSelection.alt}
                      onChange={(event) =>
                        updateSelectedImage({ alt: event.target.value })
                      }
                      placeholder="Describe the image"
                    />
                  </label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={removeSelectedImage}
                  >
                    <Trash2 size={14} /> Remove
                  </Button>
                </div>
              ) : null}
            </>
          ) : null}

          <div className="pd-doc-canvas__sheet-wrap pd-doc-canvas__screen-only">
            <div
              className="pd-doc-canvas__sheet pd-paper"
              data-direction={direction}
              dir={direction}
            >
              {mode === 'edit' ? (
                <>
                  {sheetTitle ? (
                    <h1 className="pd-doc-canvas__sheet-title">{sheetTitle}</h1>
                  ) : null}
                  <EditorContent editor={editor} />
                </>
              ) : (
                previewSheet
              )}
            </div>
          </div>

          <div
            className="pd-doc-canvas__print-only"
            aria-hidden
          >
            <div
              className="pd-doc-canvas__sheet pd-paper pd-doc-canvas__print-sheet"
              data-direction={direction}
              dir={direction}
            >
              {previewSheet}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
