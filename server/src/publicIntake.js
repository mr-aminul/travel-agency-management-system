import { query } from './db.js'
import { upsertCase, upsertClient } from './domain.js'

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function asRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value
    : null
}

async function readKv(key) {
  const result = await query(
    `select value from platform.kv_store where key = $1`,
    [key],
  )
  return result.rows[0]?.value
}

async function writeKv(key, value) {
  await query(
    `insert into platform.kv_store (key, value, updated_at)
     values ($1, $2::jsonb, now())
     on conflict (key) do update
       set value = excluded.value, updated_at = now()`,
    [key, JSON.stringify(value)],
  )
}

function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '')
}

function publicTenant(tenant, statuses, entitlements) {
  if (!tenant || typeof tenant !== 'object') return null
  const id = String(tenant.id || '').trim()
  const slug = String(tenant.slug || '').trim()
  const name = String(tenant.name || '').trim()
  if (!id || !slug || !name) return null
  const statusOverride = asRecord(statuses)?.[id]
  const status =
    statusOverride === 'trial' ||
    statusOverride === 'active' ||
    statusOverride === 'suspended'
      ? statusOverride
      : tenant.status === 'trial' ||
          tenant.status === 'active' ||
          tenant.status === 'suspended'
        ? tenant.status
        : 'active'
  const fromEntitlements = asRecord(entitlements)?.[id]
  const enabledModules = Array.isArray(fromEntitlements)
    ? fromEntitlements.filter((item) => typeof item === 'string')
    : Array.isArray(tenant.enabledModules)
      ? tenant.enabledModules.filter((item) => typeof item === 'string')
      : []
  return {
    id,
    slug,
    name,
    status,
    enabledModules,
  }
}

async function loadTenantMaps() {
  const [tenants, statuses, entitlements] = await Promise.all([
    readKv('pd-tenants-created'),
    readKv('pd-tenant-statuses'),
    readKv('pd-tenant-entitlements'),
  ])
  return {
    tenants: asArray(tenants),
    statuses: asRecord(statuses) || {},
    entitlements: asRecord(entitlements) || {},
  }
}

export async function resolveAgencyIntake(slugOrId) {
  const needle = String(slugOrId || '')
    .trim()
    .toLowerCase()
  if (!needle) {
    return { ok: false, status: 400, error: 'Registration link is required.' }
  }
  const { tenants, statuses, entitlements } = await loadTenantMaps()
  const match = tenants.find((tenant) => {
    if (!tenant || typeof tenant !== 'object') return false
    return (
      String(tenant.slug || '').toLowerCase() === needle ||
      String(tenant.id || '').toLowerCase() === needle
    )
  })
  const tenant = publicTenant(match, statuses, entitlements)
  if (!tenant) {
    return {
      ok: false,
      status: 404,
      error: 'This registration link is invalid or has expired.',
    }
  }
  if (tenant.status === 'suspended') {
    return {
      ok: false,
      status: 403,
      error: 'This registration link is no longer active. Ask the agency for a new one.',
    }
  }
  return { ok: true, kind: 'agency', tenant }
}

export async function resolveSubAgentIntake(subAgentId) {
  const id = String(subAgentId || '').trim()
  if (!id) {
    return { ok: false, status: 400, error: 'Registration link is required.' }
  }
  // Older AGT-T0001 ids could collide across agencies — uniquify first.
  const { ensureSubAgentIdsGloballyUnique } = await import('./subAgentIds.js')
  await ensureSubAgentIdsGloballyUnique()
  const subAgents = asArray(await readKv('pd-sub-agents-created'))
  const matches = subAgents.filter(
    (row) => row && typeof row === 'object' && String(row.id || '').trim() === id,
  )
  if (matches.length > 1) {
    return {
      ok: false,
      status: 409,
      error:
        'This registration link is ambiguous. Ask the agency for a fresh sub-agent link.',
    }
  }
  const subAgent = matches[0]
  if (!subAgent) {
    return {
      ok: false,
      status: 404,
      error: 'This registration link is invalid or has expired.',
    }
  }
  if (String(subAgent.status || '') === 'Inactive') {
    return {
      ok: false,
      status: 403,
      error: 'This registration link is no longer active. Ask the agency for a new one.',
    }
  }
  const tenantId = String(subAgent.tenantId || '').trim()
  const { tenants, statuses, entitlements } = await loadTenantMaps()
  const match = tenants.find(
    (tenant) =>
      tenant && typeof tenant === 'object' && String(tenant.id || '') === tenantId,
  )
  const tenant = publicTenant(match, statuses, entitlements)
  if (!tenant || tenant.status === 'suspended') {
    return {
      ok: false,
      status: 404,
      error: 'This registration link is invalid or has expired.',
    }
  }
  return {
    ok: true,
    kind: 'sub_agent',
    tenant,
    subAgent: {
      id: String(subAgent.id),
      name: String(subAgent.name || 'Sub agent'),
      tenantId: tenant.id,
      status: String(subAgent.status || 'Active'),
    },
  }
}

async function phoneTaken(tenantId, phone) {
  const digits = normalizePhone(phone)
  if (!digits) return false
  const result = await query(
    `select 1 from platform.clients
     where tenant_id = $1
       and regexp_replace(coalesce(phone, ''), '\\D', '', 'g') = $2
     limit 1`,
    [tenantId, digits],
  )
  return result.rowCount > 0
}

