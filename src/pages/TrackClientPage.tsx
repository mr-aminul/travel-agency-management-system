import { useEffect, useId, useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { ServiceJourney } from '@/components/cases/ServiceJourney'
import { Badge } from '@/components/shadcn/badge'
import { Button } from '@/components/shadcn/button'
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/shadcn/card'
import { Field, FieldError, FieldLabel } from '@/components/shadcn/field'
import { Input } from '@/components/shadcn/input'
import { layoutConfig } from '@/config/layout'
import { apiFetch } from '@/lib/apiClient'
import { findCasesByClientIdAnyTenant } from '@/lib/casesStore'
import { findClientByPassport } from '@/lib/clientsStore'
import { shouldUseApiDataBackend } from '@/lib/data'
import { validateRequiredPassport } from '@/lib/fieldValidation'
import { publicUrl } from '@/lib/publicUrl'
import { iconForService } from '@/lib/serviceIcons'
import {
  buildServiceJourney,
  type JourneyStepDefInput,
} from '@/lib/serviceJourney'
import { useTouchedFields } from '@/lib/useTouchedFields'
import { cn } from '@/lib/utils'
import type { Case, CaseStatus, CaseStepRecord } from '@/types/case'

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

const trackPageBackgroundStyle = {
  backgroundColor: 'color-mix(in srgb, var(--color-theme) 55%, #04060c)',
  backgroundImage: [
    'radial-gradient(48rem 34rem at 14% 10%, color-mix(in srgb, var(--color-theme) 88%, #061228) 0%, transparent 58%)',
    'radial-gradient(40rem 30rem at 90% 90%, color-mix(in srgb, var(--color-theme) 70%, #040a18) 0%, transparent 55%)',
    'linear-gradient(165deg, color-mix(in srgb, var(--color-theme) 65%, #030c18) 0%, color-mix(in srgb, var(--color-theme) 40%, #070b12) 50%, #05070c 100%)',
  ].join(', '),
} as const

export default function TrackClientPage() {
  const passportFieldId = useId()
  const [params, setSearchParams] = useSearchParams()
  const initialPassport = (params.get('passport') ?? '').trim()
  const tenantFilter = (params.get('tenant') ?? '').trim()
  const preferredCaseId = params.get('case')
  const [passport, setPassport] = useState(initialPassport)
  const [submitted, setSubmitted] = useState(initialPassport)
  const [remote, setRemote] = useState<PublicTrackResult | null>(null)
  const [remoteStatus, setRemoteStatus] = useState<
    'idle' | 'loading' | 'miss' | 'error'
  >('idle')
  const { markAllTouched, showError, blur } = useTouchedFields<'passport'>()
  const passportError = validateRequiredPassport(passport)
  const useApi = shouldUseApiDataBackend()

  useEffect(() => {
    if (!submitted || !useApi) {
      setRemote(null)
      setRemoteStatus('idle')
      return
    }
    let cancelled = false
    setRemoteStatus('loading')
    const query = new URLSearchParams({ passport: submitted })
    if (tenantFilter) query.set('tenant', tenantFilter)
    void apiFetch<PublicTrackResult>(
      `/api/platform/public/track?${query.toString()}`,
      { skipAuth: true },
    )
      .then((body) => {
        if (cancelled) return
        const services = Array.isArray(body?.services) ? body.services : []
        setRemote({
          client: body?.client ?? { name: '' },
          services,
        })
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
  }, [submitted, tenantFilter, useApi])

  const localClient = useMemo(
    () =>
      submitted && !useApi ? findClientByPassport(submitted) : undefined,
    [submitted, useApi],
  )
  const localCases = useMemo(
    () => (localClient ? findCasesByClientIdAnyTenant(localClient.id) : []),
    [localClient],
  )

  const clientName = localClient?.name ?? remote?.client.name
  const clientPassport =
    localClient?.passport ?? remote?.client.passport ?? submitted

  const chips: TrackServiceChip[] = useMemo(() => {
    if (localCases.length) {
      return localCases.map((item) => ({
        id: item.id,
        service: item.service,
        destination: item.destination,
        caseId: item.caseId,
        statusLabel: item.status,
        caseItem: item,
      }))
    }
    return (remote?.services ?? [])
      .filter((item) => item && typeof item === 'object' && item.id)
      .map((item) => {
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
  }, [localCases, remote])

  const selected = useMemo(
    () => pickDefault(chips, preferredCaseId),
    [chips, preferredCaseId],
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
  const showWideSheet = Boolean(clientName)

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
    const next: Record<string, string> = { passport: value }
    if (tenantFilter) next.tenant = tenantFilter
    setSearchParams(next)
  }

  const selectService = (caseId: string) => {
    if (!submitted) return
    const next: Record<string, string> = {
      passport: submitted,
      case: caseId,
    }
    if (tenantFilter) next.tenant = tenantFilter
    setSearchParams(next)
  }

  const searchedAndMissing =
    Boolean(submitted) &&
    !clientName &&
    remoteStatus !== 'loading' &&
    (remoteStatus === 'miss' || !useApi)

  const foundWithoutServices =
    Boolean(submitted) &&
    Boolean(clientName) &&
    chips.length === 0 &&
    remoteStatus !== 'loading'

  const passportFieldInvalid = showError('passport') && passportError

  return (
    <div
      className={cn(
        'relative isolate flex min-h-full flex-col items-center overflow-auto',
        'pt-[calc(4.5rem+env(safe-area-inset-top,0px))] px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]',
        'text-[#0a0a0a] [color-scheme:light]',
        '[--journey-ink:#0a0a0a] [--journey-ink-muted:#64748b] [--journey-line:#e5e7eb] [--journey-surface:#ffffff]',
      )}
      style={trackPageBackgroundStyle}
    >
      <img
        src={publicUrl('images/logo.svg')}
        alt={layoutConfig.brand.name}
        className="absolute left-5 top-5 z-[2] h-[1.625rem] w-auto object-contain opacity-[0.92]"
        width={86}
        height={44}
        decoding="async"
      />

      <Card
        className={cn(
          'relative z-[1] my-auto w-full gap-5 rounded-[1.25rem] border-border bg-white py-7 text-[#0a0a0a] shadow-[0_18px_48px_color-mix(in_srgb,black_28%,transparent),0_2px_8px_color-mix(in_srgb,black_12%,transparent)] ring-0',
          showWideSheet ? 'max-w-[40rem]' : 'max-w-[26.5rem]',
        )}
      >
        <CardHeader className="gap-1 px-6 pb-0 text-center">
          <h1 className="m-0 text-balance font-[family-name:var(--font-heading)] text-[clamp(1.5rem,2.6vw,1.85rem)] font-extrabold leading-[1.15] tracking-[-0.03em]">
            {clientName ? 'Application status' : 'Track an application'}
          </h1>
        </CardHeader>

        <CardContent className="flex flex-col gap-5 px-6">
          <form
            className={cn(
              'grid w-full gap-3.5',
              showWideSheet && 'md:grid-cols-[minmax(0,1fr)_auto] md:items-end',
            )}
            onSubmit={handleSubmit}
          >
            <Field data-invalid={passportFieldInvalid ? true : undefined}>
              <FieldLabel htmlFor={passportFieldId}>
                Passport Number
                <span className="text-destructive"> *</span>
              </FieldLabel>
              <Input
                id={passportFieldId}
                required
                value={passport}
                onChange={(event) => setPassport(event.target.value)}
                onBlur={blur('passport')}
                placeholder="e.g. A12345678"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                aria-invalid={passportFieldInvalid ? true : undefined}
                className="h-[2.875rem] rounded-xl md:text-base"
              />
              {passportFieldInvalid ? (
                <FieldError>{passportError}</FieldError>
              ) : null}
            </Field>
            <Button
              type="submit"
              size="lg"
              className={cn(
                'h-[2.875rem] w-full rounded-xl font-semibold',
                showWideSheet && 'md:w-auto md:min-w-[7.5rem]',
              )}
            >
              <Search size={18} strokeWidth={2.25} aria-hidden />
              Search
            </Button>
          </form>

          {remoteStatus === 'loading' ? (
            <p
              className="m-0 mx-auto max-w-96 text-pretty text-sm leading-snug text-[#64748b]"
              role="status"
            >
              Looking up passport…
            </p>
          ) : null}

          {remoteStatus === 'error' ? (
            <p className="m-0 text-sm text-destructive" role="alert">
              Could not look up this passport right now. Check your connection and
              try again.
            </p>
          ) : null}

          {searchedAndMissing ? (
            <p className="m-0 text-sm text-destructive" role="status">
              No match found for passport {submitted}. Check the number and try
              again, or ask the agency if the file has been registered.
            </p>
          ) : null}

          {foundWithoutServices ? (
            <p className="m-0 text-sm text-destructive" role="status">
              {clientName} is registered, but no service journey is available to
              show yet. Ask the agency if the file has been opened.
            </p>
          ) : null}

          {clientName && selected ? (
            <section
              className="flex flex-col gap-4 border-t border-border pt-1"
              aria-live="polite"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 gap-x-5">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <h2 className="m-0 font-[family-name:var(--font-heading)] text-xl font-extrabold leading-snug tracking-[-0.03em]">
                    {clientName}
                  </h2>
                  <p className="m-0 text-sm text-[#64748b]">
                    Passport {clientPassport}
                    {selected.destination ? ` · ${selected.destination}` : ''}
                    {hasMultipleServices ? '' : ` · ${selected.service}`}
                  </p>
                </div>
                <p className="m-0 flex flex-col items-start gap-1.5 text-[0.7rem] font-bold uppercase tracking-[0.08em] text-[#64748b] md:items-end">
                  <span>Current Stage</span>
                  <Badge variant="secondary">{currentLabel}</Badge>
                </p>
              </div>

              {hasMultipleServices ? (
                <nav
                  className="flex flex-wrap gap-1.5"
                  aria-label="Services for this passport"
                >
                  {chips.map((item) => {
                    const isSelected = item.id === selected.id
                    const ServiceIcon = iconForService(item.service)
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={cn(
                          'inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-[0.8125rem] font-semibold leading-snug transition-colors',
                          'border-border bg-[color-mix(in_srgb,var(--color-theme)_6%,white)] text-[#64748b]',
                          'hover:border-[color-mix(in_srgb,var(--color-theme)_35%,#e5e7eb)] hover:text-[#0a0a0a]',
                          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color-mix(in_srgb,var(--color-theme)_55%,transparent)]',
                          isSelected &&
                            'border-[color-mix(in_srgb,var(--color-theme)_45%,#e5e7eb)] bg-[color-mix(in_srgb,var(--color-theme)_14%,white)] text-[#0a0a0a]',
                        )}
                        aria-pressed={isSelected}
                        onClick={() => selectService(item.id)}
                      >
                        <ServiceIcon
                          size={15}
                          strokeWidth={2}
                          aria-hidden
                          className="shrink-0"
                        />
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
        </CardContent>
      </Card>
    </div>
  )
}
