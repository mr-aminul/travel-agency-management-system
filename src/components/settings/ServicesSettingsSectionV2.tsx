import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronRight, Plus, Trash2 } from 'lucide-react'
import { ServiceIconPicker } from '@/components/settings/ServiceIconPicker'
import { SettingsInfo } from '@/components/settings/SettingsInfo'
import { resolveServiceTemplate } from '@/lib/resolveServiceTemplate'
import { isBuiltinService } from '@/types/case'
import {
  chromeHeadClass,
  floatingSheetClass,
  tableShellClass,
} from '@/components/clients/shadcnChrome'
import { Input, Textarea } from '@/components/clients/clientShadcnFields'
import { Badge } from '@/components/shadcn/badge'
import { Button } from '@/components/shadcn/button'
import { ConfirmDialog } from '@/components/shadcn/confirm-dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/shadcn/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shadcn/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/shadcn/tooltip'
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
import { useServiceIconOverrides } from '@/lib/serviceIconOverridesStore'
import { iconForService, type ServiceIconId } from '@/lib/serviceIcons'
import { useServiceTemplates } from '@/lib/serviceTemplatesStore'
import {
  validateOptionalText,
  validateRequiredText,
} from '@/lib/fieldValidation'
import { useTouchedFields } from '@/lib/useTouchedFields'
import {
  serviceCatalogEditorPathV2,
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

export function ServicesSettingsSectionV2({
  title,
  info,
}: {
  title: string
  info: string
}) {
  const navigate = useNavigate()
  const refs = useCatalogServiceRefs()
  useServiceTemplates()
  useServiceIconOverrides()
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
  const [iconId, setIconId] = useState<ServiceIconId | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [composerOpen, setComposerOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)
  const { markAllTouched, showError, blur } = useTouchedFields<
    'name' | 'description'
  >()
  const nameError =
    validateRequiredText(name, 'Service name', 2) ??
    (isBuiltinService(name.trim()) ? 'That name is already used.' : undefined)
  const descriptionError = validateOptionalText(description, 'Description', 500)

  const closeComposer = () => {
    setComposerOpen(false)
    setName('')
    setDescription('')
    setIconId(null)
    setError(null)
  }

  const handleComposerSubmit = (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    markAllTouched(['name', 'description'])
    if (nameError || descriptionError) return
    try {
      const created = createCustomService({ name, description, iconId })
      closeComposer()
      navigate(serviceCatalogEditorPathV2(created.name))
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
            className="h-9 rounded-lg"
            onClick={() => {
              setComposerOpen(true)
              setError(null)
            }}
          >
            <Plus size={14} />
            Add Service
          </Button>
        </div>
      </header>

      <div className="pd-settings-catalog">
        {catalog.length === 0 ? (
          <p className="pd-settings-service-empty">No services yet.</p>
        ) : (
          <div className={tableShellClass}>
          <Table aria-label="Service Catalog V2">
            <TableHeader>
              <TableRow className="hover:bg-transparent border-0">
                <TableHead className={chromeHeadClass}>Service</TableHead>
                <TableHead className={chromeHeadClass}>Checklist</TableHead>
                <TableHead className={chromeHeadClass} aria-label="Actions" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {catalog.map((item) => {
                const href = serviceCatalogEditorPathV2(item.key)
                const Icon = iconForService(item.key)
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
                        <span className="pd-settings-catalog__icon" aria-hidden>
                          <Icon size={15} strokeWidth={2.25} />
                        </span>
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
                          <Badge variant="secondary">Customized</Badge>
                        ) : null}
                        {item.kind === 'custom' ? (
                          <Badge variant="outline">Added</Badge>
                        ) : null}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="pd-settings-catalog__row-actions">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
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
                            </TooltipTrigger>
                            <TooltipContent>
                              {item.kind === 'custom'
                                ? 'Delete This Service'
                                : 'Remove From Catalog'}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
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
          </div>
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
                      navigate(serviceCatalogEditorPathV2(option.value))
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

      <Sheet
        open={composerOpen}
        onOpenChange={(next) => {
          if (!next) closeComposer()
        }}
      >
        <SheetContent className={floatingSheetClass}>
          <SheetHeader className="border-b border-border px-5 py-4 pr-12">
            <SheetTitle className="text-base font-semibold">Add Service</SheetTitle>
          </SheetHeader>
          <form
            className="flex flex-col gap-4 p-5"
            onSubmit={handleComposerSubmit}
          >
            <Input
              label="Service Name"
              name="customServiceName"
              required
              placeholder="e.g. Visa processing"
              value={name}
              autoFocus
              onChange={(event) => {
                setName(event.target.value)
                setError(null)
              }}
              onBlur={blur('name')}
              error={showError('name') ? nameError : undefined}
            />
            <Textarea
              label="Description"
              name="customServiceDescription"
              rows={3}
              placeholder="What this service covers (optional)"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              onBlur={blur('description')}
              error={showError('description') ? descriptionError : undefined}
            />
            <ServiceIconPicker
              value={iconId}
              serviceName={name}
              onChange={setIconId}
            />
            {error ? (
              <p className="m-0 text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" className="h-9 rounded-lg" onClick={closeComposer}>
                Cancel
              </Button>
              <Button type="submit" className="h-9 rounded-lg">
                Create And Edit Checklist
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={pendingDelete != null}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title={
          pendingDelete?.kind === 'custom'
            ? `Delete ${pendingDelete.label}? Existing files stay.`
            : `Remove ${pendingDelete?.label ?? 'this service'}? Existing files stay.`
        }
        confirmLabel={pendingDelete?.kind === 'custom' ? 'Delete' : 'Remove'}
        confirmVariant="danger"
      />
    </>
  )
}