function buildClientPayload(input, tenantId, subAgentId) {
  const phone = normalizePhone(input?.phone)
  const name = String(input?.name || '').trim()
  const primaryService = String(input?.primaryService || '').trim()
  if (!name) return { error: 'Full name is required.' }
  if (!phone) return { error: 'Phone number is required.' }
  if (!primaryService) return { error: 'Select a service.' }
  const now = new Date().toISOString().slice(0, 10)
  const id = `c-${Date.now().toString(36)}`
  const payload = {
    id,
    tenantId,
    name,
    phone,
    email: String(input?.email || '').trim() || undefined,
    address: String(input?.address || '').trim() || undefined,
    banglaName: String(input?.banglaName || '').trim() || undefined,
    fatherName: String(input?.fatherName || '').trim() || undefined,
    motherName: String(input?.motherName || '').trim() || undefined,
    dateOfBirth: String(input?.dateOfBirth || '').trim() || undefined,
    gender: input?.gender,
    maritalStatus: input?.maritalStatus,
    nationality: String(input?.nationality || '').trim() || undefined,
    placeOfBirth: String(input?.placeOfBirth || '').trim() || undefined,
    spouseName: String(input?.spouseName || '').trim() || undefined,
    bloodGroup: String(input?.bloodGroup || '').trim() || undefined,
    whatsapp: String(input?.whatsapp || '').trim() || undefined,
    presentAddress:
      String(input?.presentAddress || input?.address || '').trim() || undefined,
    permanentAddress: String(input?.permanentAddress || '').trim() || undefined,
    district: String(input?.district || '').trim() || undefined,
    upazila: String(input?.upazila || '').trim() || undefined,
    education: String(input?.education || '').trim() || undefined,
    profession: String(input?.profession || '').trim() || undefined,
    skillTrade: String(input?.skillTrade || '').trim() || undefined,
    experience: String(input?.experience || '').trim() || undefined,
    previousOverseasExp:
      String(input?.previousOverseasExp || '').trim() || undefined,
    preferredCountry: String(input?.preferredCountry || '').trim() || undefined,
    preferredJob: String(input?.preferredJob || '').trim() || undefined,
    customFields:
      input?.customFields && typeof input.customFields === 'object'
        ? input.customFields
        : undefined,
    expectedSalary: String(input?.expectedSalary || '').trim() || undefined,
    contractAmount: input?.contractAmount,
    branch: String(input?.branch || '').trim() || undefined,
    subAgentId: subAgentId || undefined,
    avatarUrl: String(input?.avatarUrl || '').trim() || undefined,
    nid: String(input?.nid || '').trim() || undefined,
    passport: String(input?.passport || '').trim() || undefined,
    passportExpiry: String(input?.passportExpiry || '').trim() || undefined,
    passportIssuedOn: String(input?.passportIssuedOn || '').trim() || undefined,
    // Service files own the job; Client is the person only.
    services: [],
    balance: 0,
    activeCases: 0,
    idChecked: true,
    createdAt: now,
  }
  return { payload }
}

function buildStarterCase(client, primaryService, serviceCountry) {
  const now = new Date().toISOString().slice(0, 10)
  const id = `case-${Date.now().toString(36)}`
  const country =
    typeof serviceCountry === 'string' && serviceCountry.trim()
      ? serviceCountry.trim()
      : undefined
  return {
    id,
    tenantId: client.tenantId,
    caseId: `SR-${String(Date.now()).slice(-5)}`,
    clientId: client.id,
    clientName: client.name,
    service: primaryService,
    status: 'Pending',
    stage: 'Intake',
    currentStepId: 'intake',
    steps: {},
    documents: [],
    destination: country,
    serviceCountry: country,
    serviceFee: 0,
    balance: 0,
    createdAt: now,
    updatedAt: now,
  }
}

export async function submitAgencyIntake(slugOrId, input) {
  const resolved = await resolveAgencyIntake(slugOrId)
  if (!resolved.ok) return resolved
  const built = buildClientPayload(input, resolved.tenant.id, undefined)
  if (built.error) return { ok: false, status: 400, error: built.error }
  if (await phoneTaken(resolved.tenant.id, built.payload.phone)) {
    return {
      ok: false,
      status: 409,
      error: 'A client with this phone number already exists.',
    }
  }
  await upsertClient(resolved.tenant.id, built.payload)
  const primaryService = String(input?.primaryService || '').trim()
  if (primaryService) {
    const starter = buildStarterCase(
      built.payload,
      primaryService,
      input?.preferredCountry || input?.serviceCountry,
    )
    await upsertCase(resolved.tenant.id, starter)
  }
  return {
    ok: true,
    awaitingApproval: false,
    client: { id: built.payload.id, name: built.payload.name },
  }
}

export async function submitSubAgentIntake(subAgentId, input) {
  const resolved = await resolveSubAgentIntake(subAgentId)
  if (!resolved.ok) return resolved
  const built = buildClientPayload(
    input,
    resolved.tenant.id,
    resolved.subAgent.id,
  )
  if (built.error) return { ok: false, status: 400, error: built.error }
  if (await phoneTaken(resolved.tenant.id, built.payload.phone)) {
    return {
      ok: false,
      status: 409,
      error: 'A client with this phone number already exists.',
    }
  }

  const pending = asArray(await readKv('pd-sub-agent-pending-changes'))
  const created = {
    id: `pch-${Date.now().toString(36)}`,
    tenantId: resolved.tenant.id,
    subAgentId: resolved.subAgent.id,
    submittedByUserId: `public-intake:${resolved.subAgent.id}`,
    submittedByName: 'Registration link',
    entityType: 'client',
    action: 'create',
    summary: `Partial approval: ${built.payload.name}`,
    payload: {
      input: {
        ...input,
        subAgentId: resolved.subAgent.id,
        idChecked: true,
      },
      tenantId: resolved.tenant.id,
    },
    status: 'pending',
    createdAt: new Date().toISOString(),
  }
  await writeKv('pd-sub-agent-pending-changes', [created, ...pending])
  return {
    ok: true,
    awaitingApproval: true,
    client: { name: built.payload.name },
  }
}
