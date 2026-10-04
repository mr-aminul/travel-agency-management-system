import { useState, type FormEvent } from 'react'
import { Button, Input, Select, Textarea } from '@/components/ui'
import { CASE_SERVICE_OPTIONS, getEnabledServiceOptions } from '@/lib/casesStore'
import { useClients } from '@/lib/clientsStore'
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
  const serviceOptions = getEnabledServiceOptions()
  const resolvedDefault =
    defaultService &&
    serviceOptions.some((option) => option.value === defaultService)
      ? defaultService
      : (serviceOptions[0]?.value ?? 'Leisure')
  const [clientId, setClientId] = useState(defaultClientId)
  const [service, setService] = useState<ServiceType>(resolvedDefault)
  const [destination, setDestination] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [departureDate, setDepartureDate] = useState('')
  const [balance, setBalance] = useState('')
  const [description, setDescription] = useState('')
  const [triedSubmit, setTriedSubmit] = useState(false)

  const clientOptions = clients.map((client) => ({
    value: client.id,
    label: `${client.name} (${client.phone})`,
  }))

  const resolvedClientId = lockClient ? defaultClientId : clientId
  const clientError =
    triedSubmit && !resolvedClientId
      ? 'Select a client for this case.'
      : undefined

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    setTriedSubmit(true)
    if (!resolvedClientId) return

    const parsedBalance = Number(balance.replace(/,/g, ''))
    onSubmit({
      clientId: resolvedClientId,
      service: lockService ? resolvedDefault : service,
      destination,
      assignedTo,
      departureDate: departureDate || undefined,
      balance: Number.isFinite(parsedBalance) ? parsedBalance : 0,
      description,
    })
  }

  return (
    <form className="pd-cases-form" onSubmit={handleSubmit} noValidate>
      <div className="pd-cases-form__scroll">
        <div className="pd-cases-form__block">
          <p className="pd-cases-form__heading">Purpose (case)</p>
          <p className="pd-cases-form__hint">
            One case = one reason the client came to you.
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
            <Input
              label="Destination"
              value={destination}
              onChange={(event) => setDestination(event.target.value)}
              placeholder="City, country"
            />
            <Input
              label="Assigned to"
              value={assignedTo}
              onChange={(event) => setAssignedTo(event.target.value)}
              placeholder="Staff name"
            />
            <Input
              label="Departure date"
              type="date"
              value={departureDate}
              onChange={(event) => setDepartureDate(event.target.value)}
            />
            <Input
              label="Balance due (৳)"
              inputMode="numeric"
              value={balance}
              onChange={(event) => setBalance(event.target.value)}
              placeholder="0"
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
        <Button type="submit">Open case</Button>
      </div>
    </form>
  )
}
