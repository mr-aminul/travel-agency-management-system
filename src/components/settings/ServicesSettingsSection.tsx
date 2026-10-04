import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Button, ConfirmDialog, Input, Textarea, Tooltip } from '@/components/ui'
import {
  resolveServiceTemplate,
  ServiceTemplateEditor,
} from '@/components/settings/ServiceTemplateEditor'
import { cx } from '@/lib/cx'
import { BUILTIN_SERVICE_OPTIONS, isBuiltinService } from '@/types/case'
import { activeTenantAllowsService } from '@/lib/activeTenant'
import { renameServiceOnCases } from '@/lib/casesStore'
import { renameServiceOnClients } from '@/lib/clientsStore'
import {
  createCustomService,
  deleteCustomService,
  updateCustomService,
  useCustomServices,
} from '@/lib/customServicesStore'
import {
  hideCatalogService,
  restoreCatalogService,
  useHiddenServices,
} from '@/lib/hiddenServicesStore'
import { useServiceTemplates } from '@/lib/serviceTemplatesStore'

type CatalogItem = {
  key: string
  label: string
  kind: 'builtin' | 'custom'
  description: string
  customId?: string
  stepCount: number
  documentCount: number
  isCustomized: boolean
  countryCount: number
}

type Composer =
  | { mode: 'create' }
  | { mode: 'edit'; customId: string }
  | null

type PendingDelete = {
  key: string
  label: string
  kind: 'builtin' | 'custom'
  customId?: string
}

