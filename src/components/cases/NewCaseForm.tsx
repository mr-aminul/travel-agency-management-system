import { useState, type FormEvent } from 'react'
import { Button, Input, Select, Textarea } from '@/components/ui'
import { CASE_SERVICE_OPTIONS } from '@/lib/casesStore'
import { parseMoneyInput } from '@/lib/caseMoney'
import {
  employeeAssignmentOptions,
  useEmployees,
} from '@/lib/employeesStore'
import { useEnabledServiceOptions } from '@/lib/serviceCatalog'
import { useClients } from '@/lib/clientsStore'
import {
  destinationCountryOptions,
  formatDestination,
} from '@/lib/destinationCountries'
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
      : (serviceOptions[0]?.value ?? 'Leisure')
  const [clientId, setClientId] = useState(defaultClientId)
  const [service, setService] = useState<ServiceType>(resolvedDefault)
  const [destination, setDestination] = useState('')
  const [country, setCountry] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [departureDate, setDepartureDate] = useState('')
  const [serviceFee, setServiceFee] = useState('')
  const [description, setDescription] = useState('')
  const [triedSubmit, setTriedSubmit] = useState(false)

  const clientOptions = clients.map((client) => ({
    value: client.id,
    label: `${client.name} (${client.phone})`,
  }))

  const activeService = lockService ? resolvedDefault : service
  const countryOptions = destinationCountryOptions(
    listServiceCountries(activeService),
  )
  const countryHasOwnChecklist = listServiceCountries(activeService).some(
    (item) => item.toLowerCase() === country.trim().toLowerCase(),
  )
  const resolvedClientId = lockClient ? defaultClientId : clientId
  const clientError =
    triedSubmit && !resolvedClientId
      ? 'Select a client for this service.'
      : undefined

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    setTriedSubmit(true)
    if (!resolvedClientId) return

    const parsedFee = parseMoneyInput(serviceFee)
    const serviceName = lockService ? resolvedDefault : service
    onSubmit({
      clientId: resolvedClientId,
      service: serviceName,
      serviceCountry: country.trim() || undefined,
      destination: formatDestination(destination, country),
      assignedTo,
      departureDate: departureDate || undefined,
      serviceFee: parsedFee,
      description,
    })
  }

  return (
    <form className="pd-cases-form" onSubmit={handleSubmit} noValidate>
      <div className="pd-cases-form__scroll">
        <div className="pd-cases-form__block">
          <p className="pd-cases-form__heading">Service</p>
          <p className="pd-cases-form__hint">
            One service = one need this client has.
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
              onChange={(event) => setClientId(event.target.value)}
              options={clientOptions}
              error={clientError}
              disabled={lockClient}
            />
            <Select
              label="Service"
              required
              value={lockService ? resolvedDefault : service}
              onChange={(event) =>
                setService(event.target.value as ServiceType)
              }
              options={serviceOptions.length ? serviceOptions : CASE_SERVICE_OPTIONS}
              disabled={lockService}
            />
            <Select
              label="Country"
              searchable
              searchPlaceholder="Search countries…"
              placeholder="Select country"
              value={country}
              onChange={(event) => setCountry(event.target.value)}
              options={countryOptions}
              hint={
                countryHasOwnChecklist
                  ? 'This country has its own status journey and documents.'
                  : 'Used to pick a country-specific checklist when one exists.'
              }
            />
            <Input
              label="City / destination"
              value={destination}
              onChange={(event) => setDestination(event.target.value)}
              placeholder="City or area"
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
            />
            <Input
              label="Service fee (৳)"
              inputMode="numeric"
              value={serviceFee}
              onChange={(event) => setServiceFee(event.target.value)}
              placeholder="0"
              hint="What you charge for this service. Balance due starts at this amount."
            />
            <Textarea
              className="pd-cases-form__full"
              label="Notes"
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Package, employer, university, or booking notes"
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
