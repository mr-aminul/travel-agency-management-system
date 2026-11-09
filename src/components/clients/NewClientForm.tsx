import { useEffect, useMemo, useState, type FormEvent, type FocusEvent } from 'react'
import { ProfilePhotoField } from '@/components/ProfilePhotoField'
import { ClientCustomFieldControl } from '@/components/clients/ClientCustomFieldControl'
import { Button } from '@/components/shadcn/button'
import { Input, Select } from '@/components/clients/clientShadcnFields'
import {
  compactCustomFieldValues,
  emptyCustomFieldValues,
} from '@/lib/clientCustomFields'
import {
  type NewClientFormField,
  type NewClientFormValues,
  validateNewClientField,
} from '@/lib/clientFormValidation'
import { useClientProfileFieldsForTenant } from '@/lib/clientProfileFieldsStore'
import { useSubAgents } from '@/lib/subAgentsStore'
import { getClientByPhone, normalizePhone } from '@/lib/clientsStore'
import { useEnabledServiceOptions } from '@/lib/serviceCatalog'
import {
  listServiceCountries,
  useServiceTemplates,
} from '@/lib/serviceTemplatesStore'
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
  submitLabel = 'Register Client',
}: NewClientFormProps) {
  const isPublic = variant === 'public'
  const serviceOptions = useEnabledServiceOptions(serviceTenantId)
  const tenantCustomFields = useClientProfileFieldsForTenant(serviceTenantId)
  const customFieldDefs = isPublic ? tenantCustomFields : []
  const subAgents = useSubAgents()
  useServiceTemplates()
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
  const [address, setAddress] = useState('')
  const [customFields, setCustomFields] = useState<Record<string, string>>({})
  const [subAgentId, setSubAgentId] = useState(defaultSubAgentId ?? '')
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>()
  const [primaryService, setPrimaryService] = useState<ServiceType>(
    () => serviceOptions[0]?.value ?? 'Tour Package',
  )
  const [serviceCountry, setServiceCountry] = useState('')
  const [touched, setTouched] = useState<Partial<Record<NewClientFormField, boolean>>>(
    {},
  )
  const [triedSubmit, setTriedSubmit] = useState(false)

  const catalogCountries = useMemo(
    () =>
      serviceTenantId
        ? listServiceCountries(primaryService, serviceTenantId)
        : listServiceCountries(primaryService),
    [primaryService, serviceTenantId],
  )
  const countryOptions = useMemo(
    () => [
      {
        value: '',
        label: catalogCountries.length
          ? 'Select country'
          : 'Default (all countries)',
      },
      ...catalogCountries.map((country) => ({
        value: country,
        label: country,
      })),
    ],
    [catalogCountries],
  )

  useEffect(() => {
    if (!isPublic) return
    if (!serviceCountry) {
      if (catalogCountries.length === 1) setServiceCountry(catalogCountries[0])
      return
    }
    if (!catalogCountries.includes(serviceCountry)) {
      setServiceCountry(
        catalogCountries.length === 1 ? catalogCountries[0] : '',
      )
    }
  }, [catalogCountries, isPublic, serviceCountry])

  const phoneDigits = normalizePhone(phone)
  const existingClient = phoneDigits
    ? getClientByPhone(phoneDigits, undefined, serviceTenantId)
    : undefined
  const customFieldValues = emptyCustomFieldValues(customFieldDefs, customFields)

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
    primaryService,
    customFields: customFieldValues,
  }

  const validationOptions = {
    duplicateName: existingClient?.name,
    customFieldDefs,
    requirePrimaryService: isPublic,
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
    return validateNewClientField(field, values, validationOptions)
  }

  const handleBlur =
    (field: NewClientFormField) =>
    (_event?: FocusEvent<HTMLInputElement>) => {
      markTouched(field)
    }

  const allFieldKeys = (): NewClientFormField[] =>
    isPublic
      ? [
          'name',
          'phone',
          'primaryService',
          'passport',
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
      : ['name', 'phone']

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    setTriedSubmit(true)
    const nextTouched: Partial<Record<NewClientFormField, boolean>> = {
      ...touched,
    }
    for (const key of allFieldKeys()) nextTouched[key] = true
    setTouched(nextTouched)

    const hasError = allFieldKeys().some(
      (field) => validateNewClientField(field, values, validationOptions) != null,
    )
    if (hasError) return

    if (!isPublic) {
      onSubmit({
        name,
        phone,
        subAgentId: defaultSubAgentId || subAgentId || undefined,
        avatarUrl,
        idChecked: true,
      })
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
      subAgentId: defaultSubAgentId || subAgentId || undefined,
      avatarUrl,
      nid,
      passport,
      passportExpiry,
      passportIssuedOn,
      primaryService,
      preferredCountry: serviceCountry.trim() || undefined,
      idChecked: true,
    })
  }

  const footer = (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border px-5 py-4">
      {onCancel ? (
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      ) : null}
      <Button type="submit">{submitLabel}</Button>
    </div>
  )

  if (!isPublic) {
    return (
      <form
        className="flex h-full min-h-0 flex-col"
        onSubmit={handleSubmit}
        noValidate
      >
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="flex flex-col gap-4">
            <ProfilePhotoField
              name={name}
              fallbackName="Client"
              kind="client"
              value={avatarUrl}
              onChange={setAvatarUrl}
            >
              <Input
                label="Full Name"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                onBlur={handleBlur('name')}
                placeholder="Client Name"
                error={fieldError('name')}
              />
            </ProfilePhotoField>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                label="Mobile Number"
                type="tel"
                required
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                onBlur={handleBlur('phone')}
                placeholder="01XXXXXXXXX"
                error={fieldError('phone')}
              />
              {defaultSubAgentId ? null : (
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
        {footer}
      </form>
    )
  }

  return (
    <form className="flex min-h-0 flex-col gap-0" onSubmit={handleSubmit} noValidate>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <div className="flex flex-col gap-4">
          <ProfilePhotoField
            name={name}
            fallbackName="Client"
            kind="client"
            value={avatarUrl}
            onChange={setAvatarUrl}
          >
            <Input
              label="Full Name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              onBlur={handleBlur('name')}
              placeholder="Client Name"
              error={fieldError('name')}
            />
          </ProfilePhotoField>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Mobile Number"
              type="tel"
              required
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              onBlur={handleBlur('phone')}
              placeholder="01XXXXXXXXX"
              error={fieldError('phone')}
            />
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onBlur={handleBlur('email')}
              placeholder="client@email.com"
              error={fieldError('email')}
            />
            <Select
              label="Primary Service"
              value={primaryService}
              onChange={(event) => {
                setPrimaryService(event.target.value as ServiceType)
                markTouched('primaryService')
              }}
              onBlur={handleBlur('primaryService')}
              options={serviceOptions}
              error={fieldError('primaryService')}
            />
            <Select
              label="Country"
              searchable={catalogCountries.length > 6}
              searchPlaceholder="Search countries…"
              value={serviceCountry}
              onChange={(event) => setServiceCountry(event.target.value)}
              options={countryOptions}
              disabled={catalogCountries.length === 0}
            />
            <div className="sm:col-span-2">
              <Input
                label="Address"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                onBlur={handleBlur('address')}
                placeholder="Present Address"
                error={fieldError('address')}
              />
            </div>
            <Input
              label="Bangla Name"
              value={banglaName}
              onChange={(event) => setBanglaName(event.target.value)}
              onBlur={handleBlur('banglaName')}
              placeholder="বাংলা নাম"
              error={fieldError('banglaName')}
            />
            <Input
              label="Father Name"
              value={fatherName}
              onChange={(event) => setFatherName(event.target.value)}
              onBlur={handleBlur('fatherName')}
              placeholder="Father's name"
              error={fieldError('fatherName')}
            />
            <Input
              label="Date of Birth"
              type="date"
              value={dateOfBirth}
              onChange={(event) => setDateOfBirth(event.target.value)}
              onBlur={handleBlur('dateOfBirth')}
              error={fieldError('dateOfBirth')}
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
              label="Place of Birth"
              value={placeOfBirth}
              onChange={(event) => setPlaceOfBirth(event.target.value)}
              onBlur={handleBlur('placeOfBirth')}
              placeholder="City / district"
              error={fieldError('placeOfBirth')}
            />
            <Input
              label="NID"
              value={nid}
              onChange={(event) => setNid(event.target.value)}
              onBlur={handleBlur('nid')}
              placeholder="National ID"
              error={fieldError('nid')}
            />
            <Input
              label="Passport"
              value={passport}
              onChange={(event) => setPassport(event.target.value)}
              onBlur={handleBlur('passport')}
              placeholder="Passport number"
              error={fieldError('passport')}
            />
            <Input
              label="Passport Issued"
              type="date"
              value={passportIssuedOn}
              onChange={(event) => setPassportIssuedOn(event.target.value)}
              onBlur={handleBlur('passportIssuedOn')}
              error={fieldError('passportIssuedOn')}
            />
            <Input
              label="Passport Expiry"
              type="date"
              value={passportExpiry}
              onChange={(event) => setPassportExpiry(event.target.value)}
              onBlur={handleBlur('passportExpiry')}
              error={fieldError('passportExpiry')}
            />
          </div>

          {customFieldDefs.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {customFieldDefs.map((field) => (
                <ClientCustomFieldControl
                  key={field.id}
                  field={field}
                  value={customFieldValues[field.id] ?? ''}
                  onChange={(next) =>
                    setCustomFields((current) => ({
                      ...current,
                      [field.id]: next,
                    }))
                  }
                  onBlur={() => markTouched(`custom:${field.id}`)}
                  error={fieldError(`custom:${field.id}`)}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
      {footer}
    </form>
  )
}
