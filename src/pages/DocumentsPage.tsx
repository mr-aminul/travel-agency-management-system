import { useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Printer, Trash2 } from 'lucide-react'
import { DocumentPaper } from '@/components/documents/DocumentPaper'
import { DocumentTemplateForm } from '@/components/documents/DocumentTemplateForm'
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  Modal,
  PageHeader,
  SearchField,
} from '@/components/ui'
import { DEFAULT_BRAND_NAME } from '@/lib/agencyProfile'
import { useAgencyProfile } from '@/layout/useAgencyProfile'
import { useClients } from '@/lib/clientsStore'
import { cx } from '@/lib/cx'
import { clientToPrintRow, formatPrintDate } from '@/lib/documentPrint'
import {
  createDocumentTemplate,
  deleteDocumentTemplate,
  updateDocumentTemplate,
  useDocumentTemplates,
  validateDocumentTemplateName,
} from '@/lib/documentTemplatesStore'
import type {
  DocumentTemplate,
  DocumentTemplateDraft,
} from '@/types/documentTemplate'
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
        description="Print embassy and manpower formats. Search a client onto the sheet, then print."
        actions={
          <>
            {selected ? (
              <>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setFormError(null)
                    setComposer({ mode: 'edit', template: selected })
                  }}
                >
                  <Pencil size={16} /> Edit
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setPendingDelete(selected)}
                >
                  <Trash2 size={16} /> Delete
                </Button>
                <Button onClick={() => window.print()}>
                  <Printer size={16} /> Print
                </Button>
              </>
            ) : null}
            <Button onClick={() => setComposer({ mode: 'create' })}>
              <Plus size={16} /> New template
            </Button>
          </>
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
          <div className="pd-docs__chips" role="tablist" aria-label="Templates">
            {templates.map((item) => (
              <button
                key={item.id}
                type="button"
                className={cx(
                  'pd-docs__chip',
                  item.id === selected?.id && 'is-selected',
                )}
                onClick={() => setSelectedId(item.id)}
              >
                {item.name}
                <Badge variant="neutral">{item.group}</Badge>
              </button>
            ))}
          </div>

          <div className="pd-docs__toolbar">
            <SearchField
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onClear={() => setQuery('')}
              placeholder="Search client by name, ID, or passport"
            />
            <p className="pd-ops__meta">
              {rows.length} {rows.length === 1 ? 'person' : 'people'} on the sheet
            </p>
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