export function ServicesSettingsSection() {
  const customServices = useCustomServices()
  const templates = useServiceTemplates()
  const hiddenNames = useHiddenServices()
  const catalog = useMemo<CatalogItem[]>(() => {
    const builtinEnabled = BUILTIN_SERVICE_OPTIONS.filter(
      (option) =>
        activeTenantAllowsService(option.value) &&
        !hiddenNames.some(
          (name) => name.toLowerCase() === option.value.toLowerCase(),
        ),
    )
    const builtInItems = builtinEnabled.map((option) => {
      const template = resolveServiceTemplate(option.value)
      return {
        key: option.value,
        label: option.label,
        kind: 'builtin' as const,
        description: 'Built-in template',
        stepCount: template.steps.length,
        documentCount: template.documents.length,
        isCustomized: template.isCustomized,
        countryCount: template.countryCount,
      }
    })
    const customItems = customServices.map((item) => {
      const template = resolveServiceTemplate(item.name)
      return {
        key: item.name,
        label: item.name,
        kind: 'custom' as const,
        description: item.description || 'Your service',
        customId: item.id,
        stepCount: template.steps.length,
        documentCount: template.documents.length,
        isCustomized: template.isCustomized,
        countryCount: template.countryCount,
      }
    })
    return [...builtInItems, ...customItems]
  }, [customServices, templates, hiddenNames])

  const hiddenBuiltins = useMemo(
    () =>
      BUILTIN_SERVICE_OPTIONS.filter(
        (option) =>
          activeTenantAllowsService(option.value) &&
          hiddenNames.some(
            (name) => name.toLowerCase() === option.value.toLowerCase(),
          ),
      ),
    [hiddenNames],
  )

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [composer, setComposer] = useState<Composer>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [editorDirty, setEditorDirty] = useState(false)
  const [pendingSelect, setPendingSelect] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)
  const [pendingCreate, setPendingCreate] = useState(false)

  useEffect(() => {
    if (selected && catalog.some((item) => item.key === selected)) return
    if (catalog[0]) setSelected(catalog[0].key)
    else setSelected(null)
  }, [catalog, selected])

  const selectedItem = catalog.find((item) => item.key === selected) ?? null

  const selectService = (key: string | null) => {
    setSelected(key)
    setEditorDirty(false)
  }

  const closeComposer = () => {
    setComposer(null)
    setName('')
    setDescription('')
    setError(null)
  }

  const openCreate = () => {
    setComposer({ mode: 'create' })
    setName('')
    setDescription('')
    setError(null)
  }

  const openEdit = (item: CatalogItem) => {
    if (!item.customId) {
      requestSelect(item.key)
      return
    }
    const record = customServices.find((service) => service.id === item.customId)
    setComposer({ mode: 'edit', customId: item.customId })
    setName(record?.name ?? item.label)
    setDescription(record?.description ?? '')
    setError(null)
    if (selected !== item.key) requestSelect(item.key)
  }

  const createService = () => {
    setError(null)
    try {
      const created = createCustomService({ name, description })
      closeComposer()
      selectService(created.name)
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Could not add that service.',
      )
    }
  }

  const saveEditedService = () => {
    if (composer?.mode !== 'edit') return
    setError(null)
    const current = customServices.find((item) => item.id === composer.customId)
    if (!current) return
    try {
      const updated = updateCustomService(composer.customId, {
        name,
        description,
      })
      if (!updated) throw new Error('Could not update that service.')
      if (current.name !== updated.name) {
        renameServiceOnCases(current.name, updated.name)
        renameServiceOnClients(current.name, updated.name)
      }
      closeComposer()
      selectService(updated.name)
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Could not save that service.',
      )
    }
  }

  const requestSelect = (key: string | null) => {
    if (key === selected) return
    if (editorDirty) {
      setPendingSelect(key)
      return
    }
    selectService(key)
  }

  const handleComposerSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (composer?.mode === 'edit') {
      saveEditedService()
      return
    }
    if (editorDirty) {
      setPendingCreate(true)
      return
    }
    createService()
  }

  const confirmDelete = () => {
    if (!pendingDelete) return
    const target = pendingDelete
    if (target.kind === 'custom' && target.customId) {
      deleteCustomService(target.customId)
    } else {
      hideCatalogService(target.key)
    }
    if (selected === target.key) {
      selectService(catalog.find((item) => item.key !== target.key)?.key ?? null)
    }
    if (composer?.mode === 'edit' && composer.customId === target.customId) {
      closeComposer()
    }
    setPendingDelete(null)
  }

  return (
    <>
    <div className="pd-settings-services">
      <aside className="pd-settings-services__catalog">
        <div className="pd-settings-services__catalog-head">
          <span className="pd-settings-services__catalog-title">Catalog</span>
          <Button
            type="button"
            variant={composer?.mode === 'create' ? 'secondary' : 'primary'}
            size="sm"
            onClick={() => {
              if (composer?.mode === 'create') closeComposer()
              else openCreate()
            }}
          >
            <Plus size={14} />
            {composer?.mode === 'create' ? 'Cancel' : 'Add service'}
          </Button>
        </div>

        {composer ? (
          <form className="pd-settings-services__composer" onSubmit={handleComposerSubmit}>
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
              hint={
                isBuiltinService(name.trim())
                  ? 'That name is reserved for a built-in template.'
                  : composer.mode === 'edit'
                    ? 'Renaming updates this service on existing files.'
                    : 'Shown when you add a service to a client.'
              }
            />
            <Textarea
              label="Description"
              name="customServiceDescription"
              rows={2}
              placeholder="What this service covers (optional)"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
            {error ? (
              <p className="pd-settings-form__status pd-settings-form__status--error" role="alert">
                {error}
              </p>
            ) : null}
            <div className="pd-settings-services__composer-actions">
              {composer.mode === 'edit' ? (
                <Button type="button" variant="ghost" size="sm" onClick={closeComposer}>
                  Cancel
                </Button>
              ) : null}
              <Button type="submit" size="sm">
                {composer.mode === 'edit'
                  ? 'Save service'
                  : 'Create and edit checklist'}
              </Button>
            </div>
          </form>
        ) : null}

        {catalog.length === 0 ? (
          <p className="pd-settings-service-empty">
            No services yet. Add a line you sell, then set its journey and
            documents.
          </p>
        ) : (
          <ul className="pd-settings-service-list">
            {catalog.map((item) => (
              <li key={item.key}>
                <div
                  className={cx(
                    'pd-settings-service-item',
                    selected === item.key && 'is-selected',
                  )}
                >
                  <button
                    type="button"
                    className="pd-settings-service-item__select"
                    onClick={() => requestSelect(item.key)}
                    aria-current={selected === item.key ? 'true' : undefined}
                  >
                    <span className="pd-settings-service-item__copy">
                      <span className="pd-settings-service-item__name">
                        {item.label}
                      </span>
                      <span className="pd-settings-service-item__meta">
                        {item.stepCount} steps · {item.documentCount} docs
                        {item.countryCount
                          ? ` · ${item.countryCount} ${
                              item.countryCount === 1 ? 'country' : 'countries'
                            }`
                          : ''}
                      </span>
                    </span>
                    <span className="pd-settings-service-item__tags">
                      <span
                        className={cx(
                          'pd-settings-service-tag',
                          item.kind === 'custom' &&
                            'pd-settings-service-tag--custom',
                        )}
                      >
                        {item.kind === 'custom' ? 'Yours' : 'Built-in'}
                      </span>
                      {item.isCustomized ? (
                        <span className="pd-settings-service-tag pd-settings-service-tag--edited">
                          Edited
                        </span>
                      ) : null}
                    </span>
                  </button>
                  <div className="pd-settings-service-item__actions">
                    <Tooltip
                      content={
                        item.customId
                          ? 'Edit name and description'
                          : 'Edit checklist'
                      }
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={`Edit ${item.label}`}
                        onClick={() => openEdit(item)}
                      >
                        <Pencil size={14} />
                      </Button>
                    </Tooltip>
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
                        onClick={() =>
                          setPendingDelete({
                            key: item.key,
                            label: item.label,
                            kind: item.kind,
                            customId: item.customId,
                          })
                        }
                      >
                        <Trash2 size={14} />
                      </Button>
                    </Tooltip>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {hiddenBuiltins.length > 0 ? (
          <div className="pd-settings-services__hidden">
            <span className="pd-settings-services__hidden-title">Removed</span>
            <ul className="pd-settings-services__hidden-list">
              {hiddenBuiltins.map((option) => (
                <li key={option.value} className="pd-settings-services__hidden-item">
                  <span>{option.label}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      restoreCatalogService(option.value)
                      selectService(option.value)
                    }}
                  >
                    Restore
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </aside>

      <div className="pd-settings-services__editor">
        {selectedItem ? (
          <>
            <div className="pd-settings-services__editor-head">
              <div className="pd-settings-services__editor-copy">
                <h3 className="pd-settings-services__editor-title">
                  {selectedItem.label}
                </h3>
                <p className="pd-settings-services__editor-hint">
                  {selectedItem.description}. New files pick up the checklist
                  you save here. Add a country when that destination needs a
                  different journey or documents.
                </p>
              </div>
              <div className="pd-settings-services__editor-actions">
                {selectedItem.customId ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => openEdit(selectedItem)}
                  >
                    <Pencil size={14} />
                    Edit
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setPendingDelete({
                      key: selectedItem.key,
                      label: selectedItem.label,
                      kind: selectedItem.kind,
                      customId: selectedItem.customId,
                    })
                  }
                >
                  <Trash2 size={14} />
                  Delete
                </Button>
              </div>
            </div>
            <ServiceTemplateEditor
              key={selectedItem.key}
              service={selectedItem.key}
              isCustom={selectedItem.kind === 'custom'}
              onDirtyChange={setEditorDirty}
            />
          </>
        ) : (
          <p className="pd-settings-service-empty pd-settings-service-empty--panel">
            Choose a service to edit its status journey and document checklist.
          </p>
        )}
      </div>
    </div>

      <ConfirmDialog
        open={pendingSelect != null}
        onClose={() => setPendingSelect(null)}
        onConfirm={() => {
          selectService(pendingSelect)
          setPendingSelect(null)
        }}
        title="Discard unsaved changes?"
        description="The checklist you were editing has not been saved."
        confirmLabel="Discard"
        confirmVariant="danger"
      />
      <ConfirmDialog
        open={pendingCreate}
        onClose={() => setPendingCreate(false)}
        onConfirm={() => {
          setPendingCreate(false)
          createService()
        }}
        title="Discard unsaved changes?"
        description="Creating this service will leave the current checklist without saving."
        confirmLabel="Create anyway"
        confirmVariant="danger"
      />
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
