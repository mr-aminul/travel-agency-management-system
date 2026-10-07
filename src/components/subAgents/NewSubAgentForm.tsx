import { useState, type FormEvent } from 'react'
import { ProfilePhotoField } from '@/components/ProfilePhotoField'
import { Button, Input, Textarea } from '@/components/ui'
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
  | 'branch'
  | 'licenseNumber'
  | 'address'

export function NewSubAgentForm({ onSubmit, onCancel }: NewSubAgentFormProps) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [licenseNumber, setLicenseNumber] = useState('')
  const [branch, setBranch] = useState('Dhaka')
  const [photoUrl, setPhotoUrl] = useState<string | undefined>()
  const { markAllTouched, showError, blur } = useTouchedFields<Field>()

  const errors: Record<Field, string | undefined> = {
    name: validateRequiredName(name, 'Sub Agent name'),
    phone: validateRequiredPhone(phone),
    email: validateOptionalEmail(email),
    branch: validateOptionalText(branch, 'Branch'),
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
      'branch',
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
      branch,
      photoUrl,
    })
  }

  return (
    <form className="pd-clients-form" onSubmit={handleSubmit} noValidate>
      <div className="pd-clients-form__scroll">
        <div className="pd-clients-form__block">
          <ProfilePhotoField name={name} value={photoUrl} onChange={setPhotoUrl}>
            <Input
              label="Sub Agent name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              onBlur={blur('name')}
              placeholder="Agency or sub agent name"
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
              onBlur={blur('phone')}
              placeholder="01XXXXXXXXX"
              error={fieldError('phone')}
            />
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onBlur={blur('email')}
              placeholder="agent@email.com"
              error={fieldError('email')}
            />
            <Input
              label="Branch"
              value={branch}
              onChange={(event) => setBranch(event.target.value)}
              onBlur={blur('branch')}
              error={fieldError('branch')}
            />
            <Input
              label="License number"
              value={licenseNumber}
              onChange={(event) => setLicenseNumber(event.target.value)}
              onBlur={blur('licenseNumber')}
              placeholder="Optional"
              error={fieldError('licenseNumber')}
            />
            <Textarea
              className="pd-clients-form__full"
              label="Address"
              rows={2}
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              onBlur={blur('address')}
              placeholder="Office address"
              error={fieldError('address')}
            />
          </div>
        </div>
      </div>

      <div className="pd-clients-form__footer">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Register sub agent</Button>
      </div>
    </form>
  )
}
