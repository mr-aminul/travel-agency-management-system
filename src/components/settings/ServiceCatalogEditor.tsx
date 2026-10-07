import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { ServiceIconPicker } from '@/components/settings/ServiceIconPicker'
import { SettingsInfo } from '@/components/settings/SettingsInfo'
import { ServiceTemplateEditor } from '@/components/settings/ServiceTemplateEditor'
import { renameServiceOnCases } from '@/lib/casesStore'
import { renameServiceOnClients } from '@/lib/clientsStore'
import { BackButton, Button, ConfirmDialog, Input, Textarea } from '@/components/ui'
import {
  deleteCustomService,
  updateCustomService,
} from '@/lib/customServicesStore'
import { hideCatalogService } from '@/lib/hiddenServicesStore'
import {
  resolveCatalogEditorService,
  useCatalogServiceRefs,
} from '@/lib/serviceCatalog'
import {
  setServiceIconOverride,
  useServiceIconOverrides,
} from '@/lib/serviceIconOverridesStore'
import {
  iconForService,
  selectedIconIdForService,
  type ServiceIconId,
} from '@/lib/serviceIcons'
import {
  validateOptionalText,
  validateRequiredText,
} from '@/lib/fieldValidation'
import { useTouchedFields } from '@/lib/useTouchedFields'
import {
  serviceCatalogEditorPath,
  serviceCatalogPath,
} from '@/lib/workPaths'

