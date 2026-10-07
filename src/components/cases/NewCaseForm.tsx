import { useState, type FormEvent } from 'react'
import { CASE_SERVICE_OPTIONS } from '@/lib/casesStore'
import { parseMoneyInput } from '@/lib/caseMoney'
import { Button, Input, Select, Textarea } from '@/components/ui'
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
  const [country, setCountry] = useState('')
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
  const countryOptions = destinationCountryOptions(
    listServiceCountries(activeService),
  )
  const resolvedClientId = lockClient ? defaultClientId : clientId
  const serviceName = lockService ? resolvedDefault : service

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
    <form className="pd-cases-form" onSubmit={handleSubmit} noValidate>
      <div className="pd-cases-form__scroll">
        <div className="pd-cases-form__block">
          <p className="pd-cases-form__heading">Service</p>
          <p className="pd-cases-form__hint">
            Only client and service type are required. Country, fee, and
            assignment can be filled in later.
          </p>

          <div className="pd-cases-form__grid">
            <Select
              className="pd-cases-form__full"
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
              hint="Optional — helps pick the right checklist"
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
              hint="Optional — who owns this file"
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
              hint="Optional — can set when quoting"
              inputMode="numeric"
              value={serviceFee}
              onChange={(event) => setServiceFee(event.target.value)}
              onBlur={blur('serviceFee')}
              placeholder="0"
              error={fieldError('serviceFee')}
            />
            <Textarea
              className="pd-cases-form__full"
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

      <div className="pd-cases-form__footer">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Add service</Button>
      </div>
    </form>
  )
}
