import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { CASE_SERVICE_OPTIONS } from '@/lib/casesStore'
import { parseMoneyInput } from '@/lib/caseMoney'
import { Button } from '@/components/shadcn/button'
import { Input, Select, Textarea } from '@/components/clients/clientShadcnFields'
import {
  employeeAssignmentOptions,
  useEmployees,
} from '@/lib/employeesStore'
import { useEnabledServiceOptions } from '@/lib/serviceCatalog'
import { iconForService } from '@/lib/serviceIcons'
import { useClients } from '@/lib/clientsStore'
import {
  destinationCountryOptions,
  formatDestination,
} from '@/lib/destinationCountries'
import {
  validateOptionalDate,
  validateOptionalMoney,
  validateOptionalText,
  validateRequiredSelect,
} from '@/lib/fieldValidation'
import { useTouchedFields } from '@/lib/useTouchedFields'
import {
  listServiceCountries,
  useServiceTemplates,
} from '@/lib/serviceTemplatesStore'
import type { ServiceType, CreateCaseInput } from '@/types/case'

type NewCaseFormProps = {
  onSubmit: (input: CreateCaseInput) => void
  onCancel: () => void
  defaultClientId?: string
  defaultService?: ServiceType
  /** Prefill from client registration / preferred country. */
  defaultCountry?: string
  /** When true, client is locked to defaultClientId */
  lockClient?: boolean
  /** When true, service is locked to defaultService */
  lockService?: boolean
}

type Field =
  | 'clientId'
  | 'service'
  | 'country'
  | 'destination'
  | 'assignedTo'
  | 'departureDate'
  | 'serviceFee'
  | 'description'

export function NewCaseForm({
  onSubmit,
  onCancel,
  defaultClientId = '',
  defaultService,
  defaultCountry = '',
  lockClient = false,
  lockService = false,
}: NewCaseFormProps) {
  const clients = useClients()
  const employees = useEmployees()
  useServiceTemplates()
  const serviceOptions = useEnabledServiceOptions()
  const resolvedDefault =
    defaultService &&
      serviceOptions.some((option) => option.value === defaultService)
      ? defaultService
      : (serviceOptions[0]?.value ?? 'Tour Package')
  const [clientId, setClientId] = useState(defaultClientId)
  const [service, setService] = useState<ServiceType>(resolvedDefault)
  const [destination, setDestination] = useState('')
  const [country, setCountry] = useState(defaultCountry.trim())
  const [assignedTo, setAssignedTo] = useState('')
  const [departureDate, setDepartureDate] = useState('')
  const [serviceFee, setServiceFee] = useState('')
  const [description, setDescription] = useState('')
  const { markTouched, markAllTouched, showError, blur } =
    useTouchedFields<Field>()

  const clientOptions = clients.map((client) => ({
    value: client.id,
    label: `${client.name} (${client.phone})`,
  }))

  const activeService = lockService ? resolvedDefault : service
  const catalogCountries = useMemo(
    () => listServiceCountries(activeService),
    [activeService],
  )
  const countryOptions = useMemo(() => {
    if (catalogCountries.length) {
      return [
        { value: '', label: 'Select country' },
        ...catalogCountries.map((name) => ({ value: name, label: name })),
      ]
    }
    return [
      { value: '', label: 'Select country' },
      ...destinationCountryOptions(),
    ]
  }, [catalogCountries])
  const resolvedClientId = lockClient ? defaultClientId : clientId
  const serviceName = lockService ? resolvedDefault : service

  useEffect(() => {
    if (!country) {
      if (catalogCountries.length === 1) setCountry(catalogCountries[0])
      return
    }
    if (
      catalogCountries.length &&
      !catalogCountries.some(
        (name) => name.toLowerCase() === country.toLowerCase(),
      )
    ) {
      setCountry(catalogCountries.length === 1 ? catalogCountries[0] : '')
    }
  }, [catalogCountries, country])

  const errors: Record<Field, string | undefined> = {
    clientId: validateRequiredSelect(resolvedClientId, 'client'),
    service: validateRequiredSelect(serviceName, 'service'),
    country: undefined,
    destination: validateOptionalText(destination, 'City / destination'),
    assignedTo: undefined,
    departureDate: validateOptionalDate(departureDate, 'Departure date'),
    serviceFee: validateOptionalMoney(serviceFee, 'Service fee'),
    description: validateOptionalText(description, 'Notes', 2000),
  }

  const fieldError = (field: Field) =>
    showError(field) ? errors[field] : undefined

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const fields: Field[] = [
      'clientId',
      'service',
      'destination',
      'departureDate',
      'serviceFee',
      'description',
    ]
    markAllTouched(fields)
    if (fields.some((field) => errors[field])) return

    onSubmit({
      clientId: resolvedClientId,
      service: serviceName,
      serviceCountry: country.trim() || undefined,
      destination: formatDestination(destination, country),
      assignedTo,
      departureDate: departureDate || undefined,
      serviceFee: parseMoneyInput(serviceFee),
      description,
    })
  }

  return (
    <form className="flex h-full min-h-0 flex-col" onSubmit={handleSubmit} noValidate>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <div className="flex flex-col gap-4">
          <p className="m-0 text-sm font-semibold text-foreground">Service</p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Select
                label="Client"
                required
                searchable
                searchPlaceholder="Search clients…"
                placeholder="Select client"
                value={resolvedClientId}
                onChange={(event) => {
                  setClientId(event.target.value)
                  markTouched('clientId')
                }}
                onBlur={blur('clientId')}
                options={clientOptions}
                error={fieldError('clientId')}
                disabled={lockClient}
              />
            </div>
            <Select
              label="Service"
              required
              value={serviceName}
              onChange={(event) => {
                setService(event.target.value as ServiceType)
                markTouched('service')
              }}
              onBlur={blur('service')}
              options={
                serviceOptions.length
                  ? serviceOptions
                  : CASE_SERVICE_OPTIONS.map((option) => ({
                    ...option,
                    icon: iconForService(option.value),
                  }))
              }
              disabled={lockService}
              error={fieldError('service')}
            />
            <Select
              label="Country"
              searchable
              searchPlaceholder="Search countries…"
              placeholder="Select country"
              value={country}
              onChange={(event) => setCountry(event.target.value)}
              options={countryOptions}
            />
            <Input
              label="City / destination"
              value={destination}
              onChange={(event) => setDestination(event.target.value)}
              onBlur={blur('destination')}
              placeholder="City or area"
              error={fieldError('destination')}
            />
            <Select
              label="Assigned to"
              searchable
              searchPlaceholder="Search employees…"
              placeholder="Select employee"
              value={assignedTo}
              onChange={(event) => setAssignedTo(event.target.value)}
              options={employeeAssignmentOptions(employees)}
            />
            <Input
              label="Departure date"
              type="date"
              value={departureDate}
              onChange={(event) => setDepartureDate(event.target.value)}
              onBlur={blur('departureDate')}
              error={fieldError('departureDate')}
            />
            <Input
              label="Service fee (৳)"
              inputMode="numeric"
              value={serviceFee}
              onChange={(event) => setServiceFee(event.target.value)}
              onBlur={blur('serviceFee')}
              placeholder="0"
              error={fieldError('serviceFee')}
            />
            <div className="sm:col-span-2">
              <Textarea
                label="Notes"
                rows={3}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                onBlur={blur('description')}
                placeholder="Package, employer, university, or booking notes"
                error={fieldError('description')}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border px-5 py-4">
        <Button type="button" variant="outline" className="h-9 rounded-lg" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="h-9 rounded-lg">Add Service</Button>
      </div>
    </form>
  )
}
