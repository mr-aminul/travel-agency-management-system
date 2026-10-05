import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Plus, Trash2, X } from 'lucide-react'
import { Button, Checkbox, ConfirmDialog, Input, Select } from '@/components/ui'
import { SettingsInfo } from '@/components/settings/SettingsInfo'
import { cx } from '@/lib/cx'
import {
  destinationCountryOptions,
  normalizeCountryName,
} from '@/lib/destinationCountries'
import {
  deleteServiceTemplate,
  listServiceCountries,
  nextTemplateItemId,
  saveServiceTemplate,
  useServiceTemplates,
} from '@/lib/serviceTemplatesStore'
import { resolveServiceTemplate } from '@/lib/resolveServiceTemplate'
import { toggleStepRequiredDocument } from '@/lib/stepDocumentLinks'
import type { ServiceType } from '@/types/case'

const ALL_COUNTRIES = ''

function draftFrom(service: ServiceType, country: string) {
  const resolved = resolveServiceTemplate(service, country)
  return {
    steps: resolved.steps.map((step) => ({ ...step })),
    documents: resolved.documents.map((doc) => ({ ...doc })),
  }
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
    setSteps((current) => [
      ...current,
      {
        id: nextTemplateItemId(`step ${current.length + 1}`, current.map((s) => s.id)),
        label: '',
        requiredDocumentIds: [],
      },
    ])
    markDirty()
  }

  const setStepNeedsDoc = (stepId: string, documentId: string) => {
    setSteps((current) => toggleStepRequiredDocument(current, stepId, documentId))
    markDirty()
  }

  const addDocument = () => {
    setDocuments((current) => [
      ...current,
      {
        id: nextTemplateItemId(
          `document ${current.length + 1}`,
          current.map((doc) => doc.id),
        ),
        name: '',
        required: true,
      },
    ])
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

  const handleSave = () => {
    setError(null)
    setStatus(null)
    try {
      saveServiceTemplate({
        serviceName: service,
        country,
        steps,
        documents,
      })
      setDirty(false)
      setStatus(
        country
          ? `Saved. New ${country} files use this checklist.`
          : 'Saved. New files without a country match use this checklist.',
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
            {item}
          </button>
        ))}
      </div>
      <SettingsInfo
        title={country ? country : 'All countries'}
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
        <div className="pd-settings-template__block">
          <div className="pd-settings-template__head">
            <div>
              <span className="pd-settings-template__label">
                Status journey
                <span className="pd-settings-template__tab-count">
                  {steps.length}
                </span>
                <SettingsInfo
                  title="Status journey"
                  body="Staff move a file through these steps, in this order. Needs docs must be uploaded before that status can be marked complete."
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
            <ol className="pd-settings-template__list pd-settings-template__list--steps">
              {steps.map((step, index) => {
                const needed = step.requiredDocumentIds ?? []
                const namedNeeded = needed
                  .map((id) => documents.find((doc) => doc.id === id))
                  .filter((doc): doc is (typeof documents)[number] => Boolean(doc))
                return (
                  <li key={step.id} className="pd-settings-template__step">
                    <div className="pd-settings-template__row">
                      <span className="pd-settings-template__index" aria-hidden>
                        {index + 1}
                      </span>
                      <Input
                        aria-label={`Step ${index + 1}`}
                        placeholder="e.g. Medical"
                        value={step.label}
                        onChange={(event) => {
                          const label = event.target.value
                          setSteps((current) =>
                            current.map((item) =>
                              item.id === step.id ? { ...item, label } : item,
                            ),
                          )
                          markDirty()
                        }}
                      />
                      <span className="pd-settings-template__row-actions">
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
                          onClick={() => {
                            setSteps((current) =>
                              current.filter((item) => item.id !== step.id),
                            )
                            markDirty()
                          }}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </span>
                    </div>
                    <div className="pd-settings-template__needs">
                      <span className="pd-settings-template__needs-label">
                        Needs docs
                      </span>
                      <div className="pd-settings-template__needs-chips">
                        {namedNeeded.map((doc) => (
                          <button
                            key={doc.id}
                            type="button"
                            className="pd-settings-template__needs-chip"
                            onClick={() => setStepNeedsDoc(step.id, doc.id)}
                            aria-label={`Remove ${doc.name || 'document'} from Needs docs`}
                          >
                            <span>{doc.name || 'Untitled'}</span>
                            <X size={12} aria-hidden />
                          </button>
                        ))}
                        {documents.length === 0 ? (
                          <span className="pd-settings-template__needs-empty">
                            Add documents first
                          </span>
                        ) : (
                          <details className="pd-settings-template__needs-picker">
                            <summary>
                              <Plus size={12} aria-hidden />
                              {needed.length ? 'Edit' : 'Add'}
                            </summary>
                            <div
                              className="pd-settings-template__needs-menu"
                              role="group"
                              aria-label={`Needs docs for ${step.label || `step ${index + 1}`}`}
                            >
                              {documents.map((doc) => {
                                const checked = needed.includes(doc.id)
                                const ownedElsewhere = steps.some(
                                  (other) =>
                                    other.id !== step.id &&
                                    (other.requiredDocumentIds ?? []).includes(
                                      doc.id,
                                    ),
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
                                      setStepNeedsDoc(step.id, doc.id)
                                    }
                                  />
                                )
                              })}
                            </div>
                          </details>
                        )}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ol>
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
                  body="Papers this service should collect on new files."
                />
              </span>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={addDocument}>
              <Plus size={14} /> Add
            </Button>
          </div>
          {documents.length === 0 ? (
            <p className="pd-settings-service-empty">
              No documents yet. Add the papers this service should collect.
            </p>
          ) : (
            <ul className="pd-settings-template__list">
              {documents.map((doc) => (
                <li key={doc.id} className="pd-settings-template__row">
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
                  <button
                    type="button"
                    className={cx(
                      'pd-settings-template__need',
                      doc.required && 'is-required',
                    )}
                    aria-pressed={doc.required}
                    onClick={() => {
                      setDocuments((current) =>
                        current.map((item) =>
                          item.id === doc.id
                            ? { ...item, required: !item.required }
                            : item,
                        ),
                      )
                      markDirty()
                    }}
                  >
                    {doc.required ? 'Required' : 'Optional'}
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`Remove ${doc.name || 'document'}`}
                    onClick={() => {
                      setDocuments((current) =>
                        current.filter((item) => item.id !== doc.id),
                      )
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
                </li>
              ))}
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
