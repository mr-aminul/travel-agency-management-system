import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronRight, Plus, Trash2 } from 'lucide-react'
import {
  Badge,
  Button,
  ConfirmDialog,
  Input,
  SideDrawer,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
  Tooltip,
} from '@/components/ui'
import { SettingsInfo } from '@/components/settings/SettingsInfo'
import { resolveServiceTemplate } from '@/lib/resolveServiceTemplate'
import { isBuiltinService } from '@/types/case'
import {
  createCustomService,
  deleteCustomService,
} from '@/lib/customServicesStore'
import {
  hideCatalogService,
  restoreCatalogService,
} from '@/lib/hiddenServicesStore'
import {
  useCatalogServiceRefs,
  useHiddenBuiltinCatalogOptions,
} from '@/lib/serviceCatalog'
import { useServiceTemplates } from '@/lib/serviceTemplatesStore'
import {
  serviceCatalogEditorPath,
} from '@/lib/workPaths'

type PendingDelete = {
  key: string
  label: string
  kind: 'builtin' | 'custom'
  customId?: string
}

function checklistLabel(stepCount: number, documentCount: number): string {
  const steps = `${stepCount} ${stepCount === 1 ? 'step' : 'steps'}`
  const docs = `${documentCount} ${documentCount === 1 ? 'document' : 'documents'}`
  return `${steps}, ${docs}`
}

export function ServicesSettingsSection({
  title,
  info,
}: {
  title: string
  info: string
}) {
  const navigate = useNavigate()
  const refs = useCatalogServiceRefs()
  useServiceTemplates()
  const hiddenBuiltins = useHiddenBuiltinCatalogOptions()
  const catalog = refs.map((item) => {
    const template = resolveServiceTemplate(item.key)
    return {
      ...item,
      stepCount: template.steps.length,
      documentCount: template.documents.length,
      isCustomized: template.isCustomized,
      countryCount: template.countryCount,
    }
  })

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [composerOpen, setComposerOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)

  const closeComposer = () => {
    setComposerOpen(false)
    setName('')
    setDescription('')
    setError(null)
  }

  const handleComposerSubmit = (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    try {
      const created = createCustomService({ name, description })
      closeComposer()
      navigate(serviceCatalogEditorPath(created.name))
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Could not add that service.',
      )
    }
  }

  const confirmDelete = () => {
    if (!pendingDelete) return
    const target = pendingDelete
    if (target.kind === 'custom' && target.customId) {
      deleteCustomService(target.customId)
    } else {
      hideCatalogService(target.key)
    }
    setPendingDelete(null)
  }

  return (
    <>
      <header className="pd-settings-panel__header pd-settings-panel__header--flush">
        <h2 id="settings-panel-title" className="pd-settings-panel__title">
          {title}
        </h2>
        <SettingsInfo title={title} body={info} />
        <div className="pd-settings-panel__actions">
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setComposerOpen(true)
              setError(null)
            }}
          >
            <Plus size={14} />
            Add service
          </Button>
        </div>
      </header>

      <div className="pd-settings-catalog">
        {catalog.length === 0 ? (
          <p className="pd-settings-service-empty">No services yet.</p>
        ) : (
          <Table aria-label="Service catalog">
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead>Checklist</TableHead>
                <TableHead aria-label="Actions" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {catalog.map((item) => {
                const href = serviceCatalogEditorPath(item.key)
                return (
                  <TableRow
                    key={item.key}
                    className="pd-settings-catalog__row"
                    onClick={() => navigate(href)}
                  >
                    <TableCell>
                      <Link
                        to={href}
                        className="pd-settings-catalog__name"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {item.label}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span className="pd-settings-catalog__meta">
                        {checklistLabel(item.stepCount, item.documentCount)}
                        {item.countryCount ? (
                          <>
                            {' · '}
                            {item.countryCount}{' '}
                            {item.countryCount === 1
                              ? 'country'
                              : 'countries'}
                          </>
                        ) : null}
                        {item.isCustomized ? (
                          <Badge variant="in-progress">Customized</Badge>
                        ) : null}
                        {item.kind === 'custom' ? (
                          <Badge variant="neutral">Added</Badge>
                        ) : null}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="pd-settings-catalog__row-actions">
                        <Tooltip
                          content={
                            item.kind === 'custom'
                              ? 'Delete this service'
                              : 'Remove from catalog'
                          }
                        >
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-label={`Delete ${item.label}`}
                            onClick={(event) => {
                              event.stopPropagation()
                              setPendingDelete({
                                key: item.key,
                                label: item.label,
                                kind: item.kind,
                                customId: item.customId,
                              })
                            }}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </Tooltip>
                        <ChevronRight
                          size={16}
                          strokeWidth={2}
                          aria-hidden
                          className="pd-settings-catalog__chevron"
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}

        {hiddenBuiltins.length > 0 ? (
          <div className="pd-settings-catalog__hidden">
            <span className="pd-settings-catalog__hidden-title">Removed</span>
            <ul className="pd-settings-catalog__hidden-list">
              {hiddenBuiltins.map((option) => (
                <li
                  key={option.value}
                  className="pd-settings-catalog__hidden-item"
                >
                  <span>{option.label}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      restoreCatalogService(option.value)
                      navigate(serviceCatalogEditorPath(option.value))
                    }}
                  >
                    Restore
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <SideDrawer
        open={composerOpen}
        onClose={closeComposer}
        title="Add service"
        description="Name the line you sell. You can set the status journey and documents right after."
        className="pd-settings-drawer"
      >
        <form
          className="pd-settings-catalog__composer"
          onSubmit={handleComposerSubmit}
        >
          <Input
            label="Service name"
            name="customServiceName"
            placeholder="e.g. Visa processing"
            value={name}
            autoFocus
            onChange={(event) => {
              setName(event.target.value)
              setError(null)
            }}
            error={
              isBuiltinService(name.trim())
                ? 'That name is already used.'
                : undefined
            }
          />
          <Textarea
            label="Description"
            name="customServiceDescription"
            rows={3}
            placeholder="What this service covers (optional)"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          {error ? (
            <p
              className="pd-settings-form__status pd-settings-form__status--error"
              role="alert"
            >
              {error}
            </p>
          ) : null}
          <div className="pd-settings-catalog__composer-actions">
            <Button type="button" variant="secondary" size="sm" onClick={closeComposer}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Create and edit checklist
            </Button>
          </div>
        </form>
      </SideDrawer>

      <ConfirmDialog
        open={pendingDelete != null}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title={
          pendingDelete?.kind === 'custom'
            ? `Delete ${pendingDelete.label}?`
            : `Remove ${pendingDelete?.label ?? 'this service'}?`
        }
        description={
          pendingDelete?.kind === 'custom'
            ? 'New files will no longer offer it. Existing files stay.'
            : 'Hide it from new files. Existing files stay, and you can restore it later.'
        }
        confirmLabel={pendingDelete?.kind === 'custom' ? 'Delete' : 'Remove'}
        confirmVariant="danger"
      />
    </>
  )
}
