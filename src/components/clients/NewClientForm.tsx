import { useState, type FormEvent } from 'react'
import { Badge, Button, Checkbox, Input, Select, Textarea } from '@/components/ui'
import { getClientByPhone, normalizePhone, getEnabledServiceTypeOptions } from '@/lib/clientsStore'
import type { CreateClientInput, ServiceType } from '@/types/client'

type NewClientFormProps = {
  onSubmit: (input: CreateClientInput) => void
  onCancel: () => void
}

export function NewClientForm({ onSubmit, onCancel }: NewClientFormProps) {
  const serviceOptions = getEnabledServiceTypeOptions()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [nid, setNid] = useState('')
  const [passport, setPassport] = useState('')
  const [address, setAddress] = useState('')
  const [primaryService, setPrimaryService] = useState<ServiceType>(
    () => serviceOptions[0]?.value ?? 'Leisure',
  )
  const [idChecked, setIdChecked] = useState(false)
  const [openFirstCase, setOpenFirstCase] = useState(true)
  const [triedSubmit, setTriedSubmit] = useState(false)

  const phoneDigits = normalizePhone(phone)
  const existingClient = phoneDigits ? getClientByPhone(phoneDigits) : undefined

  const nameError =
    triedSubmit && !name.trim() ? 'Full name is required.' : undefined
  const phoneError = (() => {
    if (!triedSubmit) return undefined
    if (!phone.trim()) return 'Mobile number is required.'
    if (existingClient) {
      return `This mobile number is already registered to ${existingClient.name}.`
    }
    return undefined
  })()
  const checkError =
    triedSubmit && !idChecked
      ? 'Confirm the mobile number duplicate check.'
      : undefined

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    setTriedSubmit(true)
    if (!name.trim() || !phone.trim() || !idChecked || existingClient) return

    onSubmit({
      name,
      phone,
      email,
      address,
      nid,
      passport,
      primaryService,
      idChecked,
      openFirstCase,
    })
  }

  return (
    <form className="pd-clients-form" onSubmit={handleSubmit} noValidate>
      <div className="pd-clients-form__scroll">
        <div className="pd-clients-form__block">
          <p className="pd-clients-form__heading">Client (who)</p>
          <p className="pd-clients-form__hint">
            Mobile number is the unique identifier. One person across every
            service — open a case next for their purpose.
          </p>

          <div className="pd-clients-form__grid">
            <Input
              label="Full name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Client name"
              error={nameError}
            />
            <Select
              label="Primary service"
              required
              value={primaryService}
              onChange={(event) =>
                setPrimaryService(event.target.value as ServiceType)
              }
              options={serviceOptions}
            />
            <Input
              label="Mobile number"
              type="tel"
              required
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="01XXXXXXXXX"
              error={phoneError}
            />
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="client@email.com"
            />
            <Input
              label="NID number"
              value={nid}
              onChange={(event) => setNid(event.target.value)}
              placeholder="Optional"
            />
            <Input
              label="Passport number"
              value={passport}
              onChange={(event) => setPassport(event.target.value)}
              placeholder="Optional"
            />
            <Textarea
              className="pd-clients-form__full"
              label="Address"
              rows={2}
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="Full address"
            />
          </div>
        </div>

        <div className="pd-clients-form__block">
          <p className="pd-clients-form__heading">Duplicate check</p>
          <p className="pd-clients-form__hint">
            Confirm this mobile number is not already registered to another
            client.
          </p>
          <Checkbox
            label="I confirm this mobile number is unique"
            checked={idChecked}
            onChange={(event) => setIdChecked(event.target.checked)}
          />
          {checkError ? (
            <p className="pd-field__error" role="alert">
              {checkError}
            </p>
          ) : null}
          {idChecked ? <Badge variant="completed">ID check cleared</Badge> : null}
        </div>

        <div className="pd-clients-form__block">
          <p className="pd-clients-form__heading">Next step</p>
          <Checkbox
            label="Open first case after registration"
            checked={openFirstCase}
            onChange={(event) => setOpenFirstCase(event.target.checked)}
          />
          <p className="pd-clients-form__hint">
            Recommended — capture why they came while the conversation is fresh.
          </p>
        </div>
      </div>

      <div className="pd-clients-form__footer">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Register client</Button>
      </div>
    </form>
  )
}
