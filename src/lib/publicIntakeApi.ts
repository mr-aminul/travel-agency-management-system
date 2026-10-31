import { apiFetch, ApiError } from '@/lib/apiClient'
import { shouldUseApiDataBackend } from '@/lib/data'
import type { CreateClientInput } from '@/types/client'
import type { ModuleId, Tenant, TenantStatus } from '@/types/tenant'

export type PublicIntakeTenant = {
  id: string
  slug: string
  name: string
  status: TenantStatus
  enabledModules: ModuleId[]
}

export type PublicIntakeSubAgent = {
  id: string
  name: string
  tenantId: string
  status: string
}

export type PublicIntakeContext =
  | { kind: 'agency'; tenant: PublicIntakeTenant }
  | {
      kind: 'sub_agent'
      tenant: PublicIntakeTenant
      subAgent: PublicIntakeSubAgent
    }

function asTenantStatus(value: unknown): TenantStatus {
  if (value === 'trial' || value === 'active' || value === 'suspended') {
    return value
  }
  return 'active'
}

function normalizeTenant(value: unknown): PublicIntakeTenant | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const row = value as Record<string, unknown>
  const id = typeof row.id === 'string' ? row.id.trim() : ''
  const slug = typeof row.slug === 'string' ? row.slug.trim() : ''
  const name = typeof row.name === 'string' ? row.name.trim() : ''
  if (!id || !slug || !name) return undefined
  const enabledModules = Array.isArray(row.enabledModules)
    ? row.enabledModules.filter((item): item is ModuleId => typeof item === 'string')
    : []
  return {
    id,
    slug,
    name,
    status: asTenantStatus(row.status),
    enabledModules,
  }
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    const body = error.body
    if (
      body &&
      typeof body === 'object' &&
      'error' in body &&
      typeof (body as { error: unknown }).error === 'string'
    ) {
      return (body as { error: string }).error
    }
  }
  if (error instanceof Error && error.message) return error.message
  return fallback
}

export function toTenant(publicTenant: PublicIntakeTenant): Tenant {
  return {
    id: publicTenant.id,
    slug: publicTenant.slug,
    name: publicTenant.name,
    status: publicTenant.status,
    enabledModules: [...publicTenant.enabledModules],
  }
}

export async function fetchAgencyIntakeContext(
  slug: string,
): Promise<PublicIntakeContext> {
  try {
    const body = await apiFetch<{ tenant: unknown }>(
      `/api/platform/public/intake/agency/${encodeURIComponent(slug)}`,
      { skipAuth: true },
    )
    const tenant = normalizeTenant(body.tenant)
    if (!tenant) throw new Error('This registration link is invalid or has expired.')
    return { kind: 'agency', tenant }
  } catch (error) {
    throw new Error(
      errorMessage(error, 'This registration link is invalid or has expired.'),
    )
  }
}

export async function fetchSubAgentIntakeContext(
  subAgentId: string,
): Promise<PublicIntakeContext> {
  try {
    const body = await apiFetch<{ tenant: unknown; subAgent: unknown }>(
      `/api/platform/public/intake/sub-agent/${encodeURIComponent(subAgentId)}`,
      { skipAuth: true },
    )
    const tenant = normalizeTenant(body.tenant)
    const subAgentRaw =
      body.subAgent && typeof body.subAgent === 'object' && !Array.isArray(body.subAgent)
        ? (body.subAgent as Record<string, unknown>)
        : null
    const id = typeof subAgentRaw?.id === 'string' ? subAgentRaw.id.trim() : ''
    const name =
      typeof subAgentRaw?.name === 'string' ? subAgentRaw.name.trim() : ''
    const tenantId =
      typeof subAgentRaw?.tenantId === 'string' ? subAgentRaw.tenantId.trim() : ''
    if (!tenant || !id || !name || !tenantId) {
      throw new Error('This registration link is invalid or has expired.')
    }
    return {
      kind: 'sub_agent',
      tenant,
      subAgent: {
        id,
        name,
        tenantId,
        status:
          typeof subAgentRaw?.status === 'string' ? subAgentRaw.status : 'Active',
      },
    }
  } catch (error) {
    throw new Error(
      errorMessage(error, 'This registration link is invalid or has expired.'),
    )
  }
}

export async function submitAgencyIntake(
  slug: string,
  input: CreateClientInput,
): Promise<{ awaitingApproval: boolean; name: string }> {
  const body = await apiFetch<{
    awaitingApproval?: boolean
    client?: { name?: string }
  }>(`/api/platform/public/intake/agency/${encodeURIComponent(slug)}`, {
    method: 'POST',
    skipAuth: true,
    body: { input },
  })
  return {
    awaitingApproval: Boolean(body.awaitingApproval),
    name: body.client?.name?.trim() || input.name.trim(),
  }
}

export async function submitSubAgentIntake(
  subAgentId: string,
  input: CreateClientInput,
): Promise<{ awaitingApproval: boolean; name: string }> {
  const body = await apiFetch<{
    awaitingApproval?: boolean
    client?: { name?: string }
  }>(
    `/api/platform/public/intake/sub-agent/${encodeURIComponent(subAgentId)}`,
    {
      method: 'POST',
      skipAuth: true,
      body: { input },
    },
  )
  return {
    awaitingApproval: Boolean(body.awaitingApproval),
    name: body.client?.name?.trim() || input.name.trim(),
  }
}

export function publicIntakeUsesApi(): boolean {
  // Unit tests use seeded local stores; keep public intake offline there.
  if (import.meta.env.MODE === 'test') return false
  return shouldUseApiDataBackend()
}
