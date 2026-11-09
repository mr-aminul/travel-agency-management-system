import { useMemo, useState, type ReactNode } from 'react'
import { Check, ChevronDown, Pencil, Search, X } from 'lucide-react'
import { Button } from '@/components/shadcn/button'
import { Input } from '@/components/clients/clientShadcnFields'
import { cn } from '@/lib/utils'
import { parseMoneyInput } from '@/lib/caseMoney'
import {
  countryFlagEmoji,
  destinationCountryOptions,
} from '@/lib/destinationCountries'
import { useEnabledServiceOptions } from '@/lib/serviceCatalog'
import {
  listServiceCountries,
  useServiceTemplates,
} from '@/lib/serviceTemplatesStore'
import type { CreateCaseInput, ServiceType } from '@/types/case'
import '@/styles/layout-clients.css'

const FEE_CHIPS = [0, 5000, 10000, 20000, 50000] as const
const POPULAR_COUNTRY_LIMIT = 10

type AddServicePickerProps = {
  clientId: string
  clientName: string
  defaultCountry?: string
  onSubmit: (input: CreateCaseInput) => void
  onCancel: () => void
}

function formatFee(amount: number): string {
  if (amount <= 0) return 'Later'
  return `৳${amount.toLocaleString('en-BD')}`
}

const chipBase =
  'inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-[color,background-color,border-color,transform] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40'

const chipIdle =
  'border-transparent bg-[color-mix(in_srgb,var(--color-theme)_8%,var(--color-bg))] text-foreground hover:bg-[color-mix(in_srgb,var(--color-theme)_14%,var(--color-bg))]'

const chipSelected =
  'border-transparent bg-primary text-primary-foreground shadow-sm'

