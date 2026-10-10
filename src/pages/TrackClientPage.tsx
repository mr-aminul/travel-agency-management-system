import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { ServiceJourney } from '@/components/cases/ServiceJourney'
import { layoutConfig } from '@/config/layout'
import { apiFetch } from '@/lib/apiClient'
import { findCasesByClientIdAnyTenant } from '@/lib/casesStore'
import { findClientByPassport } from '@/lib/clientsStore'
import { cx } from '@/lib/cx'
import { shouldUseApiDataBackend } from '@/lib/data'
import { validateRequiredPassport } from '@/lib/fieldValidation'
import { publicUrl } from '@/lib/publicUrl'
import { iconForService } from '@/lib/serviceIcons'
import {
  buildServiceJourney,
  type JourneyStepDefInput,
} from '@/lib/serviceJourney'
import { useTouchedFields } from '@/lib/useTouchedFields'
import type { Case, CaseStatus, CaseStepRecord } from '@/types/case'
import '@/styles/layout-track.css'
import { Badge, Button, Input } from '@/components/ui'

type PublicTrackService = {
  id: string
  type?: string
  status?: string
  currentStep?: string
  currentStepId?: string
  caseId?: string
  destination?: string
  serviceCountry?: string
  stage?: Case['stage']
  steps?: Record<string, Pick<CaseStepRecord, 'completedAt' | 'detail'>>
  createdAt?: string
  updatedAt?: string
  balance?: number
  templateSteps?: JourneyStepDefInput[]
}

type PublicTrackResult = {
  client: { name: string; passport?: string; services?: string[] }
  services: PublicTrackService[]
}

type TrackServiceChip = {
  id: string
  service: string
  destination?: string
  caseId: string
  statusLabel: string
  caseItem?: Case
  stepDefs?: JourneyStepDefInput[]
}

const PUBLIC_CASE_STATUSES: CaseStatus[] = [
  'Pending',
  'In-Progress',
  'On-Hold',
  'Completed',
  'Cancelled',
]

function asCaseStatus(value: unknown): CaseStatus {
  if (
    typeof value === 'string' &&
    (PUBLIC_CASE_STATUSES as string[]).includes(value)
  ) {
    return value as CaseStatus
  }
  return 'In-Progress'
}

/** Map the public API service payload into a Case for ServiceJourney. */
function caseFromPublicTrack(item: PublicTrackService): Case {
  const service = String(item.type ?? 'Service')
  const currentStepId = String(
    item.currentStepId || item.currentStep || 'registered',
  )
  const steps: Record<string, CaseStepRecord> = {}
  if (item.steps && typeof item.steps === 'object') {
    for (const [stepId, record] of Object.entries(item.steps)) {
      steps[stepId] = {
        completedAt: record?.completedAt ?? null,
        detail: record?.detail,
      }
    }
  }
  const createdAt = item.createdAt || new Date(0).toISOString()
  const updatedAt = item.updatedAt || createdAt
  return {
    id: item.id,
    tenantId: 'public',
    caseId: item.caseId || item.id,
    clientId: 'public',
    clientName: '',
    service,
    status: asCaseStatus(item.status),
    stage: item.stage ?? 'Processing',
    currentStepId,
    steps,
    documents: [],
    destination: item.destination,
    serviceCountry: item.serviceCountry,
    serviceFee: 0,
    balance: typeof item.balance === 'number' ? item.balance : 0,
    createdAt,
    updatedAt,
  }
}

function pickDefault(
  items: TrackServiceChip[],
  preferredId?: string | null,
): TrackServiceChip | undefined {
  if (preferredId) {
    const match = items.find((item) => item.id === preferredId)
    if (match) return match
  }
  return (
    items.find(
      (item) =>
        item.caseItem &&
        item.caseItem.status !== 'Completed' &&
        item.caseItem.status !== 'Cancelled',
    ) ?? items[0]
  )
}

