import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import { DocumentFieldsEditor } from '@/components/settings/DocumentFieldsEditor'
import { StepAutoNotifyEditor } from '@/components/settings/StepAutoNotifyEditor'
import { StepBranchRulesEditor } from '@/components/settings/StepBranchRulesEditor'
import {
  BranchConditionDialog,
  type PendingBranch,
} from '@/components/settings/flow/BranchConditionDialog'
import { ServiceFlowCanvas } from '@/components/settings/flow/ServiceFlowCanvas'
import {
  Button,
  Checkbox,
  ConfirmDialog,
  Input,
  Select,
  Switch,
} from '@/components/ui'
import { cx } from '@/lib/cx'
import {
  getDefaultDocumentForm,
  getEditableDocumentFields,
} from '@/lib/caseDocumentForms'
import {
  destinationCountryOptions,
  formatCountryLabel,
  normalizeCountryName,
} from '@/lib/destinationCountries'
import {
  clearDocumentFormOverride,
  documentFieldsEqual,
  saveDocumentFormOverride,
} from '@/lib/documentFormFieldsStore'
import { sameFlowSelection } from '@/lib/flowSelection'
import {
  pruneBranchRulesForFields,
  upsertBranchRule,
} from '@/lib/serviceBranchFields'
import type { FlowSelection } from '@/lib/serviceFlowGraph'
import { resolveServiceTemplate } from '@/lib/resolveServiceTemplate'
import {
  deleteServiceTemplate,
  listServiceCountries,
  nextTemplateItemId,
  saveServiceTemplate,
  useServiceTemplates,
} from '@/lib/serviceTemplatesStore'
import {
  assignDocumentToStep,
  toggleStepRequiredDocument,
} from '@/lib/stepDocumentLinks'
import type { ServiceType } from '@/types/case'
import type { DocumentFormFieldDraft } from '@/types/documentFormField'
import type {
  ServiceStepAutoNotify,
  ServiceStepBranchRule,
} from '@/types/serviceTemplate'

const ALL_COUNTRIES = ''

function draftFrom(service: ServiceType, country: string) {
  const resolved = resolveServiceTemplate(service, country)
  const documents = resolved.documents.map((doc) => ({ ...doc }))
  const fieldsByDocId: Record<string, DocumentFormFieldDraft[]> = {}
  for (const doc of documents) {
    fieldsByDocId[doc.id] = getEditableDocumentFields(doc.id).map((field) => ({
      ...field,
    }))
  }
  return {
    steps: resolved.steps.map((step) => ({ ...step })),
    documents,
    fieldsByDocId,
  }
}

function cloneFieldsMap(
  map: Record<string, DocumentFormFieldDraft[]>,
): Record<string, DocumentFormFieldDraft[]> {
  const next: Record<string, DocumentFormFieldDraft[]> = {}
  for (const [id, fields] of Object.entries(map)) {
    next[id] = fields.map((field) => ({ ...field }))
  }
  return next
}

