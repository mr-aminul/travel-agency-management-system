import { useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Printer, Trash2 } from 'lucide-react'
import { DocumentPaper } from '@/components/documents/DocumentPaper'
import { DocumentTemplateForm } from '@/components/documents/DocumentTemplateForm'
import { DEFAULT_BRAND_NAME } from '@/lib/agencyProfile'
import { useAgencyProfile } from '@/layout/useAgencyProfile'
import { useClients } from '@/lib/clientsStore'
import { cx } from '@/lib/cx'
import { clientToPrintRow, formatPrintDate } from '@/lib/documentPrint'
import { Button, ConfirmDialog, EmptyState, Modal, PageHeader, SearchField } from '@/components/ui'
import {
  createDocumentTemplate,
  deleteDocumentTemplate,
  updateDocumentTemplate,
  useDocumentTemplates,
  validateDocumentTemplateName,
} from '@/lib/documentTemplatesStore'
import {
  DOCUMENT_TEMPLATE_GROUPS,
  type DocumentTemplate,
  type DocumentTemplateDraft,
  type DocumentTemplateGroup,
} from '@/types/documentTemplate'

const GROUP_LABEL: Record<DocumentTemplateGroup, string> = {
  Embassy: 'Embassy format',
  Manpower: 'Manpower format',
}
import '@/styles/layout-ops.css'
import '@/styles/layout-docs.css'

type Composer = { mode: 'create' } | { mode: 'edit'; template: DocumentTemplate }

export default function DocumentsPage() {
  const templates = useDocumentTemplates()
  const clients = useClients()
  const profile = useAgencyProfile()
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
    return DOCUMENT_TEMPLATE_GROUPS.map((group) => ({
      group,
      label: GROUP_LABEL[group],
      items: templates.filter((item) => item.group === group),
    })).filter((section) => section.items.length > 0)
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

  const rows = pickedIds
    .map((id, index) => {
      const client = clients.find((item) => item.id === id)
      return client ? clientToPrintRow(client, index + 1) : null
    })
    .filter((row): row is NonNullable<typeof row> => row != null)

  const closeComposer = () => {
    setComposer(null)
    setFormError(null)
  }

  const saveDraft = (draft: DocumentTemplateDraft) => {
    const exceptId = composer?.mode === 'edit' ? composer.template.id : undefined
    const error = validateDocumentTemplateName(draft.name, undefined, exceptId)
    if (error) {
      setFormError(error)
      return
    }
    if (composer?.mode === 'edit') {
      const updated = updateDocumentTemplate(composer.template.id, draft)
      if (updated) setSelectedId(updated.id)
    } else {
      const created = createDocumentTemplate(draft)
      setSelectedId(created.id)
    }
    closeComposer()
  }

  return (
    <div className="pd-page pd-docs" aria-label="Documents">
      <PageHeader
        title="Documents"
        description="Pick a format on the left, add clients, then print the sheet."
        actions={
          <Button onClick={() => setComposer({ mode: 'create' })}>
            <Plus size={16} /> New template
          </Button>
        }
      />

      {templates.length === 0 ? (
        <EmptyState
          title="No print templates"
          description="Create an embassy list, putup form, or notesheet."
          action={
            <Button onClick={() => setComposer({ mode: 'create' })}>
              New template
            </Button>
          }
        />
      ) : (
        <>
          <div className="pd-docs__workspace">
            <nav className="pd-docs__nav" aria-label="Print formats">
              {grouped.map((section) => (
                <div key={section.group} className="pd-docs__nav-group">
                  <p className="pd-docs__nav-label">{section.label}</p>
                  <ul className="pd-docs__nav-list">
                    {section.items.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          className={cx(
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

            <div className="pd-docs__main">
              <div className="pd-docs__toolbar">
                <SearchField
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onClear={() => setQuery('')}
                  placeholder="Search client by name, ID, or passport"
                />
                {selected ? (
                  <div className="pd-docs__toolbar-actions">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setFormError(null)
                        setComposer({ mode: 'edit', template: selected })
                      }}
                    >
                      <Pencil size={14} /> Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPendingDelete(selected)}
                    >
                      <Trash2 size={14} /> Delete
                    </Button>
                    <Button size="sm" onClick={() => window.print()}>
                      <Printer size={14} /> Print
                    </Button>
                  </div>
                ) : null}
              </div>

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
                    date={date}
                    rows={rows}
                  />
                </div>
              ) : null}
            </div>
          </div>
        </>
      )}

      <Modal
        open={composer != null}
        onClose={closeComposer}
        title={
          composer?.mode === 'edit' ? 'Edit print template' : 'New print template'
        }
        description="These are the embassy and manpower sheets you print. Changing a template does not change client files."
      >
        {composer ? (
          <DocumentTemplateForm
            key={composer.mode === 'edit' ? composer.template.id : 'create'}
            initial={composer.mode === 'edit' ? composer.template : undefined}
            error={formError}
            submitLabel={
              composer.mode === 'edit' ? 'Save template' : 'Create template'
            }
            onSubmit={saveDraft}
            onCancel={closeComposer}
          />
        ) : null}
      </Modal>

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
        title={`Delete ${pendingDelete?.name ?? 'this template'}?`}
        description="The print layout is removed. Client records stay as they are."
        confirmLabel="Delete"
        confirmVariant="danger"
      />
    </div>
  )
}