function serviceChipLabel(item: TrackServiceChip, items: TrackServiceChip[]): string {
  const sameServiceCount = items.filter(
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
  const [remote, setRemote] = useState<PublicTrackResult | null>(null)
  const [remoteStatus, setRemoteStatus] = useState<
    'idle' | 'loading' | 'miss' | 'error'
  >('idle')
  const { markAllTouched, showError, blur } = useTouchedFields<'passport'>()
  const passportError = validateRequiredPassport(passport)

  useEffect(() => {
    if (!submitted || !shouldUseApiDataBackend()) {
      setRemote(null)
      setRemoteStatus('idle')
      return
    }
    let cancelled = false
    setRemoteStatus('loading')
    const tenant = (params.get('tenant') ?? '').trim()
    const query = new URLSearchParams({ passport: submitted })
    if (tenant) query.set('tenant', tenant)
    void apiFetch<PublicTrackResult>(
      `/api/platform/public/track?${query.toString()}`,
      { skipAuth: true },
    )
      .then((body) => {
        if (cancelled) return
        setRemote(body)
        setRemoteStatus('idle')
      })
      .catch((error) => {
        if (cancelled) return
        setRemote(null)
        const status =
          error && typeof error === 'object' && 'status' in error
            ? Number((error as { status: number }).status)
            : 0
        setRemoteStatus(status === 404 ? 'miss' : 'error')
      })
    return () => {
      cancelled = true
    }
  }, [submitted, params])

  const localClient = useMemo(
    () =>
      submitted && !shouldUseApiDataBackend()
        ? findClientByPassport(submitted)
        : undefined,
    [submitted],
  )
  const localCases = useMemo(
    () => (localClient ? findCasesByClientIdAnyTenant(localClient.id) : []),
    [localClient],
  )

  const clientName = localClient?.name ?? remote?.client.name
  const clientPassport =
    localClient?.passport ?? remote?.client.passport ?? submitted

  const chips: TrackServiceChip[] = localCases.length
    ? localCases.map((item) => ({
        id: item.id,
        service: item.service,
        destination: item.destination,
        caseId: item.caseId,
        statusLabel: item.status,
        caseItem: item,
      }))
    : (remote?.services ?? []).map((item) => {
        const caseItem = caseFromPublicTrack(item)
        return {
          id: item.id,
          service: caseItem.service,
          destination: caseItem.destination,
          caseId: caseItem.caseId,
          statusLabel: item.currentStep || item.status || 'In progress',
          caseItem,
          stepDefs: item.templateSteps,
        }
      })

  const selected = useMemo(
    () => pickDefault(chips, params.get('case')),
    [chips, params],
  )
  const journey = useMemo(
    () =>
      selected?.caseItem
        ? buildServiceJourney(selected.caseItem, {
            stepDefs: selected.stepDefs,
          })
        : null,
    [selected],
  )
  const currentLabel =
    journey?.steps.find((step) => step.state === 'current')?.label ??
    journey?.steps[journey.steps.length - 1]?.label ??
    selected?.statusLabel
  const hasMultipleServices = chips.length > 1

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    markAllTouched(['passport'])
    if (passportError) {
      setSubmitted('')
      setSearchParams({})
      return
    }
    const value = passport.trim()
    setSubmitted(value)
    setSearchParams({ passport: value })
  }

  const selectService = (caseId: string) => {
    if (!submitted) return
    setSearchParams({ passport: submitted, case: caseId })
  }

  const searchedAndMissing =
    Boolean(submitted) &&
    !clientName &&
    remoteStatus !== 'loading' &&
    (remoteStatus === 'miss' || !shouldUseApiDataBackend())

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
          clientName ? 'pd-track__sheet pd-track__sheet--wide' : 'pd-track__sheet'
        }
      >
        <header className="pd-track__intro">
          <h1 className="pd-track__title">
            {clientName ? 'Application status' : 'Track an application'}
          </h1>
          {clientName ? null : (
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
            required
            value={passport}
            onChange={(event) => setPassport(event.target.value)}
            onBlur={blur('passport')}
            placeholder="e.g. A12345678"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            error={showError('passport') ? passportError : undefined}
          />
          <Button type="submit" size="lg">
            <Search size={18} strokeWidth={2.25} aria-hidden />
            Search
          </Button>
        </form>

        {remoteStatus === 'loading' ? (
          <p className="pd-track__lede" role="status">
            Looking up passport…
          </p>
        ) : null}

        {searchedAndMissing ? (
          <p className="pd-field__error" role="status">
            No match found for passport {submitted}. Check the number and try
            again, or ask the agency if the file has been registered.
          </p>
        ) : null}

        {clientName && selected ? (
          <section className="pd-track__result" aria-live="polite">
            <div className="pd-track__identity">
              <div className="pd-track__identity-copy">
                <h2 className="pd-track__name">{clientName}</h2>
                <p className="pd-track__meta">
                  Passport {clientPassport}
                  {selected.destination ? ` · ${selected.destination}` : ''}
                  {hasMultipleServices ? '' : ` · ${selected.service}`}
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
                {chips.map((item) => {
                  const isSelected = item.id === selected.id
                  const ServiceIcon = iconForService(item.service)
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={cx(
                        'pd-track__service-chip',
                        isSelected && 'is-active',
                      )}
                      aria-pressed={isSelected}
                      onClick={() => selectService(item.id)}
                    >
                      <ServiceIcon size={15} strokeWidth={2} aria-hidden />
                      {serviceChipLabel(item, chips)}
                    </button>
                  )
                })}
              </nav>
            ) : null}

            {selected.caseItem && journey ? (
              <ServiceJourney
                item={selected.caseItem}
                stepDefs={selected.stepDefs}
              />
            ) : null}
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
