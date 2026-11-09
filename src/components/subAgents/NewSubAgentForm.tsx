import { useState, type FormEvent } from 'react'
import { ProfilePhotoField } from '@/components/ProfilePhotoField'
import { Button } from '@/components/shadcn/button'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/shadcn/field'
import { Input } from '@/components/shadcn/input'
import { Textarea } from '@/components/shadcn/textarea'
import {
  validateOptionalEmail,
  validateOptionalText,
  validateRequiredName,
  validateRequiredPhone,
} from '@/lib/fieldValidation'
import { useTouchedFields } from '@/lib/useTouchedFields'
import type { SubAgentDraft } from '@/types/subAgent'

type NewSubAgentFormProps = {
  onSubmit: (draft: SubAgentDraft) => void
  onCancel: () => void
}

type Field =
  | 'name'
  | 'phone'
  | 'email'
  | 'licenseNumber'
  | 'address'

export function NewSubAgentForm({ onSubmit, onCancel }: NewSubAgentFormProps) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [licenseNumber, setLicenseNumber] = useState('')
  const [photoUrl, setPhotoUrl] = useState<string | undefined>()
  const { markAllTouched, showError, blur } = useTouchedFields<Field>()

  const errors: Record<Field, string | undefined> = {
    name: validateRequiredName(name, 'Sub Agent name'),
    phone: validateRequiredPhone(phone),
    email: validateOptionalEmail(email),
    licenseNumber: validateOptionalText(licenseNumber, 'License number', 40),
    address: validateOptionalText(address, 'Address'),
  }

  const fieldError = (field: Field) =>
    showError(field) ? errors[field] : undefined

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const fields: Field[] = [
      'name',
      'phone',
      'email',
      'licenseNumber',
      'address',
    ]
    markAllTouched(fields)
    if (fields.some((field) => errors[field])) return
    onSubmit({
      name,
      phone,
      email,
      address,
      licenseNumber,
      photoUrl,
    })
  }

  return (
    <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit} noValidate>
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">
        <ProfilePhotoField
          name={name}
          fallbackName="Sub Agent"
          kind="subAgent"
          value={photoUrl}
          onChange={setPhotoUrl}
        >
          <Field data-invalid={fieldError('name') ? true : undefined}>
            <FieldLabel htmlFor="sub-agent-name">Sub Agent Name</FieldLabel>
            <Input
              id="sub-agent-name"
              required
              value={name}
              aria-invalid={fieldError('name') ? true : undefined}
              onChange={(event) => setName(event.target.value)}
              onBlur={blur('name')}
              placeholder="Agency Or Sub Agent Name"
            />
            <FieldError>{fieldError('name')}</FieldError>
          </Field>
        </ProfilePhotoField>
        <FieldGroup className="gap-5">
          <div className="grid grid-cols-2 gap-4">
          <Field data-invalid={fieldError('phone') ? true : undefined}>
            <FieldLabel htmlFor="sub-agent-phone">Mobile Number</FieldLabel>
            <Input
              id="sub-agent-phone"
              type="tel"
              required
              value={phone}
              aria-invalid={fieldError('phone') ? true : undefined}
              onChange={(event) => setPhone(event.target.value)}
              onBlur={blur('phone')}
              placeholder="01XXXXXXXXX"
            />
            <FieldError>{fieldError('phone')}</FieldError>
          </Field>
          <Field data-invalid={fieldError('email') ? true : undefined}>
            <FieldLabel htmlFor="sub-agent-email">Email</FieldLabel>
            <Input
              id="sub-agent-email"
              type="email"
              value={email}
              aria-invalid={fieldError('email') ? true : undefined}
              onChange={(event) => setEmail(event.target.value)}
              onBlur={blur('email')}
              placeholder="agent@email.com"
            />
            <FieldError>{fieldError('email')}</FieldError>
          </Field>
          </div>
          <Field data-invalid={fieldError('licenseNumber') ? true : undefined}>
            <FieldLabel htmlFor="sub-agent-license">License Number</FieldLabel>
            <Input
              id="sub-agent-license"
              value={licenseNumber}
              aria-invalid={fieldError('licenseNumber') ? true : undefined}
              onChange={(event) => setLicenseNumber(event.target.value)}
              onBlur={blur('licenseNumber')}
              placeholder="Optional"
            />
            <FieldError>{fieldError('licenseNumber')}</FieldError>
          </Field>
          <Field data-invalid={fieldError('address') ? true : undefined}>
            <FieldLabel htmlFor="sub-agent-address">Address</FieldLabel>
            <Textarea
              id="sub-agent-address"
              rows={2}
              value={address}
              aria-invalid={fieldError('address') ? true : undefined}
              onChange={(event) => setAddress(event.target.value)}
              onBlur={blur('address')}
              placeholder="Office Address"
            />
            <FieldError>{fieldError('address')}</FieldError>
          </Field>
        </FieldGroup>
      </div>
      <div className="mt-auto flex justify-end gap-2 border-t border-border px-5 py-3">
        <Button type="button" variant="outline" className="h-9 rounded-lg shadow-xs" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="h-9 rounded-lg shadow-xs">
          Register Sub Agent
        </Button>
      </div>
    </form>
  )
}
