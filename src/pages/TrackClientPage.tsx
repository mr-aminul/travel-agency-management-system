import { useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { ServiceJourney } from '@/components/cases/ServiceJourney'
import { Alert, Badge, Button, Input } from '@/components/ui'
import { layoutConfig } from '@/config/layout'
import { findCasesByClientIdAnyTenant } from '@/lib/casesStore'
import { findClientByPassport } from '@/lib/clientsStore'
import { cx } from '@/lib/cx'
import { publicUrl } from '@/lib/publicUrl'
import { iconForService } from '@/lib/serviceIcons'
import { buildServiceJourney } from '@/lib/serviceJourney'
import type { Case } from '@/types/case'
import '@/styles/layout-track.css'

function pickDefaultCase(cases: Case[], preferredId?: string | null): Case | undefined {
  if (preferredId) {
    const match = cases.find((item) => item.id === preferredId)
    if (match) return match
  }
  return (
    cases.find(
      (item) => item.status !== 'Completed' && item.status !== 'Cancelled',
    ) ?? cases[0]
  )
}

function serviceChipLabel(item: Case, cases: Case[]): string {
  const sameServiceCount = cases.filter(
    (entry) => entry.service === item.service,
  ).length
  if (sameServiceCount <= 1) return item.service
  if (item.destination) return `${item.service} · ${item.destination}`
  return `${item.service} (${item.caseId})`
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
  const selectedCase = useMemo(
    () => pickDefaultCase(cases, params.get('case')),
    [cases, params],
  )
  const journey = useMemo(
    () => (selectedCase ? buildServiceJourney(selectedCase) : null),
    [selectedCase],
  )
  const currentLabel =
    journey?.steps.find((step) => step.state === 'current')?.label ??
    journey?.steps[journey.steps.length - 1]?.label ??
    selectedCase?.status
  const hasMultipleServices = cases.length > 1

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

  const selectService = (caseId: string) => {
    if (!submitted) return
    setSearchParams({ passport: submitted, case: caseId })
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
            <Search size={18} strokeWidth={2.25} aria-hidden />
            Search
          </Button>
        </form>

        {searchedAndMissing ? (
          <Alert variant="warning" title="No match found">
            We could not find an application for passport {submitted}. Check the
            number and try again, or ask the agency if the file has been
            registered.
          </Alert>
        ) : null}

        {client && selectedCase && journey ? (
          <section className="pd-track__result" aria-live="polite">
            <div className="pd-track__identity">
              <div className="pd-track__identity-copy">
                <h2 className="pd-track__name">{client.name}</h2>
                <p className="pd-track__meta">
                  Passport {client.passport}
                  {selectedCase.destination
                    ? ` · ${selectedCase.destination}`
                    : ''}
                  {hasMultipleServices ? '' : ` · ${selectedCase.service}`}
                </p>
              </div>
              <p className="pd-track__current">
                <span>Current stage</span>
                <Badge variant="in-progress">{currentLabel}</Badge>
              </p>
            </div>

            {hasMultipleServices ? (
              <nav
                className="pd-track__services"
                aria-label="Services for this passport"
              >
                {cases.map((item) => {
                  const selected = item.id === selectedCase.id
                  const ServiceIcon = iconForService(item.service)
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={cx(
                        'pd-track__service-chip',
                        selected && 'is-active',
                      )}
                      aria-pressed={selected}
                      onClick={() => selectService(item.id)}
                    >
                      <ServiceIcon size={15} strokeWidth={2} aria-hidden />
                      {serviceChipLabel(item, cases)}
                    </button>
                  )
                })}
              </nav>
            ) : null}

            <ServiceJourney item={selectedCase} />
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