export function AddServicePicker({
  clientId,
  clientName,
  defaultCountry = '',
  onSubmit,
  onCancel,
}: AddServicePickerProps) {
  useServiceTemplates()
  const serviceOptions = useEnabledServiceOptions()
  const [service, setService] = useState<ServiceType | ''>('')
  const [country, setCountry] = useState('')
  const [countryQuery, setCountryQuery] = useState('')
  const [showAllCountries, setShowAllCountries] = useState(false)
  const [editingService, setEditingService] = useState(true)
  const [editingCountry, setEditingCountry] = useState(true)
  const [feeChip, setFeeChip] = useState<number | 'custom'>(0)
  const [customFee, setCustomFee] = useState('')
  const [triedSubmit, setTriedSubmit] = useState(false)

  const countryOptions = useMemo(() => {
    if (!service) return [] as string[]
    const catalog = listServiceCountries(service)
    if (catalog.length > 0) return catalog
    return destinationCountryOptions().map((option) => option.value)
  }, [service])

  const visibleCountries = useMemo(() => {
    const q = countryQuery.trim().toLowerCase()
    let pool = q
      ? countryOptions.filter((name) => name.toLowerCase().includes(q))
      : countryOptions
    // Surface a prior preference near the front without selecting it.
    const preferred = defaultCountry.trim()
    if (
      preferred &&
      !q &&
      pool.some((name) => name.toLowerCase() === preferred.toLowerCase())
    ) {
      pool = [
        preferred,
        ...pool.filter(
          (name) => name.toLowerCase() !== preferred.toLowerCase(),
        ),
      ]
    }
    if (q || showAllCountries || pool.length <= POPULAR_COUNTRY_LIMIT) {
      return pool
    }
    const selected = country.trim()
    const head = pool.slice(0, POPULAR_COUNTRY_LIMIT)
    if (selected && !head.includes(selected) && pool.includes(selected)) {
      return [selected, ...head.filter((name) => name !== selected)].slice(
        0,
        POPULAR_COUNTRY_LIMIT,
      )
    }
    return head
  }, [
    country,
    countryOptions,
    countryQuery,
    defaultCountry,
    showAllCountries,
  ])

  const hiddenCountryCount = Math.max(
    0,
    countryOptions.length - visibleCountries.length,
  )

  const selectedService = serviceOptions.find((option) => option.value === service)
  const SelectedIcon = selectedService?.icon
  const serviceFee =
    feeChip === 'custom' ? parseMoneyInput(customFee) : feeChip
  const feeReady =
    feeChip !== 'custom' || !customFee.trim() || serviceFee != null
  const canAdd = Boolean(service && country.trim() && feeReady)

  const feeLabel =
    feeChip === 'custom'
      ? customFee.trim()
        ? formatFee(serviceFee ?? 0)
        : 'Other'
      : formatFee(feeChip)

  const stepIndex = !service || editingService ? 0 : !country || editingCountry ? 1 : 2

  const pickService = (next: ServiceType) => {
    setService(next)
    setEditingService(false)
    setEditingCountry(true)
    setCountryQuery('')
    setShowAllCountries(false)
    setCountry('')
    const catalog = listServiceCountries(next)
    const options =
      catalog.length > 0
        ? catalog
        : destinationCountryOptions().map((option) => option.value)
    // Only auto-pick when there is exactly one country for this service.
    if (options.length === 1) {
      setCountry(options[0])
      setEditingCountry(false)
    }
  }

  const pickCountry = (next: string) => {
    setCountry(next)
    setEditingCountry(false)
  }

  const handleAdd = () => {
    setTriedSubmit(true)
    if (!service || !country.trim()) return
    if (feeChip === 'custom' && customFee.trim() && serviceFee == null) return

    const fee = Math.max(0, serviceFee ?? 0)
    onSubmit({
      clientId,
      service,
      serviceCountry: country.trim(),
      destination: country.trim(),
      serviceFee: fee,
      balance: fee,
    })
  }

  return (
    <section
      className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm"
      aria-label={`Add service for ${clientName}`}
    >
      <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-2 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <h2 className="m-0 text-base font-semibold tracking-tight text-foreground">
            Add Service
          </h2>
          <StepDots active={stepIndex} />
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Cancel"
        >
          <X size={18} strokeWidth={2.25} />
        </button>
      </div>

      <div className="mx-auto flex w-full max-w-2xl min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-3 sm:px-5">
        {/* Service */}
        {service && !editingService ? (
          <ChosenRow
            label="Service"
            onChange={() => {
              setEditingService(true)
              setEditingCountry(false)
            }}
          >
            {SelectedIcon ? (
              <SelectedIcon size={15} strokeWidth={2.25} aria-hidden />
            ) : null}
            <span>{selectedService?.label ?? service}</span>
          </ChosenRow>
        ) : (
          <div className="pd-add-service-step flex flex-col gap-2.5">
            <LabelRow
              title="Service"
              error={triedSubmit && !service ? 'Pick one' : undefined}
            />
            <div className="flex flex-wrap gap-2">
              {serviceOptions.map((option) => {
                const Icon = option.icon
                const selected = service === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => pickService(option.value)}
                    className={cn(chipBase, selected ? chipSelected : chipIdle)}
                  >
                    <Icon size={15} strokeWidth={2.25} aria-hidden />
                    {option.label}
                    {selected ? (
                      <Check size={14} strokeWidth={2.75} aria-hidden />
                    ) : null}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Country */}
        {service && !editingService ? (
          country && !editingCountry ? (
            <ChosenRow
              label="Country"
              onChange={() => setEditingCountry(true)}
            >
              {countryFlagEmoji(country) ? (
                <span className="text-base leading-none" aria-hidden>
                  {countryFlagEmoji(country)}
                </span>
              ) : null}
              <span>{country}</span>
            </ChosenRow>
          ) : (
            <div className="pd-add-service-step flex flex-col gap-2.5">
              <LabelRow
                title="Country"
                error={
                  triedSubmit && !country.trim() ? 'Pick one' : undefined
                }
              />
              {countryOptions.length > POPULAR_COUNTRY_LIMIT ||
              showAllCountries ? (
                <div className="relative max-w-xs">
                  <Search
                    size={14}
                    strokeWidth={2.25}
                    className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <input
                    value={countryQuery}
                    onChange={(event) => {
                      setCountryQuery(event.target.value)
                      if (event.target.value.trim()) setShowAllCountries(true)
                    }}
                    placeholder="Search"
                    className="h-9 w-full rounded-full border-0 bg-[color-mix(in_srgb,var(--color-theme)_8%,var(--color-bg))] pr-3 pl-8 text-sm outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-primary/35"
                  />
                </div>
              ) : null}
              <div className="flex flex-wrap gap-1.5">
                {visibleCountries.map((name) => {
                  const selected = country === name
                  const flag = countryFlagEmoji(name)
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => pickCountry(name)}
                      className={cn(
                        chipBase,
                        'px-2.5',
                        selected ? chipSelected : chipIdle,
                      )}
                    >
                      {flag ? (
                        <span className="text-base leading-none" aria-hidden>
                          {flag}
                        </span>
                      ) : null}
                      {name}
                      {selected ? (
                        <Check size={14} strokeWidth={2.75} aria-hidden />
                      ) : null}
                    </button>
                  )
                })}
              </div>
              {!countryQuery &&
              !showAllCountries &&
              hiddenCountryCount > 0 ? (
                <button
                  type="button"
                  onClick={() => setShowAllCountries(true)}
                  className="inline-flex h-8 w-fit items-center gap-1 rounded-lg px-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ChevronDown size={14} strokeWidth={2.25} aria-hidden />
                  {hiddenCountryCount} more
                </button>
              ) : null}
              {visibleCountries.length === 0 ? (
                <p className="m-0 text-sm text-muted-foreground">No match</p>
              ) : null}
            </div>
          )
        ) : null}

        {/* Fee */}
        {service && country && !editingService && !editingCountry ? (
          <div className="pd-add-service-step flex flex-col gap-2.5">
            <LabelRow
              title="Fee"
              error={
                triedSubmit &&
                feeChip === 'custom' &&
                customFee.trim() &&
                serviceFee == null
                  ? 'Enter amount'
                  : undefined
              }
            />
            <div className="flex flex-wrap gap-1.5">
              {FEE_CHIPS.map((amount) => {
                const selected = feeChip === amount
                return (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setFeeChip(amount)}
                    className={cn(chipBase, selected ? chipSelected : chipIdle)}
                  >
                    {amount === 0 ? 'Later' : `৳${amount / 1000}k`}
                  </button>
                )
              })}
              <button
                type="button"
                onClick={() => setFeeChip('custom')}
                className={cn(
                  chipBase,
                  feeChip === 'custom' ? chipSelected : chipIdle,
                )}
              >
                Other
              </button>
            </div>
            {feeChip === 'custom' ? (
              <div className="max-w-[11rem]">
                <Input
                  label="Amount (৳)"
                  inputMode="numeric"
                  value={customFee}
                  onChange={(event) => setCustomFee(event.target.value)}
                  placeholder="0"
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-border/80 px-4 py-3 sm:px-5">
        <Button
          type="button"
          variant="ghost"
          className="h-10 rounded-full px-4"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="button"
          className={cn(
            'h-10 rounded-full px-5 transition-all duration-200',
            canAdd
              ? 'shadow-md'
              : 'bg-muted text-muted-foreground hover:bg-muted',
          )}
          variant={canAdd ? 'default' : 'secondary'}
          onClick={handleAdd}
        >
          {canAdd ? `Add · ${feeLabel}` : 'Add Service'}
        </Button>
      </div>
    </section>
  )
}

function StepDots({ active }: { active: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-hidden>
      {[0, 1, 2].map((step) => (
        <span
          key={step}
          className={cn(
            'size-1.5 rounded-full transition-all duration-200',
            step === active
              ? 'w-3 bg-primary'
              : step < active
                ? 'bg-primary/55'
                : 'bg-border',
          )}
        />
      ))}
    </div>
  )
}

function ChosenRow({
  label,
  children,
  onChange,
}: {
  label: string
  children: ReactNode
  onChange: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-[color-mix(in_srgb,var(--color-theme)_7%,var(--color-bg))] px-3 py-2.5">
      <div className="min-w-0">
        <p className="m-0 text-[0.6875rem] font-medium text-muted-foreground">
          {label}
        </p>
        <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-sm font-semibold text-foreground">
          {children}
        </div>
      </div>
      <button
        type="button"
        onClick={onChange}
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
        aria-label={`Change ${label.toLowerCase()}`}
      >
        <Pencil size={14} strokeWidth={2.25} />
      </button>
    </div>
  )
}

function LabelRow({ title, error }: { title: string; error?: string }) {
  return (
    <div className="flex items-center gap-2">
      <p className="m-0 text-xs font-semibold tracking-wide text-muted-foreground">
        {title}
      </p>
      {error ? (
        <p className="m-0 text-xs font-medium text-destructive">{error}</p>
      ) : null}
    </div>
  )
}
