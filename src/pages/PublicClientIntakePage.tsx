import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Check } from 'lucide-react'
import { NewClientForm } from '@/components/clients/NewClientForm'
import { layoutConfig } from '@/config/layout'
import { createClient, getClientByPhone } from '@/lib/clientsStore'
import {
  fetchAgencyIntakeContext,
  fetchSubAgentIntakeContext,
  publicIntakeUsesApi,
  submitAgencyIntake,
  submitSubAgentIntake,
  toTenant,
  type PublicIntakeContext,
} from '@/lib/publicIntakeApi'
import { queuePublicSubAgentRegistration } from '@/lib/subAgentScope'
import {
  findSubAgentById,
  seedPublicSubAgentForIntake,
} from '@/lib/subAgentsStore'
import { publicUrl } from '@/lib/publicUrl'
import {
  getTenantById,
  resolveTenantRef,
  seedPublicTenantForIntake,
} from '@/lib/tenantsStore'
import type { CreateClientInput } from '@/types/client'
import '@/styles/layout-track.css'
import '@/styles/layout-clients.css'

export default function PublicClientIntakePage() {
  const { subAgentId = '', tenantSlug: tenantFromRoute = '' } = useParams()
  const isAgencyDirect = Boolean(tenantFromRoute)
  const [remote, setRemote] = useState<PublicIntakeContext | null>(null)
  const [loadError, setLoadError] = useState<string | undefined>()
  const [loading, setLoading] = useState(() => publicIntakeUsesApi())
  const [submittedName, setSubmittedName] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | undefined>()
  const [awaitingApproval, setAwaitingApproval] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (!publicIntakeUsesApi()) {
      setLoading(false)
      return
    }

    setLoading(true)
    setLoadError(undefined)
    const run = async () => {
      try {
        const context = isAgencyDirect
          ? await fetchAgencyIntakeContext(tenantFromRoute)
          : await fetchSubAgentIntakeContext(subAgentId)
        if (cancelled) return
        seedPublicTenantForIntake(toTenant(context.tenant))
        if (context.kind === 'sub_agent') {
          seedPublicSubAgentForIntake({
            id: context.subAgent.id,
            tenantId: context.subAgent.tenantId,
            name: context.subAgent.name,
            status: context.subAgent.status === 'Inactive' ? 'Inactive' : 'Active',
          })
        }
        setRemote(context)
      } catch (error) {
        if (cancelled) return
        setRemote(null)
        setLoadError(
          error instanceof Error
            ? error.message
            : 'This registration link is invalid or has expired.',
        )
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [isAgencyDirect, subAgentId, tenantFromRoute])

  const localSubAgent = useMemo(
    () => (subAgentId ? findSubAgentById(subAgentId) : undefined),
    [subAgentId, remote],
  )
  const activeSubAgent =
    localSubAgent && localSubAgent.status !== 'Inactive'
      ? localSubAgent
      : remote?.kind === 'sub_agent' && remote.subAgent.status !== 'Inactive'
        ? {
            id: remote.subAgent.id,
            tenantId: remote.subAgent.tenantId,
            name: remote.subAgent.name,
            status: 'Active' as const,
          }
        : undefined

  const tenant = useMemo(() => {
    if (remote?.tenant) return toTenant(remote.tenant)
    if (tenantFromRoute) return resolveTenantRef(tenantFromRoute)
    if (localSubAgent) return getTenantById(localSubAgent.tenantId)
    return undefined
  }, [remote, tenantFromRoute, localSubAgent])

  const tenantAcceptsIntake =
    tenant != null && tenant.status !== 'suspended'

  const formReady = isAgencyDirect
    ? tenantAcceptsIntake
    : Boolean(activeSubAgent && tenantAcceptsIntake)

  const unavailable = loading
    ? undefined
    : loadError
      ? loadError
      : isAgencyDirect
        ? tenantAcceptsIntake
          ? undefined
          : 'This registration link is invalid or has expired.'
        : !activeSubAgent
          ? localSubAgent?.status === 'Inactive'
            ? 'This registration link is no longer active. Ask the agency for a new one.'
            : 'This registration link is invalid or has expired.'
          : !tenantAcceptsIntake
            ? 'This registration link is invalid or has expired.'
            : undefined

  const referringName = isAgencyDirect
    ? (tenant?.name ?? layoutConfig.brand.name)
    : (activeSubAgent?.name ?? localSubAgent?.name ?? 'The agency')

  const handleSubmit = async (input: CreateClientInput) => {
    if (!formReady || !tenant) return
    setSubmitError(undefined)
    setBusy(true)
    try {
      if (publicIntakeUsesApi()) {
        const result = isAgencyDirect
          ? await submitAgencyIntake(tenant.slug || tenantFromRoute, {
              ...input,
              subAgentId: undefined,
              idChecked: true,
            })
          : await submitSubAgentIntake(activeSubAgent!.id, {
              ...input,
              subAgentId: activeSubAgent!.id,
              idChecked: true,
            })
        setAwaitingApproval(result.awaitingApproval)
        setSubmittedName(result.name)
        return
      }

      // Offline / test path: local stores only.
      if (isAgencyDirect) {
        const created = createClient(
          {
            ...input,
            subAgentId: undefined,
            idChecked: true,
          },
          { tenantId: tenant.id },
        )
        setAwaitingApproval(false)
        setSubmittedName(created.name)
        return
      }

      if (!activeSubAgent) return
      const phone = input.phone?.replace(/\s+/g, '') ?? ''
      if (phone && getClientByPhone(phone, undefined, tenant.id)) {
        throw new Error('A client with this phone number already exists.')
      }
      queuePublicSubAgentRegistration({
        tenantId: tenant.id,
        subAgentId: activeSubAgent.id,
        summary: `Partial approval: ${input.name.trim()}`,
        payload: {
          input: {
            ...input,
            subAgentId: activeSubAgent.id,
            idChecked: true,
          },
          tenantId: tenant.id,
        },
      })
      setAwaitingApproval(true)
      setSubmittedName(input.name.trim())
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'Unable to submit this form. Try again.',
      )
    } finally {
      setBusy(false)
    }
  }

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
              {awaitingApproval
                ? `Thank you, ${submittedName}. ${referringName} received your profile for approval and will follow up.`
                : `Thank you, ${submittedName}. ${referringName} has your profile and will follow up.`}
            </p>
          </div>
        ) : (
          <>
            <header className="pd-track__intro">
              <h1 className="pd-track__title">Create your profile</h1>
            </header>

            {loading ? (
              <p className="pd-admin__quiet" role="status">
                Loading registration form…
              </p>
            ) : formReady ? (
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
                  submitLabel={busy ? 'Submitting…' : 'Submit'}
                  onSubmit={(input) => {
                    void handleSubmit(input)
                  }}
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
