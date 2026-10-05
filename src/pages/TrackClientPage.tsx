import { useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Check } from 'lucide-react'
import { Alert, Badge, Button, Input } from '@/components/ui'
import { layoutConfig } from '@/config/layout'
import {
  getStepDefsForCase,
  getStepIndex,
  isPipelineStepComplete,
  templateCountry,
} from '@/lib/caseChecklist'
import { findCasesByClientIdAnyTenant } from '@/lib/casesStore'
import { findClientByPassport } from '@/lib/clientsStore'
import { publicUrl } from '@/lib/publicUrl'
import { formatDisplayDate } from '@/lib/formatDate'
import '@/styles/layout-track.css'

function formatDate(value?: string | null) {
  return formatDisplayDate(value, '') || null
}

export default function TrackClientPage() {
  const [params, setSearchParams] = useSearchParams()
  const initialPassport = (params.get('passport') ?? '').trim()
  const [passport, setPassport] = useState(initialPassport)
  const [submitted, setSubmitted] = useState(initialPassport)
  const [fieldError, setFieldError] = useState<string | undefined>()

  const client = useMemo(
    () => (submitted ? findClientByPassport(submitted) : undefined),
    [submitted],
  )
  const cases = useMemo(
    () => (client ? findCasesByClientIdAnyTenant(client.id) : []),
    [client],
  )
  const activeCase =
    cases.find(
      (item) => item.status !== 'Completed' && item.status !== 'Cancelled',
    ) ?? cases[0]
  const steps = activeCase ? getStepDefsForCase(activeCase) : []
  const currentIndex = activeCase
    ? getStepIndex(
        activeCase.service,
        activeCase.currentStepId,
        templateCountry(activeCase),
      )
    : -1
  const completedCount =
    activeCase && currentIndex >= 0
      ? steps.filter((step) => isPipelineStepComplete(activeCase, step.id))
          .length
      : 0
  const progressPercent =
    steps.length > 0 ? (completedCount / steps.length) * 100 : 0

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const value = passport.trim()
    if (!value) {
      setFieldError('Enter a passport number to continue.')
      setSubmitted('')
      setSearchParams({})
      return
    }
    setFieldError(undefined)
    setSubmitted(value)
    setSearchParams({ passport: value })
  }

  const searchedAndMissing = Boolean(submitted) && !client

  return (
    <div className="pd-track">
      <img
        src={publicUrl('images/logo.svg')}
        alt={layoutConfig.brand.name}
        className="pd-track__corner-logo"
        width={86}
        height={44}
        decoding="async"
      />

      <main
        className={
          client ? 'pd-track__sheet pd-track__sheet--wide' : 'pd-track__sheet'
        }
      >
        <header className="pd-track__intro">
          <h1 className="pd-track__title">
            {client ? 'Application status' : 'Track an application'}
          </h1>
          {client ? null : (
            <p className="pd-track__lede">
              Enter the client passport number to see where their service is in the
              journey.
            </p>
          )}
        </header>

        <form className="pd-track__form" onSubmit={handleSubmit}>
          <Input
            id="track-passport"
            label="Passport number"
            value={passport}
            onChange={(event) => {
              setPassport(event.target.value)
              if (fieldError) setFieldError(undefined)
            }}
            placeholder="e.g. A12345678"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            error={fieldError}
          />
          <Button type="submit" size="lg">
            Look up status
          </Button>
        </form>

        {searchedAndMissing ? (
          <Alert variant="warning" title="No match found">
            We could not find an application for passport {submitted}. Check the
            number and try again, or ask the agency if the file has been
            registered.
          </Alert>
        ) : null}

        {client && activeCase ? (
          <section className="pd-track__result" aria-live="polite">
            <div className="pd-track__identity">
              <div className="pd-track__identity-copy">
                <h2 className="pd-track__name">{client.name}</h2>
                <p className="pd-track__meta">
                  Passport {client.passport}
                  {activeCase.destination ? ` · ${activeCase.destination}` : ''}
                  {` · ${activeCase.service}`}
                </p>
              </div>
              <p className="pd-track__current">
                <span>Current stage</span>
                <Badge variant="in-progress">
                  {steps[currentIndex]?.label ?? activeCase.status}
                </Badge>
              </p>
            </div>

            <div className="pd-track__progress">
              <div className="pd-track__progress-copy">
                <p className="pd-track__progress-label">
                  Stage {Math.min(completedCount + 1, steps.length)} of{' '}
                  {steps.length}
                </p>
              </div>
              <div
                className="pd-track__bar"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progressPercent)}
                aria-label="Application progress"
              >
                <span style={{ width: `${progressPercent}%` }} />
              </div>
            </div>

            <ol className="pd-track__steps" aria-label="Service journey">
              {steps.map((step, index) => {
                const done = isPipelineStepComplete(activeCase, step.id)
                const state =
                  done && index !== currentIndex
                    ? 'done'
                    : index === currentIndex
                      ? 'current'
                      : done
                        ? 'done'
                        : 'upcoming'
                const record = activeCase.steps[step.id]
                return (
                  <li
                    key={step.id}
                    className={`pd-track__step pd-track__step--${state}`}
                  >
                    <span className="pd-track__marker" aria-hidden>
                      {state === 'done' ? (
                        <Check size={14} strokeWidth={3} />
                      ) : (
                        index + 1
                      )}
                    </span>
                    <div className="pd-track__step-body">
                      <div className="pd-track__step-head">
                        <h3 className="pd-track__step-title">{step.label}</h3>
                        <time className="pd-track__step-date">
                          {formatDate(record?.completedAt) ??
                            (state === 'upcoming'
                              ? 'Upcoming'
                              : state === 'done'
                                ? 'Completed'
                                : 'Now')}
                        </time>
                      </div>
                      {record?.detail ? (
                        <p className="pd-track__step-note">{record.detail}</p>
                      ) : null}
                    </div>
                  </li>
                )
              })}
            </ol>
          </section>
        ) : null}

        <p className="pd-track__privacy">
          Only the passport number is required. Personal contact details are not
          shown on this page.
        </p>
      </main>
    </div>
  )
}
