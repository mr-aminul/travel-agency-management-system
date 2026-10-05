import { useState, type FormEvent } from 'react'
import { Button, Input, Textarea } from '@/components/ui'
import { PartnerPhotoField } from '@/components/PartnerPhotoField'
import type { PartnerDraft } from '@/types/partner'

type NewPartnerFormProps = {
  onSubmit: (draft: PartnerDraft) => void
  onCancel: () => void
}

export function NewPartnerForm({ onSubmit, onCancel }: NewPartnerFormProps) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [licenseNumber, setLicenseNumber] = useState('')
  const [branch, setBranch] = useState('Dhaka')
  const [photoUrl, setPhotoUrl] = useState<string | undefined>()
  const [triedSubmit, setTriedSubmit] = useState(false)

  const nameError =
    triedSubmit && !name.trim() ? 'Sub Agent name is required.' : undefined
  const phoneError =
    triedSubmit && !phone.trim() ? 'Mobile number is required.' : undefined

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    setTriedSubmit(true)
    if (!name.trim() || !phone.trim()) return
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
          <PartnerPhotoField name={name} value={photoUrl} onChange={setPhotoUrl}>
            <Input
              label="Sub Agent name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Agency or sub agent name"
              error={nameError}
            />
          </PartnerPhotoField>
          <div className="pd-clients-form__grid">
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
              placeholder="agent@email.com"
            />
            <Input
              label="Branch"
              value={branch}
              onChange={(event) => setBranch(event.target.value)}
            />
            <Input
              label="License number"
              value={licenseNumber}
              onChange={(event) => setLicenseNumber(event.target.value)}
              placeholder="Optional"
            />
            <Textarea
              className="pd-clients-form__full"
              label="Address"
              rows={2}
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="Office address"
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
