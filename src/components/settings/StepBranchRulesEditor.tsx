import { useMemo, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button, SideDrawer } from '@/components/ui'
import {
  listBranchSlotsForStep,
  unwireBranchSlot,
  upsertBranchRule,
  type BranchSlot,
} from '@/lib/serviceBranchFields'
import type { DocumentFormFieldDraft } from '@/types/documentFormField'
import type {
  ServiceDocumentConfig,
  ServiceStepBranchRule,
  ServiceStepConfig,
} from '@/types/serviceTemplate'

function ChoiceList({
  label,
  ariaLabel,
  options,
  value,
  onChange,
}: {
  label: string
  ariaLabel: string
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="pd-settings-template__branch-choice">
      <span className="pd-settings-template__branch-choice-label">{label}</span>
      <div
        className="pd-settings-template__branch-choice-list"
        role="radiogroup"
        aria-label={ariaLabel}
      >
        {options.map((option) => {
          const selected = option.value === value
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              className={
                selected
                  ? 'pd-settings-template__branch-option is-selected'
                  : 'pd-settings-template__branch-option'
              }
              onClick={() => onChange(option.value)}
            >
              <span className="pd-settings-template__branch-option-label">
                {option.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function StepBranchRulesEditor({
  step,
  steps,
  documents,
  fieldsByDocId,
  onChange,
}: {
  step: ServiceStepConfig
  steps: ServiceStepConfig[]
  documents: ServiceDocumentConfig[]
  fieldsByDocId: Record<string, DocumentFormFieldDraft[]>
  onChange: (rules: ServiceStepBranchRule[]) => void
}) {
  const slots = useMemo(
    () => listBranchSlotsForStep(step, documents, fieldsByDocId),
    [step, documents, fieldsByDocId],
  )

  const nextStepOptions = steps
    .filter((item) => item.id !== step.id)
    .map((item) => ({
      value: item.id,
      label: item.label || item.id,
    }))

  const [draft, setDraft] = useState<BranchSlot | null>(null)

  const wireSlot = (slot: BranchSlot, nextStepId: string) => {
    onChange(
      upsertBranchRule(step.branchRules, {
        documentId: slot.documentId,
        fieldKey: slot.fieldKey,
        equals: slot.equals,
        nextStepId,
      }),
    )
    setDraft(null)
  }

  const clearSlot = (slot: BranchSlot) => {
    onChange(unwireBranchSlot(step.branchRules, slot) ?? [])
  }

  return (
    <section className="pd-settings-template__exceptions">
      <div className="pd-settings-template__panel-label-row">
        <span className="pd-settings-template__panel-label">Branch</span>
      </div>

      {slots.length === 0 ? (
        <p className="pd-service-flow__inspector-copy">
          Add a Dropdown field on a document this step needs. Each choice
          appears here so you can wire the next step.
        </p>
      ) : (
        <ul className="pd-settings-template__branch-list">
          {slots.map((slot) => {
            const nextLabel =
              steps.find((item) => item.id === slot.nextStepId)?.label ||
              slot.nextStepId
            const wired = Boolean(slot.nextStepId)
            return (
              <li
                key={`${slot.documentId}-${slot.fieldKey}-${slot.equals}`}
              >
                <div className="pd-settings-template__branch-summary">
                  <button
                    type="button"
                    className="pd-settings-template__branch-summary-text"
                    onClick={() => setDraft(slot)}
                    disabled={nextStepOptions.length === 0}
                  >
                    {slot.fieldLabel} = {slot.equals}
                    {wired
                      ? ` → ${nextLabel || '…'}`
                      : ' → Choose next step'}
                  </button>
                  {wired ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`Clear branch ${slot.fieldLabel} = ${slot.equals}`}
                      onClick={() => clearSlot(slot)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <SideDrawer
        open={draft != null}
        onClose={() => setDraft(null)}
        title="Wire branch"
        description={
          draft
            ? `When ${draft.fieldLabel} is “${draft.equals}”, go to…`
            : undefined
        }
        className="pd-settings-branch-drawer"
        footer={
          <div className="pd-settings-template__branch-drawer-actions">
            <span />
            <div className="pd-settings-template__branch-drawer-actions-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setDraft(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        }
      >
        {draft ? (
          <div className="pd-settings-template__branch-drawer-fields">
            {nextStepOptions.length === 0 ? (
              <p className="pd-settings-template__branch-drawer-empty">
                Add another status step first, then wire this branch.
              </p>
            ) : (
              <ChoiceList
                label="go to"
                ariaLabel="Branch next step"
                value={draft.nextStepId}
                options={nextStepOptions}
                onChange={(nextStepId) => wireSlot(draft, nextStepId)}
              />
            )}
          </div>
        ) : null}
      </SideDrawer>
    </section>
  )
}
