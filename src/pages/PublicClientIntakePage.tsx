import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Check } from 'lucide-react'
import { NewClientForm } from '@/components/clients/NewClientForm'
import { Alert } from '@/components/ui'
import { layoutConfig } from '@/config/layout'
import { createClient } from '@/lib/clientsStore'
import { findPartnerById } from '@/lib/partnersStore'
import { publicUrl } from '@/lib/publicUrl'
import type { CreateClientInput } from '@/types/client'
import '@/styles/layout-track.css'
import '@/styles/layout-clients.css'

export default function PublicClientIntakePage() {
  const { partnerId = '' } = useParams()
  const partner = useMemo(
    () => (partnerId ? findPartnerById(partnerId) : undefined),
    [partnerId],
  )
  const activePartner =
    partner && partner.status !== 'Inactive' ? partner : undefined
  const [submittedName, setSubmittedName] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | undefined>()

  const handleSubmit = (input: CreateClientInput) => {
    if (!activePartner) return
    setSubmitError(undefined)
    try {
      const created = createClient(
        {
          ...input,
          partnerId: activePartner.id,
          openFirstCase: false,
          idChecked: true,
        },
        { tenantId: activePartner.tenantId },
      )
      setSubmittedName(created.name)
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'Unable to submit this form. Try again.',
      )
    }
  }

  const unavailable =
    !partner || partner.status === 'Inactive'
      ? partner
        ? 'This registration link is no longer active. Ask the agency for a new one.'
        : 'This registration link is invalid or has expired.'
      : undefined

  return (
    <div className="pd-track">
      <img
        src={publicUrl('images/logo.svg')}
        alt={layoutConfig.brand.name}
        className="pd-track__corner-logo"
        width={86}
        height={44}
        decoding="async"
      />

      <main
        className={
          submittedName
            ? 'pd-track__sheet pd-track__sheet--success'
            : 'pd-track__sheet pd-track__sheet--wide pd-track__sheet--intake'
        }
      >
        {submittedName ? (
          <div className="pd-track__success" role="status">
            <span className="pd-track__success-icon" aria-hidden>
              <Check size={28} strokeWidth={2.75} />
            </span>
            <h1 className="pd-track__title">Details received</h1>
            <p className="pd-track__lede">
              Thank you, {submittedName}. {partner?.name ?? 'The agency'} has
              your profile and will follow up.
            </p>
          </div>
        ) : (
          <>
            <header className="pd-track__intro">
              <h1 className="pd-track__title">Create your profile</h1>
              <p className="pd-track__lede">
                {partner
                  ? `Fill this form for ${partner.name}. Your details become a client profile with this sub agent.`
                  : 'This public form registers a new client with the referring sub agent.'}
              </p>
            </header>

            {activePartner ? (
              <>
                {submitError ? (
                  <Alert variant="error" title="Could not submit">
                    {submitError}
                  </Alert>
                ) : null}
                <NewClientForm
                  variant="public"
                  defaultPartnerId={activePartner.id}
                  serviceTenantId={activePartner.tenantId}
                  submitLabel="Submit"
                  onSubmit={handleSubmit}
                />
              </>
            ) : (
              <Alert variant="warning" title="Form unavailable">
                {unavailable}
              </Alert>
            )}
          </>
        )}
      </main>
    </div>
  )
}
