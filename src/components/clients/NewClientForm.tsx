import { useState, type FormEvent, type FocusEvent } from 'react'
import { ProfilePhotoField } from '@/components/ProfilePhotoField'
import { ClientCustomFieldControl } from '@/components/clients/ClientCustomFieldControl'
import { Button, Input, Select } from '@/components/ui'
import {
  compactCustomFieldValues,
  emptyCustomFieldValues,
} from '@/lib/clientCustomFields'
import {
  type NewClientFormField,
  type NewClientFormValues,
  validateNewClientField,
} from '@/lib/clientFormValidation'
import {
  useClientProfileFields,
  useClientProfileFieldsForTenant,
} from '@/lib/clientProfileFieldsStore'
import { useSubAgents } from '@/lib/subAgentsStore'
import { getClientByPhone, normalizePhone } from '@/lib/clientsStore'
import { useEnabledServiceOptions } from '@/lib/serviceCatalog'
import type { CreateClientInput, ServiceType } from '@/types/client'

type NewClientFormProps = {
  onSubmit: (input: CreateClientInput) => void
  onCancel?: () => void
  defaultSubAgentId?: string
  variant?: 'staff' | 'public'
  serviceTenantId?: string
  submitLabel?: string
}

export function NewClientForm({
  onSubmit,
  onCancel,
  defaultSubAgentId,
  variant = 'staff',
  serviceTenantId,
  submitLabel = 'Register client',
}: NewClientFormProps) {
  const isPublic = variant === 'public'
  const serviceOptions = useEnabledServiceOptions(serviceTenantId)
  const tenantCustomFields = useClientProfileFieldsForTenant(serviceTenantId)
  const sessionCustomFields = useClientProfileFields()
  const customFieldDefs = isPublic ? tenantCustomFields : sessionCustomFields
  const subAgents = useSubAgents()
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
  const [subAgentId, setSubAgentId] = useState(defaultSubAgentId ?? '')
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>()
  const [primaryService, setPrimaryService] = useState<ServiceType>(
    () => serviceOptions[0]?.value ?? 'Tour Package',
  )
  const [touched, setTouched] = useState<Partial<Record<NewClientFormField, boolean>>>(
    {},
  )
  const [triedSubmit, setTriedSubmit] = useState(false)

  const phoneDigits = normalizePhone(phone)
  const existingClient = phoneDigits
    ? getClientByPhone(phoneDigits, undefined, serviceTenantId)
    : undefined
  const customFieldValues = emptyCustomFieldValues(customFieldDefs, customFields)
  const requiredCustomFields = customFieldDefs.filter((field) => field.required)
  const optionalCustomFields = customFieldDefs.filter((field) => !field.required)

  const values: NewClientFormValues = {
    name,
    phone,
    email,
    banglaName,
    fatherName,
    dateOfBirth,
    placeOfBirth,
    address,
    nid,
    passport,
    passportIssuedOn,
    passportExpiry,
    passportPlaceOfIssue,
    primaryService,
    customFields: customFieldValues,
  }

  const markTouched = (field: NewClientFormField) => {
    setTouched((current) =>
      current[field] ? current : { ...current, [field]: true },
    )
  }

  const showError = (field: NewClientFormField) =>
    triedSubmit || Boolean(touched[field])

  const fieldError = (field: NewClientFormField) => {
    if (!showError(field)) return undefined
    return validateNewClientField(field, values, {
      duplicateName: existingClient?.name,
      customFieldDefs,
    })
  }

  const handleBlur =
    (field: NewClientFormField) =>
    (_event?: FocusEvent<HTMLInputElement>) => {
      markTouched(field)
    }

  const allFieldKeys = (): NewClientFormField[] => [
    'name',
    'phone',
    'primaryService',
    'passport',
    'passportPlaceOfIssue',
    'passportIssuedOn',
    'passportExpiry',
    'nid',
    'email',
    'address',
    'banglaName',
    'fatherName',
    'dateOfBirth',
    'placeOfBirth',
    ...customFieldDefs.map((field) => `custom:${field.id}` as const),
  ]

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    setTriedSubmit(true)
    const nextTouched: Partial<Record<NewClientFormField, boolean>> = {
      ...touched,
    }
    for (const key of allFieldKeys()) nextTouched[key] = true
    setTouched(nextTouched)

    const hasError = allFieldKeys().some(
      (field) =>
        validateNewClientField(field, values, {
          duplicateName: existingClient?.name,
          customFieldDefs,
        }) != null,
    )
    if (hasError) return

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
      subAgentId: defaultSubAgentId || subAgentId || undefined,
      avatarUrl,
      nid,
      passport,
      passportExpiry,
      passportIssuedOn,
      passportPlaceOfIssue,
      primaryService,
      idChecked: true,
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
          <ProfilePhotoField
            name={name}
            fallbackName="Client"
            kind="client"
            value={avatarUrl}
            onChange={setAvatarUrl}
          >
            <Input
              label="Full name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              onBlur={handleBlur('name')}
              placeholder="Client name"
              error={fieldError('name')}
            />
          </ProfilePhotoField>

          <div className="pd-clients-form__grid">
            <Input
              label="Mobile number"
              type="tel"
              required
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              onBlur={handleBlur('phone')}
              placeholder="01XXXXXXXXX"
              error={fieldError('phone')}
            />
            <Select
              label="Primary service"
              value={primaryService}
              onChange={(event) => {
                setPrimaryService(event.target.value as ServiceType)
                markTouched('primaryService')
              }}
              onBlur={handleBlur('primaryService')}
              options={serviceOptions}
              error={fieldError('primaryService')}
            />
            {requiredCustomFields.map((field) => {
              const key = `custom:${field.id}` as const
              return (
                <ClientCustomFieldControl
                  key={field.id}
                  field={field}
                  value={customFieldValues[field.id] ?? ''}
                  error={fieldError(key)}
                  onChange={(value) =>
                    setCustomFields((current) => ({
                      ...current,
                      [field.id]: value,
                    }))
                  }
                  onBlur={handleBlur(key)}
                />
              )
            })}
          </div>
        </div>

        <div className="pd-clients-form__block">
          <div className="pd-clients-form__grid">
            <Input
              label="Passport number"
              value={passport}
              onChange={(event) => setPassport(event.target.value)}
              onBlur={handleBlur('passport')}
              error={fieldError('passport')}
            />
            <Input
              label="Place of issue"
              value={passportPlaceOfIssue}
              onChange={(event) => setPassportPlaceOfIssue(event.target.value)}
              onBlur={handleBlur('passportPlaceOfIssue')}
              error={fieldError('passportPlaceOfIssue')}
            />
            <Input
              label="Date of issue"
              type="date"
              required={Boolean(passport.trim())}
              value={passportIssuedOn}
              onChange={(event) => setPassportIssuedOn(event.target.value)}
              onBlur={handleBlur('passportIssuedOn')}
              error={fieldError('passportIssuedOn')}
            />
            <Input
              label="Date of expiry"
              type="date"
              required={Boolean(passport.trim())}
              value={passportExpiry}
              onChange={(event) => setPassportExpiry(event.target.value)}
              onBlur={handleBlur('passportExpiry')}
              error={fieldError('passportExpiry')}
            />
            <Input
              label="NID number"
              value={nid}
              onChange={(event) => setNid(event.target.value)}
              onBlur={handleBlur('nid')}
              error={fieldError('nid')}
            />
          </div>
        </div>

        <div className="pd-clients-form__block">
          <div className="pd-clients-form__grid">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onBlur={handleBlur('email')}
              placeholder="client@email.com"
              error={fieldError('email')}
            />
            <Input
              label="Address"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              onBlur={handleBlur('address')}
              placeholder="Present address"
              error={fieldError('address')}
            />
          </div>
        </div>

        <div className="pd-clients-form__block">
          <div className="pd-clients-form__grid">
            <Input
              label="Bangla name"
              value={banglaName}
              onChange={(event) => setBanglaName(event.target.value)}
              onBlur={handleBlur('banglaName')}
              placeholder="বাংলা নাম"
              error={fieldError('banglaName')}
            />
            <Input
              label="Father name"
              value={fatherName}
              onChange={(event) => setFatherName(event.target.value)}
              onBlur={handleBlur('fatherName')}
              error={fieldError('fatherName')}
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
              onBlur={handleBlur('dateOfBirth')}
              error={fieldError('dateOfBirth')}
            />
            <Input
              label="Place of birth"
              value={placeOfBirth}
              onChange={(event) => setPlaceOfBirth(event.target.value)}
              onBlur={handleBlur('placeOfBirth')}
              error={fieldError('placeOfBirth')}
            />
            {optionalCustomFields.map((field) => {
              const key = `custom:${field.id}` as const
              return (
                <ClientCustomFieldControl
                  key={field.id}
                  field={field}
                  value={customFieldValues[field.id] ?? ''}
                  error={fieldError(key)}
                  onChange={(value) =>
                    setCustomFields((current) => ({
                      ...current,
                      [field.id]: value,
                    }))
                  }
                  onBlur={handleBlur(key)}
                />
              )
            })}
            {isPublic ? null : (
              <Select
                label="Sub Agent"
                value={subAgentId}
                onChange={(event) => setSubAgentId(event.target.value)}
                options={[
                  { value: '', label: 'None' },
                  ...subAgents.map((subAgent) => ({
                    value: subAgent.id,
                    label: subAgent.name,
                  })),
                ]}
              />
            )}
          </div>
        </div>
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
