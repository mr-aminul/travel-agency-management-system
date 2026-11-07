import { useEffect, useMemo, useState } from 'react'
import {
  FileText,
  LayoutTemplate,
  Pencil,
  Plus,
  Printer,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { BusinessProfileSetupNotice } from '@/components/BusinessProfileSetupNotice'
import {
  elevatedPageClass,
  summaryStatClass,
  summaryStatGroupClass,
  summaryStatLabelClass,
  summaryStatPeekClass,
  summaryStatValueClass,
  tableShellClass,
  whiteControlClass,
} from '@/components/clients/shadcnChrome'
import { DocumentCanvasEditor } from '@/components/documents/DocumentCanvasEditor'
import { DocumentPaper } from '@/components/documents/DocumentPaper'
import { DocumentTemplateForm } from '@/components/documents/DocumentTemplateForm'
import { Button } from '@/components/shadcn/button'
import { ConfirmDialog } from '@/components/shadcn/confirm-dialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/shadcn/dialog'
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/shadcn/empty'
import { Input } from '@/components/shadcn/input'
import { DEFAULT_BRAND_NAME } from '@/lib/agencyProfile'
import { agencyProfileIsIncomplete } from '@/lib/agencyProfileGaps'
import { useAgencyProfile } from '@/layout/useAgencyProfile'
import { useClients } from '@/lib/clientsStore'
import { clientToPrintRow, formatPrintDate } from '@/lib/documentPrint'
import {
  createDocumentTemplate,
  deleteDocumentTemplate,
  updateDocumentTemplate,
  useDocumentTemplates,
  validateDocumentTemplateName,
} from '@/lib/documentTemplatesStore'
import { cn } from '@/lib/utils'
import {
  DOCUMENT_TEMPLATE_GROUPS,
  type DocumentTemplate,
  type DocumentTemplateDraft,
  type DocumentTemplateGroup,
} from '@/types/documentTemplate'

const GROUP_LABEL: Record<DocumentTemplateGroup, string> = {
  Embassy: 'Embassy Format',
  Manpower: 'Manpower Format',
}
import '@/styles/layout-clients.css'
import '@/styles/layout-ops.css'
import '@/styles/layout-docs.css'

type Composer =
  | { mode: 'create' }
  | { mode: 'edit'; template: DocumentTemplate }
  | { mode: 'edit-legacy'; template: DocumentTemplate }

function usesCanvasEditor(template?: DocumentTemplate | null) {
  return !template || template.format === 'canvas'
}

export default function DocumentsPage() {
  const templates = useDocumentTemplates()
  const clients = useClients()
  const profile = useAgencyProfile()
  const profileIncomplete = agencyProfileIsIncomplete(profile)
  const agencyName = profile.businessName.trim() || DEFAULT_BRAND_NAME
  const [selectedId, setSelectedId] = useState<string | null>(
    templates[0]?.id ?? null,
  )
  const [query, setQuery] = useState('')
  const [pickedIds, setPickedIds] = useState<string[]>([])
  const [composer, setComposer] = useState<Composer | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<DocumentTemplate | null>(
    null,
  )
  const date = formatPrintDate()

  useEffect(() => {
    if (selectedId && templates.some((item) => item.id === selectedId)) return
    setSelectedId(templates[0]?.id ?? null)
  }, [templates, selectedId])

  const selected =
    templates.find((item) => item.id === selectedId) ?? templates[0] ?? null

  const grouped = useMemo(() => {
    const canvasItems = templates.filter((item) => item.format === 'canvas')
    const formatSections = DOCUMENT_TEMPLATE_GROUPS.map((group) => ({
      group,
      label: GROUP_LABEL[group],
      items: templates.filter(
        (item) => item.group === group && item.format !== 'canvas',
      ),
    })).filter((section) => section.items.length > 0)

    return {
      canvasItems,
      formatSections,
    }
  }, [templates])

  const hits = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []
    return clients
      .filter((client) => {
        if (pickedIds.includes(client.id)) return false
        return (
          client.name.toLowerCase().includes(q) ||
          client.id.toLowerCase().includes(q) ||
          (client.passport ?? '').toLowerCase().includes(q) ||
          client.phone.toLowerCase().includes(q)
        )
      })
      .slice(0, 8)
  }, [clients, query, pickedIds])

  const pickedClients = pickedIds
    .map((id) => clients.find((item) => item.id === id) ?? null)
    .filter((client): client is NonNullable<typeof client> => client != null)

  const rows = pickedClients.map((client, index) =>
    clientToPrintRow(client, index + 1),
  )

  const primaryClient = pickedClients[0] ?? null

  const closeComposer = () => {
    setComposer(null)
    setFormError(null)
  }

  const saveDraft = (draft: DocumentTemplateDraft) => {
    const exceptId =
      composer?.mode === 'edit' || composer?.mode === 'edit-legacy'
        ? composer.template.id
        : undefined
    const error = validateDocumentTemplateName(draft.name, undefined, exceptId)
    if (error) {
      setFormError(error)
      return
    }
    if (composer?.mode === 'edit' || composer?.mode === 'edit-legacy') {
      const updated = updateDocumentTemplate(composer.template.id, draft)
      if (updated) setSelectedId(updated.id)
    } else {
      const created = createDocumentTemplate(draft)
      setSelectedId(created.id)
    }
    closeComposer()
  }

  const openEdit = (template: DocumentTemplate) => {
    setFormError(null)
    if (usesCanvasEditor(template)) {
      setComposer({ mode: 'edit', template })
      return
    }
    setComposer({ mode: 'edit-legacy', template })
  }

  if (composer && (composer.mode === 'create' || composer.mode === 'edit')) {
    return (
      <DocumentCanvasEditor
        key={composer.mode === 'edit' ? composer.template.id : 'create'}
        initial={composer.mode === 'edit' ? composer.template : undefined}
        error={formError}
        submitLabel={composer.mode === 'edit' ? 'Save Template' : 'Create Template'}
        onSubmit={saveDraft}
        onCancel={closeComposer}
      />
    )
  }

  const canvasCount = grouped.canvasItems.length
  const formatCount = templates.length - canvasCount

  return (
    <div
      className={cn(elevatedPageClass, 'pd-page pd-page--elevated pd-docs')}
      data-elevated-canvas
      aria-label="Documents"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="m-0 text-xl font-semibold tracking-tight">Documents</h1>
        <Button
          className="h-9 rounded-lg"
          onClick={() => setComposer({ mode: 'create' })}
        >
          <Plus size={16} /> New Template
        </Button>
      </div>

      <div className={summaryStatGroupClass} role="group" aria-label="Document stats">
        <Button type="button" variant="ghost" className={summaryStatClass}>
          <FileText className={summaryStatPeekClass} size={76} strokeWidth={1.25} aria-hidden />
          <span className={summaryStatLabelClass}>
            <FileText size={14} strokeWidth={1.75} aria-hidden />
            Templates
          </span>
          <span className={summaryStatValueClass}>{templates.length}</span>
        </Button>
        <Button type="button" variant="ghost" className={summaryStatClass}>
          <LayoutTemplate className={summaryStatPeekClass} size={76} strokeWidth={1.25} aria-hidden />
          <span className={summaryStatLabelClass}>
            <LayoutTemplate size={14} strokeWidth={1.75} aria-hidden />
            Your Documents
          </span>
          <span className={summaryStatValueClass}>{canvasCount}</span>
        </Button>
        <Button type="button" variant="ghost" className={summaryStatClass}>
          <Printer className={summaryStatPeekClass} size={76} strokeWidth={1.25} aria-hidden />
          <span className={summaryStatLabelClass}>
            <Printer size={14} strokeWidth={1.75} aria-hidden />
            Print Formats
          </span>
          <span className={summaryStatValueClass}>{formatCount}</span>
        </Button>
      </div>

      {templates.length === 0 ? (
        <Empty className="min-h-[14rem] justify-center border border-border bg-card shadow-sm">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileText aria-hidden />
            </EmptyMedia>
            <EmptyTitle>No Document Templates</EmptyTitle>
          </EmptyHeader>
          <Button
            className="h-9 rounded-lg"
            onClick={() => setComposer({ mode: 'create' })}
          >
            New Template
          </Button>
        </Empty>
      ) : (
        <>
          <div className="pd-docs__workspace">
            <nav
              className={cn(tableShellClass, 'pd-docs__nav border-border shadow-md')}
              aria-label="Document templates"
            >
              {grouped.canvasItems.length > 0 ? (
                <div className="pd-docs__nav-group">
                  <p className="pd-docs__nav-label">Your Documents</p>
                  <ul className="pd-docs__nav-list">
                    {grouped.canvasItems.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          className={cn(
                            'pd-docs__nav-item',
                            item.id === selected?.id && 'is-selected',
                          )}
                          aria-current={
                            item.id === selected?.id ? 'page' : undefined
                          }
                          onClick={() => setSelectedId(item.id)}
                        >
                          {item.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {grouped.formatSections.map((section) => (
                <div key={section.group} className="pd-docs__nav-group">
                  <p className="pd-docs__nav-label">{section.label}</p>
                  <ul className="pd-docs__nav-list">
                    {section.items.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          className={cn(
                            'pd-docs__nav-item',
                            item.id === selected?.id && 'is-selected',
                          )}
                          aria-current={
                            item.id === selected?.id ? 'page' : undefined
                          }
                          onClick={() => setSelectedId(item.id)}
                        >
                          {item.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>

            <div className={cn(tableShellClass, 'pd-docs__main border-border p-3 shadow-md')}>
              <div className="pd-docs__toolbar">
                <div className="relative min-w-56 flex-1">
                  <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className={cn('pl-8 pr-8', whiteControlClass)}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search client by name, ID, or passport"
                    aria-label="Search"
                  />
                  {query ? (
                    <button
                      type="button"
                      className="absolute top-1/2 right-2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
                      aria-label="Clear search"
                      onClick={() => setQuery('')}
                    >
                      <X size={14} strokeWidth={2.25} aria-hidden />
                    </button>
                  ) : null}
                </div>
                {selected ? (
                  <div className="pd-docs__toolbar-actions">
                    <Button
                      variant="outline"
                      size="sm"
                      className={whiteControlClass}
                      onClick={() => openEdit(selected)}
                    >
                      <Pencil size={14} /> Edit
                    </Button>
                    {selected.format !== 'canvas' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className={whiteControlClass}
                        onClick={() => {
                          setFormError(null)
                          setComposer({ mode: 'create' })
                        }}
                      >
                        <Plus size={14} /> Custom Document
                      </Button>
                    ) : null}
                    <Button
                      variant="outline"
                      size="sm"
                      className={whiteControlClass}
                      onClick={() => setPendingDelete(selected)}
                    >
                      <Trash2 size={14} /> Delete
                    </Button>
                    <Button
                      size="sm"
                      className="h-9 rounded-lg"
                      disabled={profileIncomplete}
                      title={
                        profileIncomplete
                          ? 'Complete Business profile before printing'
                          : undefined
                      }
                      onClick={() => {
                        if (profileIncomplete) return
                        window.print()
                      }}
                    >
                      <Printer size={14} /> Print
                    </Button>
                  </div>
                ) : null}
              </div>

              {profileIncomplete ? (
                <BusinessProfileSetupNotice
                  profile={profile}
                  variant="documents"
                />
              ) : null}


              {hits.length > 0 ? (
                <ul className="pd-docs__hits">
                  {hits.map((client) => (
                    <li key={client.id}>
                      <button
                        type="button"
                        className="pd-docs__hit"
                        onClick={() => {
                          setPickedIds((ids) => [...ids, client.id])
                          setQuery('')
                        }}
                      >
                        <span>{client.name}</span>
                        <span className="pd-docs__hit-meta">
                          {[client.passport, client.profession, client.id]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}

              {rows.length > 0 ? (
                <ul className="pd-docs__people">
                  {rows.map((row) => (
                    <li key={row.id}>
                      <span>{row.name}</span>
                      <button
                        type="button"
                        aria-label={`Remove ${row.name}`}
                        onClick={() =>
                          setPickedIds((ids) =>
                            ids.filter((id) => id !== row.id),
                          )
                        }
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}

              {selected ? (
                <div className="pd-docs__stage">
                  <DocumentPaper
                    template={selected}
                    agencyName={agencyName}
                    agencyProfile={profile}
                    client={primaryClient}
                    date={date}
                    rows={rows}
                  />
                </div>
              ) : null}
            </div>
          </div>
        </>
      )}

      <Dialog
        open={composer?.mode === 'edit-legacy'}
        onOpenChange={(open) => {
          if (!open) closeComposer()
        }}
      >
        <DialogContent
          className={cn(
            elevatedPageClass,
            'max-w-lg border border-border bg-card shadow-[var(--shadow-deep)] ring-0',
          )}
        >
          <DialogHeader>
            <DialogTitle>Edit Print Template</DialogTitle>
          </DialogHeader>
          {composer?.mode === 'edit-legacy' ? (
            <DocumentTemplateForm
              key={composer.template.id}
              initial={composer.template}
              error={formError}
              submitLabel="Save Template"
              onSubmit={saveDraft}
              onCancel={closeComposer}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={pendingDelete != null}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) {
            deleteDocumentTemplate(pendingDelete.id)
            if (selectedId === pendingDelete.id) setSelectedId(null)
          }
          setPendingDelete(null)
        }}
        title={`Delete ${pendingDelete?.name ?? 'this template'}? Client records stay.`}
        confirmLabel="Delete"
        confirmVariant="danger"
      />
    </div>
  )
}
