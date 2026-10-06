import { useState, type FormEvent } from 'react'
import { PartnerPhotoField } from '@/components/PartnerPhotoField'
import { ClientCustomFieldControl } from '@/components/clients/ClientCustomFieldControl'
import { Badge, Button, Checkbox, Input, Select } from '@/components/ui'
import {
  compactCustomFieldValues,
  emptyCustomFieldValues,
  missingRequiredCustomFields,
} from '@/lib/clientCustomFields'
import {
  useClientProfileFields,
  useClientProfileFieldsForTenant,
} from '@/lib/clientProfileFieldsStore'
import { usePartners } from '@/lib/partnersStore'
import { getClientByPhone, normalizePhone } from '@/lib/clientsStore'
import { useEnabledServiceOptions } from '@/lib/serviceCatalog'
import type { CreateClientInput, ServiceType } from '@/types/client'

type NewClientFormProps = {
  onSubmit: (input: CreateClientInput) => void
  onCancel?: () => void
  defaultPartnerId?: string
  variant?: 'staff' | 'public'
  serviceTenantId?: string
  submitLabel?: string
}

export function NewClientForm({
  onSubmit,
  onCancel,
  defaultPartnerId,
  variant = 'staff',
  serviceTenantId,
  submitLabel = 'Register client',
}: NewClientFormProps) {
  const isPublic = variant === 'public'
  const serviceOptions = useEnabledServiceOptions(serviceTenantId)
  const tenantCustomFields = useClientProfileFieldsForTenant(serviceTenantId)
  const sessionCustomFields = useClientProfileFields()
  const customFieldDefs = isPublic ? tenantCustomFields : sessionCustomFields
  const partners = usePartners()
  const [name, setName] = useState('')
  const [banglaName, setBanglaName] = useState('')
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
  const [customFields, setCustomFields] = useState<Record<string, string>>({})
  const [partnerId, setPartnerId] = useState(defaultPartnerId ?? '')
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>()
  const [primaryService, setPrimaryService] = useState<ServiceType>(
    () => serviceOptions[0]?.value ?? 'Tour Package',
  )
  const [idChecked, setIdChecked] = useState(isPublic)
  const [openFirstCase, setOpenFirstCase] = useState(!isPublic)
  const [triedSubmit, setTriedSubmit] = useState(false)

  const phoneDigits = normalizePhone(phone)
  const existingClient = phoneDigits
    ? getClientByPhone(phoneDigits, undefined, serviceTenantId)
    : undefined

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
  const customFieldValues = emptyCustomFieldValues(customFieldDefs, customFields)
  const missingCustom = missingRequiredCustomFields(
    customFieldDefs,
    customFieldValues,
  )

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    setTriedSubmit(true)
    if (!name.trim() || !phone.trim() || existingClient) return
    if (!isPublic && !idChecked) return
    if (missingRequiredCustomFields(customFieldDefs, customFieldValues).length) {
      return
    }

    onSubmit({
      name,
      banglaName,
      fatherName,
      dateOfBirth,
      placeOfBirth,
      gender,
      phone,
      email,
      address,
      presentAddress: address,
      customFields: compactCustomFieldValues(customFieldValues),
      partnerId: defaultPartnerId || partnerId || undefined,
      avatarUrl,
      nid,
      passport,
      passportExpiry,
      passportIssuedOn,
      passportPlaceOfIssue,
      primaryService,
      idChecked: isPublic ? true : idChecked,
      openFirstCase: isPublic ? false : openFirstCase,
    })
  }

  return (
    <form
      className={
        isPublic ? 'pd-clients-form pd-clients-form--public' : 'pd-clients-form'
      }
      onSubmit={handleSubmit}
      noValidate
    >
      <div className="pd-clients-form__scroll">
        <div className="pd-clients-form__block">
          <PartnerPhotoField
            name={name}
            fallbackName="Client"
            value={avatarUrl}
            onChange={setAvatarUrl}
          >
            <Input
              label="Full name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Client name"
              error={nameError}
            />
          </PartnerPhotoField>

          <div className="pd-clients-form__grid">
            <Input
              label="Bangla name"
              value={banglaName}
              onChange={(event) => setBanglaName(event.target.value)}
              placeholder="বাংলা নাম"
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
            {customFieldDefs.map((field) => (
              <ClientCustomFieldControl
                key={field.id}
                field={field}
                value={customFieldValues[field.id] ?? ''}
                error={
                  triedSubmit && missingCustom.includes(field.label)
                    ? `${field.label} is required.`
                    : undefined
                }
                onChange={(value) =>
                  setCustomFields((current) => ({
                    ...current,
                    [field.id]: value,
                  }))
                }
              />
            ))}
            {isPublic ? null : (
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
            )}
          </div>
        </div>

        {isPublic ? null : (
          <>
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
              {idChecked ? (
                <Badge variant="completed">ID check cleared</Badge>
              ) : null}
            </div>

            <div className="pd-clients-form__block">
              <p className="pd-clients-form__heading">Next step</p>
              <Checkbox
                label="Add first service after registration"
                checked={openFirstCase}
                onChange={(event) => setOpenFirstCase(event.target.checked)}
              />
              <p className="pd-clients-form__hint">
                Recommended — capture why they came while the conversation is
                fresh.
              </p>
            </div>
          </>
        )}
      </div>

      <div className="pd-clients-form__footer">
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  )
}
