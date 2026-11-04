import { Plus, Trash2 } from 'lucide-react'
import { Button, Checkbox, Input, Select } from '@/components/ui'
import { defaultYesNoDecision } from '@/lib/stepDecisions'
import type {
  ServiceStepConfig,
  ServiceStepDecision,
  ServiceStepDecisionOption,
} from '@/types/serviceTemplate'

export function StepDecisionsEditor({
  step,
  steps,
  onChange,
}: {
  step: ServiceStepConfig
  steps: ServiceStepConfig[]
  onChange: (decisions: ServiceStepDecision[]) => void
}) {
  const decisions = step.decisions ?? []
  const nextStepOptions = [
    { value: '', label: 'Default next step' },
    ...steps
      .filter((item) => item.id !== step.id)
      .map((item) => ({
        value: item.id,
        label: item.label || item.id,
      })),
  ]

  const updateDecision = (
    key: string,
    patch: Partial<ServiceStepDecision>,
  ) => {
    onChange(
      decisions.map((decision) =>
        decision.key === key ? { ...decision, ...patch } : decision,
      ),
    )
  }

  const updateOption = (
    decisionKey: string,
    optionValue: string,
    patch: Partial<ServiceStepDecisionOption>,
  ) => {
    onChange(
      decisions.map((decision) => {
        if (decision.key !== decisionKey) return decision
        return {
          ...decision,
          options: decision.options.map((option) =>
            option.value === optionValue ? { ...option, ...patch } : option,
          ),
        }
      }),
    )
  }

  const addDecision = () => {
    const used = decisions.map((decision) => decision.key)
    onChange([...decisions, defaultYesNoDecision('Finger', used)])
  }

  const removeDecision = (key: string) => {
    onChange(decisions.filter((decision) => decision.key !== key))
  }

  return (
    <section className="pd-settings-template__exceptions">
      <div className="pd-settings-template__panel-label-row">
        <span className="pd-settings-template__panel-label">If / require</span>
        <Button type="button" variant="ghost" size="sm" onClick={addDecision}>
          <Plus size={14} aria-hidden />
          Add option
        </Button>
      </div>

      {decisions.length === 0 ? (
        <p className="pd-service-flow__inspector-copy">
          Add a Yes/No option (e.g. Finger). Yes can continue to the next step;
          No can jump elsewhere and skip documents for this status.
        </p>
      ) : (
        <ul className="pd-settings-template__decision-list">
          {decisions.map((decision) => (
            <li
              key={decision.key}
              className="pd-settings-template__decision-card"
            >
              <div className="pd-settings-template__decision-head">
                <Input
                  aria-label="Decision name"
                  value={decision.label}
                  placeholder="e.g. Finger"
                  onChange={(event) => {
                    updateDecision(decision.key, {
                      label: event.target.value,
                    })
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove ${decision.label || 'decision'}`}
                  onClick={() => removeDecision(decision.key)}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
              <ul className="pd-settings-template__decision-options">
                {decision.options.map((option) => (
                  <li key={option.value}>
                    <div className="pd-settings-template__decision-option-row">
                      <span className="pd-settings-template__decision-option-label">
                        {option.value}
                      </span>
                      <Select
                        aria-label={`${decision.label} ${option.value} next step`}
                        size="sm"
                        value={option.nextStepId ?? ''}
                        options={nextStepOptions}
                        onChange={(event) => {
                          const nextStepId = event.target.value.trim()
                          updateOption(decision.key, option.value, {
                            nextStepId: nextStepId || undefined,
                          })
                        }}
                      />
                    </div>
                    <Checkbox
                      label="Skip documents for this choice"
                      checked={option.skipDocuments === true}
                      onChange={(event) =>
                        updateOption(decision.key, option.value, {
                          skipDocuments: event.target.checked || undefined,
                        })
                      }
                    />
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
