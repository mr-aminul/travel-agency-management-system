import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Check } from 'lucide-react'
import { NewClientForm } from '@/components/clients/NewClientForm'
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/shadcn/card'
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
import { cn } from '@/lib/utils'
import type { CreateClientInput } from '@/types/client'
import '@/styles/layout-clients.css'

const intakePageBackgroundStyle = {
  backgroundColor: 'color-mix(in srgb, var(--color-theme) 55%, #04060c)',
  backgroundImage: [
    'radial-gradient(48rem 34rem at 14% 10%, color-mix(in srgb, var(--color-theme) 88%, #061228) 0%, transparent 58%)',
    'radial-gradient(40rem 30rem at 90% 90%, color-mix(in srgb, var(--color-theme) 70%, #040a18) 0%, transparent 55%)',
    'linear-gradient(165deg, color-mix(in srgb, var(--color-theme) 65%, #030c18) 0%, color-mix(in srgb, var(--color-theme) 40%, #070b12) 50%, #05070c 100%)',
  ].join(', '),
} as const

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
    <div
      className={cn(
        'relative isolate flex min-h-full flex-col items-center overflow-auto',
        'pt-[calc(4.5rem+env(safe-area-inset-top,0px))] px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]',
        'text-[#0a0a0a] [color-scheme:light]',
      )}
      style={intakePageBackgroundStyle}
    >
      <img
        src={publicUrl('images/logo.svg')}
        alt={layoutConfig.brand.name}
        className="absolute left-5 top-5 z-[2] h-[1.625rem] w-auto object-contain opacity-[0.92]"
        width={86}
        height={44}
        decoding="async"
      />

      <Card
        className={cn(
          'relative z-[1] w-full gap-5 rounded-[1.25rem] border-border bg-white py-7 text-[#0a0a0a] shadow-[0_18px_48px_color-mix(in_srgb,black_28%,transparent),0_2px_8px_color-mix(in_srgb,black_12%,transparent)] ring-0',
          submittedName
            ? 'my-auto max-w-[28rem]'
            : 'mt-0 mb-auto max-w-[44rem]',
        )}
      >
        {submittedName ? (
          <CardContent className="flex flex-col items-center gap-3 px-6 py-[0.35rem] pb-[0.15rem] text-center">
            <div
              className="inline-flex size-14 items-center justify-center rounded-full bg-[var(--color-status-completed)] text-white"
              aria-hidden
            >
              <Check size={28} strokeWidth={2.75} />
            </div>
            <h1 className="m-0 text-balance font-[family-name:var(--font-heading)] text-[clamp(1.5rem,2.6vw,1.85rem)] font-extrabold leading-[1.15] tracking-[-0.03em]">
              Details received
            </h1>
            <p
              className="m-0 mx-auto max-w-96 text-pretty text-[0.9rem] leading-snug text-[#64748b]"
              role="status"
            >
              {awaitingApproval
                ? `Thank you, ${submittedName}. ${referringName} received your profile for approval and will follow up.`
                : `Thank you, ${submittedName}. ${referringName} has your profile and will follow up.`}
            </p>
          </CardContent>
        ) : (
          <>
            <CardHeader className="gap-1 px-6 pb-0 text-start">
              <h1 className="m-0 text-balance font-[family-name:var(--font-heading)] text-[clamp(1.5rem,2.6vw,1.85rem)] font-extrabold leading-[1.15] tracking-[-0.03em]">
                Create your profile
              </h1>
            </CardHeader>

            <CardContent className="flex flex-col gap-5 px-6 text-start">
              {loading ? (
                <p
                  className="m-0 text-sm leading-snug text-[#64748b]"
                  role="status"
                >
                  Loading registration form…
                </p>
              ) : formReady ? (
                <>
                  {submitError ? (
                    <p className="m-0 text-sm text-destructive" role="alert">
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
                <p className="m-0 text-sm text-destructive" role="status">
                  {unavailable}
                </p>
              )}
            </CardContent>
          </>
        )}
      </Card>
    </div>
  )
}
