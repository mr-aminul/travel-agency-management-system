import { useState, type FormEvent } from 'react'
import { PartnerPhotoField } from '@/components/PartnerPhotoField'
import { Badge, Button, Checkbox, Input, Select } from '@/components/ui'
import { usePartners } from '@/lib/partnersStore'
import { getClientByPhone, normalizePhone } from '@/lib/clientsStore'
import { DESTINATION_COUNTRIES } from '@/lib/destinationCountries'
import { useEnabledServiceOptions } from '@/lib/serviceCatalog'
import type { CreateClientInput, ServiceType } from '@/types/client'

type NewClientFormProps = {
  onSubmit: (input: CreateClientInput) => void
  onCancel: () => void
  defaultPartnerId?: string
}

const COUNTRY_OPTIONS = [
  { value: '', label: '—' },
  ...DESTINATION_COUNTRIES.map((country) => ({
    value: country,
    label: country,
  })),
]

export function NewClientForm({
  onSubmit,
  onCancel,
  defaultPartnerId,
}: NewClientFormProps) {
  const serviceOptions = useEnabledServiceOptions()
  const partners = usePartners()
  const [name, setName] = useState('')
  const [fatherName, setFatherName] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [placeOfBirth, setPlaceOfBirth] = useState('')
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [nid, setNid] = useState('')
  const [passport, setPassport] = useState('')
  const [passportExpiry, setPassportExpiry] = useState('')
  const [passportIssuedOn, setPassportIssuedOn] = useState('')
  const [passportPlaceOfIssue, setPassportPlaceOfIssue] = useState('')
  const [address, setAddress] = useState('')
  const [profession, setProfession] = useState('')
  const [preferredCountry, setPreferredCountry] = useState('')
  const [partnerId, setPartnerId] = useState(defaultPartnerId ?? '')
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>()
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
      fatherName,
      dateOfBirth,
      placeOfBirth,
      gender,
      phone,
      email,
      address,
      presentAddress: address,
      profession,
      preferredCountry,
      partnerId: partnerId || undefined,
      avatarUrl,
      nid,
      passport,
      passportExpiry,
      passportIssuedOn,
      passportPlaceOfIssue,
      primaryService,
      idChecked,
      openFirstCase,
    })
  }

  return (
    <form className="pd-clients-form" onSubmit={handleSubmit} noValidate>
      <div className="pd-clients-form__scroll">
        <div className="pd-clients-form__block">
          <p className="pd-clients-form__heading">Client</p>
          <p className="pd-clients-form__hint">
            Mobile number is the unique identifier. One person across every
            service.
          </p>
          <PartnerPhotoField
            name={name}
            fallbackName="Client"
            value={avatarUrl}
            onChange={setAvatarUrl}
          />

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
            <Select
              label="Gender"
              value={gender}
              onChange={(event) =>
                setGender(event.target.value as 'Male' | 'Female' | 'Other')
              }
              options={[
                { value: 'Male', label: 'Male' },
                { value: 'Female', label: 'Female' },
                { value: 'Other', label: 'Other' },
              ]}
            />
            <Input
              label="Date of birth"
              type="date"
              value={dateOfBirth}
              onChange={(event) => setDateOfBirth(event.target.value)}
            />
            <Input
              label="Place of birth"
              value={placeOfBirth}
              onChange={(event) => setPlaceOfBirth(event.target.value)}
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
              label="Father name"
              value={fatherName}
              onChange={(event) => setFatherName(event.target.value)}
            />
            <Input
              label="Address"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="Present address"
            />
            <Input
              label="NID number"
              value={nid}
              onChange={(event) => setNid(event.target.value)}
            />
            <Input
              label="Passport number"
              value={passport}
              onChange={(event) => setPassport(event.target.value)}
            />
            <Input
              label="Date of issue"
              type="date"
              value={passportIssuedOn}
              onChange={(event) => setPassportIssuedOn(event.target.value)}
            />
            <Input
              label="Date of expiry"
              type="date"
              value={passportExpiry}
              onChange={(event) => setPassportExpiry(event.target.value)}
            />
            <Input
              label="Place of issue"
              value={passportPlaceOfIssue}
              onChange={(event) => setPassportPlaceOfIssue(event.target.value)}
            />
            <Input
              label="Profession"
              value={profession}
              onChange={(event) => setProfession(event.target.value)}
            />
            <Select
              label="Preferred country"
              value={preferredCountry}
              searchable
              onChange={(event) => setPreferredCountry(event.target.value)}
              options={COUNTRY_OPTIONS}
            />
            <Select
              label="Sub Agent"
              value={partnerId}
              onChange={(event) => setPartnerId(event.target.value)}
              options={[
                { value: '', label: 'None' },
                ...partners.map((partner) => ({
                  value: partner.id,
                  label: partner.name,
                })),
              ]}
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
            label="Add first service after registration"
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
