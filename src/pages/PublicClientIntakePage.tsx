import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Check } from 'lucide-react'
import { NewClientForm } from '@/components/clients/NewClientForm'
import { layoutConfig } from '@/config/layout'
import { createClient } from '@/lib/clientsStore'
import { findSubAgentById } from '@/lib/subAgentsStore'
import { publicUrl } from '@/lib/publicUrl'
import { getTenantById, resolveTenantRef } from '@/lib/tenantsStore'
import type { CreateClientInput } from '@/types/client'
import '@/styles/layout-track.css'
import '@/styles/layout-clients.css'

export default function PublicClientIntakePage() {
  const { subAgentId = '', tenantSlug: tenantFromRoute = '' } = useParams()
  const isAgencyDirect = Boolean(tenantFromRoute)
  const subAgent = useMemo(
    () => (subAgentId ? findSubAgentById(subAgentId) : undefined),
    [subAgentId],
  )
  const activeSubAgent =
    subAgent && subAgent.status !== 'Inactive' ? subAgent : undefined
  const tenant = useMemo(() => {
    if (tenantFromRoute) return resolveTenantRef(tenantFromRoute)
    if (subAgent) return getTenantById(subAgent.tenantId)
    return undefined
  }, [tenantFromRoute, subAgent])
  const tenantAcceptsIntake =
    tenant != null && tenant.status !== 'suspended'
  const [submittedName, setSubmittedName] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | undefined>()

  const formReady = isAgencyDirect
    ? tenantAcceptsIntake
    : Boolean(activeSubAgent)

  const handleSubmit = (input: CreateClientInput) => {
    if (!formReady || !tenant) return
    setSubmitError(undefined)
    try {
      const created = createClient(
        {
          ...input,
          subAgentId: isAgencyDirect ? undefined : activeSubAgent?.id,
          idChecked: true,
        },
        { tenantId: tenant.id },
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

  const unavailable = isAgencyDirect
    ? tenantAcceptsIntake
      ? undefined
      : 'This registration link is invalid or has expired.'
    : !subAgent || subAgent.status === 'Inactive'
      ? subAgent
        ? 'This registration link is no longer active. Ask the agency for a new one.'
        : 'This registration link is invalid or has expired.'
      : undefined

  const referringName = isAgencyDirect
    ? (tenant?.name ?? layoutConfig.brand.name)
    : (subAgent?.name ?? 'The agency')

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
              Thank you, {submittedName}. {referringName} has your profile and
              will follow up.
            </p>
          </div>
        ) : (
          <>
            <header className="pd-track__intro">
              <h1 className="pd-track__title">Create your profile</h1>
            </header>

            {formReady ? (
              <>
                {submitError ? (
                  <p className="pd-field__error" role="alert">
                    {submitError}
                  </p>
                ) : null}
                <NewClientForm
                  variant="public"
                  defaultSubAgentId={
                    isAgencyDirect ? undefined : activeSubAgent?.id
                  }
                  serviceTenantId={tenant?.id}
                  submitLabel="Submit"
                  onSubmit={handleSubmit}
                />
              </>
            ) : (
              <p className="pd-field__error" role="status">
                {unavailable}
              </p>
            )}
          </>
        )}
      </main>
    </div>
  )
}