export function ServiceFlowEditorV2({
  service,
  isCustom,
  onDirtyChange,
  leading,
  trailing,
}: {
  service: ServiceType
  isCustom?: boolean
  onDirtyChange?: (dirty: boolean) => void
  leading?: ReactNode
  trailing?: ReactNode
}) {
  useServiceTemplates()
  const countries = listServiceCountries(service)
  const [country, setCountry] = useState(ALL_COUNTRIES)
  const [newCountry, setNewCountry] = useState('')
  const [adding, setAdding] = useState(false)
  const initial = useMemo(
    () => draftFrom(service, country),
    [service, country],
  )
  const [steps, setSteps] = useState(initial.steps)
  const [documents, setDocuments] = useState(initial.documents)
  const [fieldsByDocId, setFieldsByDocId] = useState(() =>
    cloneFieldsMap(initial.fieldsByDocId),
  )
  const [selection, setSelectionState] = useState<FlowSelection | null>(null)
  const setSelection = (next: FlowSelection | null) => {
    setSelectionState((current) =>
      sameFlowSelection(current, next) ? current : next,
    )
  }
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [pendingCountry, setPendingCountry] = useState<string | null>(null)
  const [removeCountry, setRemoveCountry] = useState<string | null>(null)
  const [pendingBranch, setPendingBranch] = useState<PendingBranch | null>(null)

  useEffect(() => {
    setCountry(ALL_COUNTRIES)
  }, [service])

  useEffect(() => {
    const next = draftFrom(service, country)
    setSteps(next.steps)
    setDocuments(next.documents)
    setFieldsByDocId(cloneFieldsMap(next.fieldsByDocId))
    setSelection(null)
    setDirty(false)
    setError(null)
  }, [service, country])

  useEffect(() => {
    onDirtyChange?.(dirty)
  }, [dirty, onDirtyChange])

  const markDirty = () => {
    setDirty(true)
    setError(null)
    setStatus(null)
  }

  const selectCountry = (next: string) => {
    if (next === country) return
    if (dirty) {
      setPendingCountry(next)
      return
    }
    setCountry(next)
    setStatus(null)
  }

  const addStepAt = (index: number) => {
    const id = nextTemplateItemId(
      `step ${steps.length + 1}`,
      steps.map((step) => step.id),
    )
    const clamped = Math.max(0, Math.min(index, steps.length))
    setSteps((current) => {
      const next = [...current]
      next.splice(clamped, 0, { id, label: '', requiredDocumentIds: [] })
      return next
    })
    setSelection({ kind: 'step', stepId: id })
    markDirty()
  }

  const addDocument = (attachToStepId?: string) => {
    const id = nextTemplateItemId(
      `document ${documents.length + 1}`,
      documents.map((doc) => doc.id),
    )
    const fields = getDefaultDocumentForm(id).fields.map((field) => ({
      ...field,
    }))
    setDocuments((current) => [
      ...current,
      {
        id,
        name: '',
        required: true,
        ...(attachToStepId ? { unlockStepId: attachToStepId } : {}),
      },
    ])
    setFieldsByDocId((current) => ({ ...current, [id]: fields }))
    if (attachToStepId) {
      setSteps((current) => assignDocumentToStep(current, attachToStepId, id))
    }
    setSelection({ kind: 'document', documentId: id })
    markDirty()
  }

  const setStepNeedsDoc = (stepId: string, documentId: string) => {
    setSteps((current) => toggleStepRequiredDocument(current, stepId, documentId))
    markDirty()
  }

  const requestBranch = (fromStepId: string, toStepId: string) => {
    if (fromStepId === toStepId) return
    setPendingBranch({ fromStepId, toStepId })
  }

  const applyBranchRule = (
    fromStepId: string,
    rule: ServiceStepBranchRule,
  ) => {
    setSteps((current) =>
      current.map((step) => {
        if (step.id !== fromStepId) return step
        return {
          ...step,
          branchRules: upsertBranchRule(step.branchRules, rule),
        }
      }),
    )
    setSelection({ kind: 'step', stepId: fromStepId })
    markDirty()
    setStatus('Branch wired.')
  }

  const confirmBranch = (rule: ServiceStepBranchRule) => {
    if (!pendingBranch) return
    const fromStepId = pendingBranch.fromStepId
    setPendingBranch(null)
    applyBranchRule(fromStepId, rule)
  }

  const wireBranchFromTip = (
    fromStepId: string,
    rule: ServiceStepBranchRule,
  ) => {
    applyBranchRule(fromStepId, rule)
  }

  const handleSave = () => {
    setError(null)
    setStatus(null)
    try {
      for (const doc of documents) {
        const fields = fieldsByDocId[doc.id] ?? []
        const defaults = getDefaultDocumentForm(doc.id).fields
        if (documentFieldsEqual(fields, defaults)) {
          clearDocumentFormOverride(doc.id)
        } else {
          saveDocumentFormOverride(doc.id, fields)
        }
      }
      saveServiceTemplate({
        serviceName: service,
        country,
        steps,
        documents,
      })
      setDirty(false)
      setStatus(
        country
          ? `Saved. New ${country} files use this flow.`
          : 'Saved. New files without a country match use this flow.',
      )
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save.')
    }
  }

  const applyReset = () => {
    deleteServiceTemplate(service, country)
    const fallback = draftFrom(service, country)
    setSteps(fallback.steps)
    setDocuments(fallback.documents)
    setFieldsByDocId(cloneFieldsMap(fallback.fieldsByDocId))
    setSelection(null)
    setError(null)
    setDirty(false)
    setResetOpen(false)
    if (country) {
      setCountry(ALL_COUNTRIES)
      setStatus(
        `Removed the ${country} variation. Those files now use the all-countries flow.`,
      )
    } else {
      setStatus(
        isCustom
          ? 'Restored the generic custom-service flow.'
          : 'Restored the default flow.',
      )
    }
  }

  const addCountryVariation = () => {
    const name = normalizeCountryName(newCountry)
    if (!name) {
      setError('Enter a country name.')
      return
    }
    if (countries.some((item) => item.toLowerCase() === name.toLowerCase())) {
      setAdding(false)
      setNewCountry('')
      selectCountry(name)
      return
    }
    const base = draftFrom(service, ALL_COUNTRIES)
    saveServiceTemplate({
      serviceName: service,
      country: name,
      steps: base.steps,
      documents: base.documents,
    })
    setAdding(false)
    setNewCountry('')
    setCountry(name)
    setDirty(false)
    setError(null)
    setStatus(
      `Copied the all-countries flow for ${name}. Edit the canvas, then save.`,
    )
  }

  const confirmRemoveCountry = () => {
    if (!removeCountry) return
    deleteServiceTemplate(service, removeCountry)
    if (country === removeCountry) setCountry(ALL_COUNTRIES)
    setRemoveCountry(null)
    setDirty(false)
    setStatus(`Removed the ${removeCountry} variation.`)
  }

  const countryOptions = destinationCountryOptions(countries).filter(
    (option) =>
      !countries.some((item) => item.toLowerCase() === option.value.toLowerCase()),
  )

  const selectedStep =
    selection?.kind === 'step'
      ? steps.find((step) => step.id === selection.stepId)
      : undefined
  const selectedDocument =
    selection?.kind === 'document'
      ? documents.find((doc) => doc.id === selection.documentId)
      : undefined

  const countrySelectOptions = [
    { value: ALL_COUNTRIES, label: 'All countries' },
    ...countries.map((item) => ({
      value: item,
      label: formatCountryLabel(item),
    })),
  ]

  return (
    <div className="pd-service-flow" aria-label="Service flow canvas">
      <div className="pd-service-flow__topbar">
        <div className="pd-service-flow__topbar-left">
          {leading ? (
            <div className="pd-service-flow__identity">{leading}</div>
          ) : null}
          <div className="pd-service-flow__country">
            <Select
              aria-label="Country variation"
              className="pd-service-flow__country-select"
              value={country}
              options={countrySelectOptions}
              onChange={(event) => selectCountry(event.target.value)}
            />
            {adding ? (
              <div className="pd-service-flow__add-country">
                <Select
                  aria-label="New country"
                  searchable
                  searchPlaceholder="Search countries…"
                  placeholder="Choose a country"
                  value={
                    countryOptions.some((option) => option.value === newCountry)
                      ? newCountry
                      : ''
                  }
                  options={countryOptions}
                  onChange={(event) => {
                    setNewCountry(event.target.value)
                    setError(null)
                  }}
                />
                <Button type="button" size="sm" onClick={addCountryVariation}>
                  Add
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setAdding(false)
                    setNewCountry('')
                    setError(null)
                  }}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setAdding(true)}
              >
                <Plus size={14} />
                Country
              </Button>
            )}
            {country ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`Remove ${country}`}
                onClick={() => setRemoveCountry(country)}
              >
                <Trash2 size={14} />
              </Button>
            ) : null}
          </div>
        </div>

        <div className="pd-service-flow__actions">
          {dirty ? (
            <span className="pd-service-flow__dirty" aria-live="polite">
              Unsaved
            </span>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setResetOpen(true)}
          >
            Reset
          </Button>
          <Button type="button" size="sm" onClick={handleSave} disabled={!dirty}>
            Save
          </Button>
          {trailing}
        </div>
      </div>

      {(error || status) && (
        <p
          className={cx(
            'pd-settings-form__status pd-service-flow__status',
            error && 'pd-settings-form__status--error',
          )}
          role={error ? 'alert' : undefined}
        >
          {error ?? status}
        </p>
      )}

      <div className="pd-service-flow__workspace">
        <div className="pd-service-flow__body">
          <ServiceFlowCanvas
            steps={steps}
            documents={documents}
            fieldsByDocId={fieldsByDocId}
            selection={selection}
            onSelect={setSelection}
            onConnectSteps={requestBranch}
            onWireBranch={wireBranchFromTip}
            onAddDocumentToStep={(stepId) => addDocument(stepId)}
            onAddStepAt={addStepAt}
          />
        </div>

        {selectedStep || selectedDocument ? (
        <aside className="pd-service-flow__inspector" aria-label="Flow inspector">
          {selectedStep ? (
            <div className="pd-service-flow__inspector-block">
              <div className="pd-service-flow__inspector-head">
                <h3 className="pd-service-flow__inspector-title">Status step</h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove ${selectedStep.label || 'step'}`}
                  onClick={() => {
                    const stepId = selectedStep.id
                    setSteps((current) =>
                      current
                        .filter((item) => item.id !== stepId)
                        .map((item) => ({
                          ...item,
                          branchRules: item.branchRules?.filter(
                            (rule) => rule.nextStepId !== stepId,
                          ),
                        })),
                    )
                    setSelection(null)
                    markDirty()
                  }}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
              <Input
                label="Step name"
                value={selectedStep.label}
                placeholder="e.g. Medical"
                onChange={(event) => {
                  const label = event.target.value
                  setSteps((current) =>
                    current.map((item) =>
                      item.id === selectedStep.id ? { ...item, label } : item,
                    ),
                  )
                  markDirty()
                }}
              />
              <div className="pd-service-flow__inspector-section">
                <StepAutoNotifyEditor
                  stepLabel={selectedStep.label}
                  value={selectedStep.autoNotify}
                  onChange={(autoNotify: ServiceStepAutoNotify | undefined) => {
                    setSteps((current) =>
                      current.map((item) =>
                        item.id === selectedStep.id
                          ? { ...item, autoNotify }
                          : item,
                      ),
                    )
                    markDirty()
                  }}
                />
              </div>
              <div className="pd-service-flow__inspector-section">
                <span className="pd-settings-template__needs-label">
                  Needs documents
                </span>
                <div className="pd-settings-template__needs-chips">
                  {(selectedStep.requiredDocumentIds ?? []).map((docId) => {
                    const doc = documents.find((item) => item.id === docId)
                    if (!doc) return null
                    return (
                      <button
                        key={doc.id}
                        type="button"
                        className="pd-settings-template__needs-chip"
                        onClick={() => setStepNeedsDoc(selectedStep.id, doc.id)}
                      >
                        <span>{doc.name || 'Untitled'}</span>
                        <X size={12} aria-hidden />
                      </button>
                    )
                  })}
                </div>
                {documents.length === 0 ? (
                  <p className="pd-service-flow__inspector-copy">
                    Add a document on the step, then tick it here so it nests
                    inside this stage.
                  </p>
                ) : (
                  <div
                    className="pd-service-flow__doc-pick"
                    role="group"
                    aria-label="Needs documents"
                  >
                    {documents.map((doc) => {
                      const checked = (
                        selectedStep.requiredDocumentIds ?? []
                      ).includes(doc.id)
                      return (
                        <Checkbox
                          key={doc.id}
                          label={doc.name || 'Untitled'}
                          checked={checked}
                          onChange={() =>
                            setStepNeedsDoc(selectedStep.id, doc.id)
                          }
                        />
                      )
                    })}
                  </div>
                )}
              </div>
              <div className="pd-service-flow__inspector-section">
                <StepBranchRulesEditor
                  step={selectedStep}
                  steps={steps}
                  documents={documents}
                  fieldsByDocId={fieldsByDocId}
                  onChange={(branchRules: ServiceStepBranchRule[]) => {
                    setSteps((current) =>
                      current.map((item) =>
                        item.id === selectedStep.id
                          ? {
                              ...item,
                              branchRules: branchRules.length
                                ? branchRules
                                : undefined,
                            }
                          : item,
                      ),
                    )
                    markDirty()
                  }}
                />
              </div>
            </div>
          ) : null}

          {selectedDocument ? (
            <div className="pd-service-flow__inspector-block pd-service-flow__inspector-block--document">
              <div className="pd-service-flow__inspector-head">
                <h3 className="pd-service-flow__inspector-title">Document</h3>
                <div className="pd-service-flow__inspector-head-actions">
                  <Switch
                    className="pd-service-flow__doc-required"
                    label="Required"
                    checked={selectedDocument.required}
                    onChange={(event) => {
                      const required = event.target.checked
                      setDocuments((current) =>
                        current.map((item) =>
                          item.id === selectedDocument.id
                            ? { ...item, required }
                            : item,
                        ),
                      )
                      markDirty()
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`Remove ${selectedDocument.name || 'document'}`}
                    onClick={() => {
                      const documentId = selectedDocument.id
                      setDocuments((current) =>
                        current.filter((item) => item.id !== documentId),
                      )
                      setSteps((current) =>
                        current.map((step) => ({
                          ...step,
                          requiredDocumentIds: (
                            step.requiredDocumentIds ?? []
                          ).filter((id) => id !== documentId),
                          branchRules: step.branchRules
                            ?.filter((rule) => rule.documentId !== documentId)
                            .map((rule) => rule),
                        })),
                      )
                      setFieldsByDocId((current) => {
                        const next = { ...current }
                        delete next[documentId]
                        return next
                      })
                      setSelection(null)
                      markDirty()
                    }}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
              <Input
                aria-label="Document name"
                value={selectedDocument.name}
                placeholder="Document name"
                onChange={(event) => {
                  const name = event.target.value
                  setDocuments((current) =>
                    current.map((item) =>
                      item.id === selectedDocument.id
                        ? { ...item, name }
                        : item,
                    ),
                  )
                  markDirty()
                }}
              />
              <DocumentFieldsEditor
                variant="compact"
                documentId={selectedDocument.id}
                fields={fieldsByDocId[selectedDocument.id] ?? []}
                onChange={(fields) => {
                  const documentId = selectedDocument.id
                  const nextFields = {
                    ...fieldsByDocId,
                    [documentId]: fields,
                  }
                  setFieldsByDocId(nextFields)
                  setSteps((currentSteps) =>
                    pruneBranchRulesForFields(
                      currentSteps,
                      documents,
                      nextFields,
                    ),
                  )
                  const owner = steps.find((step) =>
                    (step.requiredDocumentIds ?? []).includes(documentId),
                  )
                  if (
                    owner &&
                    fields.some((field) => field.type === 'select')
                  ) {
                    setSelection({ kind: 'step', stepId: owner.id })
                    setStatus(
                      'Dropdown choices are listed under Branch. Wire each next step.',
                    )
                  }
                  markDirty()
                }}
              />
            </div>
          ) : null}
        </aside>
        ) : null}
      </div>

      <BranchConditionDialog
        open={pendingBranch != null}
        pending={pendingBranch}
        steps={steps}
        documents={documents}
        fieldsByDocId={fieldsByDocId}
        onClose={() => setPendingBranch(null)}
        onConfirm={confirmBranch}
      />

      <ConfirmDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={applyReset}
        title={country ? `Reset ${country} flow?` : 'Reset this flow?'}
        description={
          country
            ? 'Removes this country variation so files use All countries again.'
            : isCustom
              ? 'Restores the generic custom-service checklist.'
              : 'Restores the default checklist for this service.'
        }
        confirmLabel="Reset"
        confirmVariant="danger"
      />
      <ConfirmDialog
        open={pendingCountry != null}
        onClose={() => setPendingCountry(null)}
        onConfirm={() => {
          const next = pendingCountry
          setPendingCountry(null)
          setDirty(false)
          if (next != null) setCountry(next)
        }}
        title="Discard unsaved changes?"
        description="Switching country will drop edits you have not saved."
        confirmLabel="Discard"
        confirmVariant="danger"
      />
      <ConfirmDialog
        open={removeCountry != null}
        onClose={() => setRemoveCountry(null)}
        onConfirm={confirmRemoveCountry}
        title={`Remove ${removeCountry ?? 'this country'}?`}
        description="Files for that destination will use the All countries flow."
        confirmLabel="Remove"
        confirmVariant="danger"
      />
    </div>
  )
}