export function ServiceCatalogEditor({
  serviceKey,
  onDirtyChange,
}: {
  serviceKey: string
  onDirtyChange?: (dirty: boolean) => void
}) {
  const navigate = useNavigate()
  useCatalogServiceRefs()
  useServiceIconOverrides()
  const item = resolveCatalogEditorService(serviceKey)
  const [name, setName] = useState(item?.label ?? '')
  const [description, setDescription] = useState(item?.description ?? '')
  const [iconId, setIconId] = useState<ServiceIconId | null>(
    item ? (selectedIconIdForService(item.key) ?? null) : null,
  )
  const [identityError, setIdentityError] = useState<string | null>(null)
  const [identityStatus, setIdentityStatus] = useState<string | null>(null)
  const [templateDirty, setTemplateDirty] = useState(false)
  const [pendingLeave, setPendingLeave] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState(false)
  const { markAllTouched, showError, blur } = useTouchedFields<
    'name' | 'description'
  >()
  const nameError = validateRequiredText(name, 'Service name', 2)
  const descriptionError = validateOptionalText(description, 'Description', 500)

  const savedIconId = item ? (selectedIconIdForService(item.key) ?? null) : null
  const iconDirty = iconId !== savedIconId
  const identityDirty =
    item?.kind === 'custom' &&
    (name.trim() !== (item.label ?? '') ||
      description.trim() !== (item.description ?? '') ||
      iconDirty)
  const builtinIconDirty = item?.kind === 'builtin' && iconDirty
  const dirty = templateDirty || identityDirty || builtinIconDirty

  useEffect(() => {
    onDirtyChange?.(dirty)
  }, [dirty, onDirtyChange])

  useEffect(() => {
    return () => onDirtyChange?.(false)
  }, [onDirtyChange])

  useEffect(() => {
    if (!item) return
    setName(item.label)
    setDescription(item.description)
    setIconId(selectedIconIdForService(item.key) ?? null)
    setIdentityError(null)
    setIdentityStatus(null)
    setTemplateDirty(false)
  }, [item?.key, item?.label, item?.description])

  const requestLeave = (href: string) => {
    if (dirty) {
      setPendingLeave(href)
      return
    }
    navigate(href)
  }

  const saveIdentity = (event: FormEvent) => {
    event.preventDefault()
    if (!item) return
    setIdentityError(null)
    if (item.kind === 'custom') {
      markAllTouched(['name', 'description'])
      if (nameError || descriptionError) return
    }
    try {
      if (item.kind === 'custom' && item.customId) {
        const updated = updateCustomService(item.customId, {
          name,
          description,
          iconId,
        })
        if (!updated) throw new Error('Could not save that service.')
        if (item.key !== updated.name) {
          renameServiceOnCases(item.key, updated.name)
          renameServiceOnClients(item.key, updated.name)
        }
        setIdentityStatus('Service details saved.')
        if (item.key !== updated.name) {
          navigate(serviceCatalogEditorPath(updated.name), { replace: true })
        }
        return
      }
      setServiceIconOverride(item.key, iconId)
      setIdentityStatus('Icon saved.')
    } catch (caught) {
      setIdentityError(
        caught instanceof Error ? caught.message : 'Could not save that service.',
      )
    }
  }

  const confirmDelete = () => {
    if (!item) return
    if (item.kind === 'custom' && item.customId) {
      deleteCustomService(item.customId)
    } else {
      hideCatalogService(item.key)
    }
    setPendingDelete(false)
    onDirtyChange?.(false)
    navigate(serviceCatalogPath())
  }

  if (!item) {
    return (
      <div className="pd-settings-catalog-editor">
        <h2 id="settings-panel-title" className="pd-settings-catalog-editor__title">
          Service catalog
        </h2>
        <p className="pd-settings-service-empty">
          That service is not in the catalog.
        </p>
        <BackButton to={serviceCatalogPath()} label="Catalog" />
      </div>
    )
  }

  const TitleIcon = iconForService(item.key)

  return (
    <>
      <div className="pd-settings-catalog-editor">
        <header className="pd-settings-catalog-editor__head">
          <BackButton
            label="Catalog"
            onClick={() => requestLeave(serviceCatalogPath())}
          />
          <div className="pd-settings-catalog-editor__title-row">
            <span className="pd-settings-catalog-editor__title-icon" aria-hidden>
              <TitleIcon size={18} strokeWidth={2.25} />
            </span>
            <h2
              id="settings-panel-title"
              className="pd-settings-catalog-editor__title"
            >
              {item.label}
            </h2>
            <SettingsInfo
              title={item.label}
              body={
                item.kind === 'custom' && item.description
                  ? `${item.description}. New files pick up the checklist you save here. Add a country when that destination needs a different journey or documents.`
                  : 'New files pick up the checklist you save here. Add a country when that destination needs a different journey or documents.'
              }
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setPendingDelete(true)}
          >
            <Trash2 size={14} />
            {item.kind === 'custom' ? 'Delete' : 'Remove'}
          </Button>
        </header>

        <form
          className="pd-settings-catalog__composer"
          onSubmit={saveIdentity}
        >
          {item.kind === 'custom' ? (
            <>
              <Input
                label="Service name"
                name="customServiceName"
                required
                value={name}
                onChange={(event) => {
                  setName(event.target.value)
                  setIdentityError(null)
                  setIdentityStatus(null)
                }}
                onBlur={blur('name')}
                error={showError('name') ? nameError : undefined}
              />
              <Textarea
                label="Description"
                name="customServiceDescription"
                rows={2}
                value={description}
                onChange={(event) => {
                  setDescription(event.target.value)
                  setIdentityError(null)
                  setIdentityStatus(null)
                }}
                onBlur={blur('description')}
                error={showError('description') ? descriptionError : undefined}
              />
            </>
          ) : null}
          <ServiceIconPicker
            value={iconId}
            serviceName={item.kind === 'custom' ? name : item.label}
            onChange={(next) => {
              setIconId(next)
              setIdentityError(null)
              setIdentityStatus(null)
            }}
          />
          <div className="pd-settings-catalog__composer-actions">
            <p
              className={[
                'pd-settings-form__status',
                identityError && 'pd-settings-form__status--error',
              ]
                .filter(Boolean)
                .join(' ')}
              role={identityError ? 'alert' : undefined}
            >
              {identityError ?? identityStatus ?? ''}
            </p>
            <Button
              type="submit"
              size="sm"
              disabled={!(identityDirty || builtinIconDirty)}
            >
              {item.kind === 'custom' ? 'Save details' : 'Save icon'}
            </Button>
          </div>
        </form>

        <ServiceTemplateEditor
          key={item.key}
          service={item.key}
          isCustom={item.kind === 'custom'}
          onDirtyChange={setTemplateDirty}
        />
      </div>

      <ConfirmDialog
        open={pendingLeave != null}
        onClose={() => setPendingLeave(null)}
        onConfirm={() => {
          const href = pendingLeave
          setPendingLeave(null)
          onDirtyChange?.(false)
          if (href) navigate(href)
        }}
        title="Discard unsaved changes?"
        description="The checklist or name you were editing has not been saved."
        confirmLabel="Discard"
        confirmVariant="danger"
      />
      <ConfirmDialog
        open={pendingDelete}
        onClose={() => setPendingDelete(false)}
        onConfirm={confirmDelete}
        title={
          item.kind === 'custom'
            ? `Delete ${item.label}?`
            : `Remove ${item.label}?`
        }
        description={
          item.kind === 'custom'
            ? 'New files will no longer offer it. Existing files stay.'
            : 'Hide it from new files. Existing files stay, and you can restore it later.'
        }
        confirmLabel={item.kind === 'custom' ? 'Delete' : 'Remove'}
        confirmVariant="danger"
      />
    </>
  )
}
