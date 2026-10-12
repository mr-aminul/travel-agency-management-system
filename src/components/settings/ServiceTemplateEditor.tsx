import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Mail, MessageSquare, Plus, Trash2 } from 'lucide-react'
import { DocumentFieldsEditor } from '@/components/settings/DocumentFieldsEditor'
import { SettingsInfo } from '@/components/settings/SettingsInfo'
import {
  compactStepAutoNotify,
  StepAutoNotifyEditor,
} from '@/components/settings/StepAutoNotifyEditor'
import { StepBranchRulesEditor } from '@/components/settings/StepBranchRulesEditor'
import { cx } from '@/lib/cx'
import {
  Button,
  Checkbox,
  ConfirmDialog,
  Input,
  Select,
  Switch,
} from '@/components/ui'
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
import {
  deleteServiceTemplate,
  listServiceCountries,
  nextTemplateItemId,
  saveServiceTemplate,
  useServiceTemplates,
} from '@/lib/serviceTemplatesStore'
import { resolveServiceTemplate } from '@/lib/resolveServiceTemplate'
import { pruneBranchRulesForFields } from '@/lib/serviceBranchFields'
import { toggleStepRequiredDocument } from '@/lib/stepDocumentLinks'
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

export function ServiceTemplateEditor({
  service,
  isCustom,
  onDirtyChange,
}: {
  service: ServiceType
  isCustom?: boolean
  onDirtyChange?: (dirty: boolean) => void
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
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null)
  const [selectedStepId, setSelectedStepId] = useState<string | null>(
    initial.steps[0]?.id ?? null,
  )
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [pendingCountry, setPendingCountry] = useState<string | null>(null)
  const [removeCountry, setRemoveCountry] = useState<string | null>(null)

  useEffect(() => {
    setCountry(ALL_COUNTRIES)
  }, [service])

  useEffect(() => {
    const next = draftFrom(service, country)
    setSteps(next.steps)
    setDocuments(next.documents)
    setFieldsByDocId(cloneFieldsMap(next.fieldsByDocId))
    setExpandedDocId(null)
    setSelectedStepId(next.steps[0]?.id ?? null)
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

  const addStep = () => {
    const id = nextTemplateItemId(
      `step ${steps.length + 1}`,
      steps.map((s) => s.id),
    )
    setSteps((current) => [
      ...current,
      {
        id,
        label: '',
        requiredDocumentIds: [],
      },
    ])
    setSelectedStepId(id)
    markDirty()
  }

  const setStepNeedsDoc = (stepId: string, documentId: string) => {
    setSteps((current) => toggleStepRequiredDocument(current, stepId, documentId))
    markDirty()
  }

  const addDocument = () => {
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
      },
    ])
    setFieldsByDocId((current) => ({ ...current, [id]: fields }))
    setExpandedDocId(id)
    markDirty()
  }

  const setDocumentFields = (
    documentId: string,
    fields: DocumentFormFieldDraft[],
  ) => {
    const nextFields = { ...fieldsByDocId, [documentId]: fields }
    setFieldsByDocId(nextFields)
    setSteps((currentSteps) =>
      pruneBranchRulesForFields(currentSteps, documents, nextFields),
    )
    markDirty()
  }

  const moveStep = (index: number, direction: -1 | 1) => {
    setSteps((current) => {
      const target = index + direction
      if (target < 0 || target >= current.length) return current
      const next = [...current]
      const [moved] = next.splice(index, 1)
      next.splice(target, 0, moved)
      return next
    })
    markDirty()
  }

  const removeStep = (stepId: string) => {
    const next = steps
      .filter((item) => item.id !== stepId)
      .map((item) => ({
        ...item,
        branchRules: item.branchRules?.filter(
          (rule) => rule.nextStepId !== stepId,
        ),
      }))
    setSteps(next)
    if (selectedStepId === stepId) {
      setSelectedStepId(next[0]?.id ?? null)
    }
    markDirty()
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
          ? `Saved. New ${country} files use this checklist and fields.`
          : 'Saved. New files without a country match use this checklist and fields.',
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
    setExpandedDocId(null)
    setSelectedStepId(fallback.steps[0]?.id ?? null)
    setError(null)
    setDirty(false)
    setResetOpen(false)
    if (country) {
      setCountry(ALL_COUNTRIES)
      setStatus(
        `Removed the ${country} variation. Those files now use the all-countries checklist.`,
      )
    } else {
      setStatus(
        isCustom
          ? 'Restored the generic custom-service checklist.'
          : 'Restored the default checklist.',
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
      `Copied the all-countries checklist for ${name}. Edit the steps or documents, then save.`,
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
    steps.find((step) => step.id === selectedStepId) ?? steps[0] ?? null
  const selectedIndex = selectedStep
    ? steps.findIndex((step) => step.id === selectedStep.id)
    : -1
  const needed = selectedStep?.requiredDocumentIds ?? []

  return (
    <div className="pd-settings-template">
      <div className="pd-settings-template__countries">
        <div className="pd-settings-template__country-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={country === ALL_COUNTRIES}
            className={cx(
              'pd-settings-template__country',
              country === ALL_COUNTRIES && 'is-active',
            )}
            onClick={() => selectCountry(ALL_COUNTRIES)}
          >
            All countries
          </button>
          {countries.map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={country === item}
              className={cx(
                'pd-settings-template__country',
                country === item && 'is-active',
              )}
              onClick={() => selectCountry(item)}
            >
              {formatCountryLabel(item)}
            </button>
          ))}
        </div>
        <SettingsInfo
          title={country ? formatCountryLabel(country) : 'All countries'}
          body={
            country
              ? `This journey and document list apply when a file’s destination is ${country}. Other countries use All countries.`
              : 'Used when a file has no matching country variation.'
          }
        />
        {adding ? (
          <div className="pd-settings-template__add-country">
            <Select
              label="Country"
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
            <Input
              label="Or type a country"
              placeholder="e.g. Kenya"
              value={newCountry}
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
      </div>

      <div className="pd-settings-template__panes">
        <div className="pd-settings-template__block pd-settings-template__block--journey">
          <div className="pd-settings-template__head">
            <div>
              <span className="pd-settings-template__label">
                Status journey
                <span className="pd-settings-template__tab-count">
                  {steps.length}
                </span>
                <SettingsInfo
                  title="Status journey"
                  body="Staff move a file through these steps. Needs docs must be filed before that status can complete. Add dropdown fields on documents, then branch Next step rules (e.g. Fit → Visa, Unfit → Re-medical)."
                />
              </span>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={addStep}>
              <Plus size={14} /> Add
            </Button>
          </div>

          {steps.length === 0 ? (
            <p className="pd-settings-service-empty">
              Add at least one status step before saving.
            </p>
          ) : (
            <div className="pd-settings-template__journey-split">
              <ol
                className="pd-settings-template__step-rail"
                aria-label="Status journey"
              >
                {steps.map((step, index) => {
                  const selected = selectedStep?.id === step.id
                  const smsOn = step.autoNotify?.sms === true
                  const emailOn = step.autoNotify?.email === true
                  const toggleNotify = (
                    channel: 'sms' | 'email',
                    nextOn: boolean,
                  ) => {
                    setSelectedStepId(step.id)
                    setSteps((current) =>
                      current.map((item) => {
                        if (item.id !== step.id) return item
                        return {
                          ...item,
                          autoNotify: compactStepAutoNotify({
                            sms: item.autoNotify?.sms,
                            email: item.autoNotify?.email,
                            smsTemplateId: item.autoNotify?.smsTemplateId,
                            emailTemplateId: item.autoNotify?.emailTemplateId,
                            [channel]: nextOn,
                          }),
                        }
                      }),
                    )
                    markDirty()
                  }
                  return (
                    <li key={step.id}>
                      <div
                        className={cx(
                          'pd-settings-template__step-rail-row',
                          selected && 'is-selected',
                        )}
                      >
                        <div className="pd-settings-template__step-rail-main">
                          <button
                            type="button"
                            className="pd-settings-template__step-rail-select"
                            aria-current={selected ? 'step' : undefined}
                            onClick={() => setSelectedStepId(step.id)}
                          >
                            <span
                              className="pd-settings-template__step-rail-num"
                              aria-hidden
                            >
                              {index + 1}
                            </span>
                            <span className="pd-settings-template__step-rail-name">
                              {step.label || 'Untitled'}
                            </span>
                          </button>
                          <span
                            className="pd-settings-template__step-rail-notify"
                            role="group"
                            aria-label={`Auto send for ${step.label || 'status'}`}
                          >
                            <button
                              type="button"
                              className={cx(
                                'pd-settings-template__step-rail-notify-btn',
                                smsOn && 'is-on',
                              )}
                              aria-pressed={smsOn}
                              title="Auto SMS when file reaches this status"
                              onClick={() => toggleNotify('sms', !smsOn)}
                            >
                              <MessageSquare size={11} strokeWidth={2.25} />
                              SMS
                            </button>
                            <button
                              type="button"
                              className={cx(
                                'pd-settings-template__step-rail-notify-btn',
                                emailOn && 'is-on',
                              )}
                              aria-pressed={emailOn}
                              title="Auto email when file reaches this status"
                              onClick={() => toggleNotify('email', !emailOn)}
                            >
                              <Mail size={11} strokeWidth={2.25} />
                              Email
                            </button>
                          </span>
                        </div>
                        <span className="pd-settings-template__step-rail-actions">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-label="Move step up"
                            disabled={index === 0}
                            onClick={() => moveStep(index, -1)}
                          >
                            <ChevronUp size={14} />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-label="Move step down"
                            disabled={index === steps.length - 1}
                            onClick={() => moveStep(index, 1)}
                          >
                            <ChevronDown size={14} />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-label={`Remove ${step.label || 'step'}`}
                            onClick={() => removeStep(step.id)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ol>

              {selectedStep ? (
                <div className="pd-settings-template__step-panel">
                  <Input
                    label="Step name"
                    aria-label={`Step ${selectedIndex + 1}`}
                    placeholder="e.g. Medical"
                    value={selectedStep.label}
                    onChange={(event) => {
                      const label = event.target.value
                      const id = selectedStep.id
                      setSteps((current) =>
                        current.map((item) =>
                          item.id === id ? { ...item, label } : item,
                        ),
                      )
                      markDirty()
                    }}
                  />

                  <StepAutoNotifyEditor
                    stepLabel={selectedStep.label}
                    value={selectedStep.autoNotify}
                    onChange={(autoNotify: ServiceStepAutoNotify | undefined) => {
                      const id = selectedStep.id
                      setSteps((current) =>
                        current.map((item) =>
                          item.id === id
                            ? {
                                ...item,
                                autoNotify,
                              }
                            : item,
                        ),
                      )
                      markDirty()
                    }}
                  />

                  <section className="pd-settings-template__panel-section">
                    <span className="pd-settings-template__panel-label">
                      Needs docs
                    </span>
                    {documents.length === 0 ? (
                      <p className="pd-settings-template__needs-empty">
                        Add documents first
                      </p>
                    ) : (
                      <div
                        className="pd-settings-template__needs-checks"
                        role="group"
                        aria-label={`Needs docs for ${selectedStep.label || `step ${selectedIndex + 1}`}`}
                      >
                        {documents.map((doc) => {
                          const checked = needed.includes(doc.id)
                          const ownedElsewhere = steps.some(
                            (other) =>
                              other.id !== selectedStep.id &&
                              (other.requiredDocumentIds ?? []).includes(doc.id),
                          )
                          return (
                            <Checkbox
                              key={doc.id}
                              label={
                                ownedElsewhere && !checked
                                  ? `${doc.name || 'Untitled'} (move here)`
                                  : doc.name || 'Untitled'
                              }
                              checked={checked}
                              onChange={() =>
                                setStepNeedsDoc(selectedStep.id, doc.id)
                              }
                            />
                          )
                        })}
                      </div>
                    )}
                  </section>

                  <StepBranchRulesEditor
                    step={selectedStep}
                    steps={steps}
                    documents={documents}
                    fieldsByDocId={fieldsByDocId}
                    onChange={(branchRules: ServiceStepBranchRule[]) => {
                      const id = selectedStep.id
                      setSteps((current) =>
                        current.map((item) =>
                          item.id === id
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
              ) : null}
            </div>
          )}
        </div>

        <div className="pd-settings-template__block">
          <div className="pd-settings-template__head">
            <div>
              <span className="pd-settings-template__label">
                Documents
                <span className="pd-settings-template__tab-count">
                  {documents.length}
                </span>
                <SettingsInfo
                  title="Documents"
                  body="Papers this service should collect. Open a paper to set the fields staff fill in on upload."
                />
              </span>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={addDocument}>
              <Plus size={14} /> Add
            </Button>
          </div>
          {documents.length === 0 ? (
            <p className="pd-settings-service-empty">
              No documents yet. Add a paper, name it, and set the fields to collect.
            </p>
          ) : (
            <ul className="pd-settings-template__list">
              {documents.map((doc) => {
                const fieldCount = fieldsByDocId[doc.id]?.length ?? 0
                const expanded = expandedDocId === doc.id
                return (
                  <li key={doc.id} className="pd-settings-template__doc">
                    <div className="pd-settings-template__row">
                      <Input
                        aria-label="Document name"
                        placeholder="e.g. Police clearance"
                        value={doc.name}
                        onChange={(event) => {
                          const name = event.target.value
                          setDocuments((current) =>
                            current.map((item) =>
                              item.id === doc.id ? { ...item, name } : item,
                            ),
                          )
                          markDirty()
                        }}
                      />
                      <Switch
                        className="pd-settings-template__need-switch"
                        label="Required"
                        checked={doc.required}
                        onChange={(event) => {
                          const required = event.target.checked
                          setDocuments((current) =>
                            current.map((item) =>
                              item.id === doc.id
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
                        aria-expanded={expanded}
                        aria-label={
                          expanded
                            ? `Hide fields for ${doc.name || 'document'}`
                            : `Set fields for ${doc.name || 'document'}`
                        }
                        onClick={() =>
                          setExpandedDocId(expanded ? null : doc.id)
                        }
                      >
                        {fieldCount} field{fieldCount === 1 ? '' : 's'}
                        {expanded ? (
                          <ChevronUp size={14} />
                        ) : (
                          <ChevronDown size={14} />
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={`Remove ${doc.name || 'document'}`}
                        onClick={() => {
                          setDocuments((current) =>
                            current.filter((item) => item.id !== doc.id),
                          )
                          setFieldsByDocId((current) => {
                            const next = { ...current }
                            delete next[doc.id]
                            return next
                          })
                          if (expandedDocId === doc.id) setExpandedDocId(null)
                          setSteps((current) =>
                            current.map((step) => ({
                              ...step,
                              requiredDocumentIds: (
                                step.requiredDocumentIds ?? []
                              ).filter((id) => id !== doc.id),
                            })),
                          )
                          markDirty()
                        }}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                    {expanded ? (
                      <DocumentFieldsEditor
                        documentId={doc.id}
                        fields={fieldsByDocId[doc.id] ?? []}
                        onChange={(fields) => setDocumentFields(doc.id, fields)}
                      />
                    ) : null}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="pd-settings-template__footer">
        <p
          className={cx(
            'pd-settings-form__status',
            error && 'pd-settings-form__status--error',
          )}
          role={error ? 'alert' : undefined}
        >
          {error ?? status ?? (dirty ? 'Unsaved changes' : '')}
        </p>
        {country ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setRemoveCountry(country)}
          >
            Remove country
          </Button>
        ) : null}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setResetOpen(true)}
        >
          {country ? 'Reset this country' : 'Reset to default'}
        </Button>
        <Button type="button" size="sm" disabled={!dirty} onClick={handleSave}>
          Save checklist
        </Button>
      </div>
      <ConfirmDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={applyReset}
        title={country ? `Reset ${country}?` : 'Reset this checklist?'}
        description={
          country
            ? `Remove the ${country} variation so those files use the all-countries checklist.`
            : isCustom
              ? 'Restore the generic checklist for this custom service.'
              : 'Restore the default checklist for this service.'
        }
        confirmLabel="Reset"
        confirmVariant="danger"
      />
      <ConfirmDialog
        open={pendingCountry != null}
        onClose={() => setPendingCountry(null)}
        onConfirm={() => {
          if (pendingCountry == null) return
          setCountry(pendingCountry)
          setPendingCountry(null)
        }}
        title="Discard unsaved changes?"
        description="The checklist you were editing has not been saved."
        confirmLabel="Discard"
        confirmVariant="danger"
      />
      <ConfirmDialog
        open={removeCountry != null}
        onClose={() => setRemoveCountry(null)}
        onConfirm={confirmRemoveCountry}
        title={`Remove ${removeCountry ?? 'this country'}?`}
        description="New files for this destination will use the all-countries checklist. Existing files stay as they are."
        confirmLabel="Remove"
        confirmVariant="danger"
      />
    </div>
  )
}
