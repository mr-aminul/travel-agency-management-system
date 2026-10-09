import { ApiError, apiFetch } from '@/lib/apiClient'
import { verifyPasswordHash } from '@/lib/passwordHash'
import {
  findProvisionedAccountByEmail,
  saveProvisionedLogin,
  verifyProvisionedLogin,
} from '@/lib/provisionedUsers'
import {
  ONETRACK_OWNER_USER,
  asUserRole,
  findSeededAccountByEmail,
  type SeededAuthUser,
} from '@/lib/seededUsers'
import { DEFAULT_TENANT_ID } from '@/types/tenant'
import type { AuthWorkspace } from '@/lib/authWorkspaces'

export type AuthUser = SeededAuthUser

export {
  PLATFORM_ADMIN_EMAIL,
  PLATFORM_ADMIN_USER,
  COASTAL_OWNER_USER,
  HORIZON_OWNER_USER,
  ONETRACK_OWNER_USER,
  SEED_AGENCY_PASSWORD,
  SEED_PLATFORM_ADMIN_PASSWORD,
} from '@/lib/seededUsers'

/** Primary agency user used by tests and seed stores. */
export const DEMO_USER: AuthUser = ONETRACK_OWNER_USER

/** @deprecated Use COASTAL_OWNER_USER */
export const LEISURE_USER: AuthUser = {
  id: 'user-coastal-owner',
  email: 'ops@coastalleisure.com',
  name: 'Coastal Leisure',
  role: 'agency_user',
}

/** @deprecated Use HORIZON_OWNER_USER */
export const MANPOWER_USER: AuthUser = {
  id: 'user-horizon-owner',
  email: 'ops@horizonmanpower.com',
  name: 'Horizon Manpower',
  role: 'agency_user',
}

const AUTH_SESSION_KEY = 'pd-auth-session'
const LEGACY_AUTH_KEY = 'pd-demo-auth'

export type AuthSession = {
  user: AuthUser
  tenantId: string
  /** ISO timestamp when the session was established. */
  signedInAt: string
  /**
   * Bearer token for API calls when the auth API returns one.
   * Prefer HttpOnly cookies in production; this field is for SPA token flows.
   */
  accessToken?: string
  /** True when the user must pick agency vs sub-agent portal. */
  workspacePending?: boolean
  /** Workspaces available for this login (agency and/or sub-agent). */
  workspaces?: AuthWorkspace[]
  activeWorkspaceId?: string
  /**
   * Real signed-in platform admin while `user` is a View-as target.
   * Present only during platform-admin impersonation.
   */
  actor?: AuthUser
}

function readRawSession(): string | null {
  try {
    return sessionStorage.getItem(AUTH_SESSION_KEY)
  } catch {
    return null
  }
}

export function writeSession(session: AuthSession): void {
  sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session))
}

export function clearSession(): void {
  sessionStorage.removeItem(AUTH_SESSION_KEY)
}

function coerceUser(value: unknown): AuthUser | null {
  if (!value || typeof value !== 'object') return null
  const parsed = value as Record<string, unknown>
  if (
    typeof parsed.id !== 'string' ||
    typeof parsed.email !== 'string' ||
    typeof parsed.name !== 'string'
  ) {
    return null
  }
  const subAgentId =
    typeof parsed.subAgentId === 'string' && parsed.subAgentId.trim()
      ? parsed.subAgentId.trim()
      : undefined
  return {
    id: parsed.id,
    email: parsed.email,
    name: parsed.name,
    role: asUserRole(parsed.role),
    ...(subAgentId ? { subAgentId } : {}),
  }
}

function coerceSession(value: unknown): AuthSession | null {
  if (!value || typeof value !== 'object') return null
  const parsed = value as Record<string, unknown>
  const user = coerceUser(parsed.user)
  if (!user || typeof parsed.signedInAt !== 'string') return null
  const tenantId =
    typeof parsed.tenantId === 'string' && parsed.tenantId
      ? parsed.tenantId
      : DEFAULT_TENANT_ID
  const accessToken =
    parsed.accessToken === undefined || typeof parsed.accessToken === 'string'
      ? parsed.accessToken
      : undefined
  const actor = coerceUser(parsed.actor)
  return {
    user,
    tenantId,
    signedInAt: parsed.signedInAt,
    accessToken,
    workspacePending: parsed.workspacePending === true,
    workspaces: Array.isArray(parsed.workspaces)
      ? (parsed.workspaces as AuthSession['workspaces'])
      : undefined,
    activeWorkspaceId:
      typeof parsed.activeWorkspaceId === 'string'
        ? parsed.activeWorkspaceId
        : undefined,
    ...(actor && actor.id !== user.id ? { actor } : {}),
  }
}

/** Real signed-in identity (admin) even while viewing as another user. */
export function sessionActor(session: AuthSession | null): AuthUser | null {
  if (!session) return null
  return session.actor ?? session.user
}

export function isViewingAsSession(session: AuthSession | null): boolean {
  return Boolean(session?.actor)
}

function migrateLegacySession(): AuthSession | null {
  try {
    if (sessionStorage.getItem(LEGACY_AUTH_KEY) !== '1') return null
    sessionStorage.removeItem(LEGACY_AUTH_KEY)
    clearSession()
    return null
  } catch {
    return null
  }
}

export function readSession(): AuthSession | null {
  const raw = readRawSession()
  if (!raw) return migrateLegacySession()
  try {
    const parsed = JSON.parse(raw) as unknown
    const session = coerceSession(parsed)
    if (session) {
      if (
        session.tenantId !== (parsed as { tenantId?: string }).tenantId ||
        session.user.role !== (parsed as { user?: { role?: string } }).user?.role
      ) {
        writeSession(session)
      }
      return session
    }
  } catch {
    /* fall through */
  }
  if (raw === '1') {
    clearSession()
    return null
  }
  return migrateLegacySession()
}

export function getAccessToken(): string | null {
  return readSession()?.accessToken ?? null
}

export function getActiveTenantId(): string {
  return readSession()?.tenantId ?? DEFAULT_TENANT_ID
}

export function isSignedIn(): boolean {
  return readSession() !== null
}

function normalizeLoginEmail(value: string): string {
  return value.trim().toLowerCase()
}

function authApiConfigured(): boolean {
  const flag = import.meta.env.VITE_USE_PLATFORM_API as string | undefined
  if (flag === '0' || flag === 'false') return false
  if (flag === '1' || flag === 'true') return true
  return import.meta.env.PROD === true
}

/** Offline seed login only when explicitly allowed (not the default live path). */
function allowOfflineAuthFallback(): boolean {
  const flag = import.meta.env.VITE_ALLOW_OFFLINE_AUTH as string | undefined
  return flag === '1' || flag === 'true'
}

function isNetworkFailure(error: unknown): boolean {
  if (error instanceof TypeError) return true
  if (!(error instanceof Error)) return false
  return /failed to fetch|networkerror|load failed|network request failed/i.test(
    error.message,
  )
}

type LoginResponse = {
  accessToken: string
  tenantId: string
  signedInAt: string
  user: AuthUser
}

async function loginViaApi(
  email: string,
  password: string,
): Promise<AuthSession> {
  try {
    const body = await apiFetch<LoginResponse>('/api/platform/auth/login', {
      method: 'POST',
      skipAuth: true,
      body: { email, password },
    })
    const user = coerceUser(body.user)
    if (!user || !body.accessToken) {
      throw new Error('Sign-in response was incomplete.')
    }
    const session: AuthSession = {
      user,
      tenantId: body.tenantId || DEFAULT_TENANT_ID,
      signedInAt: body.signedInAt || new Date().toISOString(),
      accessToken: body.accessToken,
    }
    writeSession(session)
    return session
  } catch (error) {
    if (error instanceof ApiError) {
      const message =
        error.body &&
        typeof error.body === 'object' &&
        'error' in error.body &&
        typeof (error.body as { error: unknown }).error === 'string'
          ? (error.body as { error: string }).error
          : 'Email or password is incorrect.'
      throw new Error(message)
    }
    throw error
  }
}

async function loginLocally(
  email: string,
  password: string,
): Promise<AuthSession> {
  const seeded = findSeededAccountByEmail(email)
  if (seeded) {
    const valid = await verifyPasswordHash(password, seeded.passwordHash)
    if (!valid) {
      throw new Error('Email or password is incorrect.')
    }
    const session: AuthSession = {
      user: seeded.user,
      tenantId: seeded.tenantId,
      signedInAt: new Date().toISOString(),
    }
    writeSession(session)
    return session
  }

  const provisioned = await verifyProvisionedLogin(email, password)
  if (!provisioned) {
    if (findProvisionedAccountByEmail(email)) {
      throw new Error('Email or password is incorrect.')
    }
    throw new Error('This account is not authorized.')
  }

  const session: AuthSession = {
    user: provisioned.user,
    tenantId: provisioned.tenantId,
    signedInAt: new Date().toISOString(),
  }
  writeSession(session)
  return session
}

function apiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) {
    return error instanceof Error ? error.message : fallback
  }
  if (
    error.body &&
    typeof error.body === 'object' &&
    'error' in error.body &&
    typeof (error.body as { error: unknown }).error === 'string'
  ) {
    return (error.body as { error: string }).error
  }
  return fallback
}

export type ProvisionAgencyUserInput = {
  email: string
  name: string
  password: string
  tenantId: string
  memberRole?: 'owner' | 'manager' | 'staff'
}

export type ProvisionedAgencyUser = {
  id: string
  email: string
  name: string
  role: AuthUser['role']
  tenantId: string
  subAgentId?: string
  /** True when an existing agency login was linked instead of creating a new password. */
  linkedExisting?: boolean
}

export type ProvisionSubAgentUserInput = {
  email: string
  name: string
  /** Required for a new login; ignored when linking an existing agency email. */
  password?: string
  tenantId: string
  subAgentId: string
}

/**
 * Create a real login for an agency user (admin-set initial password).
 * Uses the platform API when enabled; otherwise stores a local hashed login.
 */
export async function provisionAgencyUser(
  input: ProvisionAgencyUserInput,
): Promise<ProvisionedAgencyUser> {
  const email = normalizeLoginEmail(input.email)
  const name = input.name.trim()
  const password = input.password
  const tenantId = input.tenantId.trim()
  const id = `user-${crypto.randomUUID()}`

  if (!email) throw new Error('Email is required.')
  if (!name) throw new Error('Name is required.')
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters.')
  }
  if (!tenantId) throw new Error('Agency is required.')

  if (authApiConfigured()) {
    try {
      const body = await apiFetch<{
        user: AuthUser
        tenantId: string
      }>('/api/platform/auth/users', {
        method: 'POST',
        body: {
          email,
          name,
          password,
          tenantId,
          id,
          memberRole: input.memberRole,
        },
      })
      const user = coerceUser(body.user)
      if (!user) throw new Error('Create-user response was incomplete.')
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: body.tenantId || tenantId,
      }
    } catch (error) {
      if (!isNetworkFailure(error)) {
        throw new Error(apiErrorMessage(error, 'Could not create login.'))
      }
      /* fall through to local provision when API is unreachable */
    }
  }

  const local = await saveProvisionedLogin({
    id,
    email,
    name,
    tenantId,
    password,
  })
  return {
    id: local.user.id,
    email: local.user.email,
    name: local.user.name,
    role: local.user.role,
    tenantId: local.tenantId,
  }
}

/**
 * Create a login for a CRM sub-agent (agency-set password).
 * Uses the platform API when enabled; otherwise stores a local hashed login.
 */
export async function provisionSubAgentUser(
  input: ProvisionSubAgentUserInput,
): Promise<ProvisionedAgencyUser> {
  const email = normalizeLoginEmail(input.email)
  const name = input.name.trim()
  const password = input.password
  const tenantId = input.tenantId.trim()
  const subAgentId = input.subAgentId.trim()
  const id = `user-${crypto.randomUUID()}`

  if (!email) throw new Error('Email is required.')
  if (!name) throw new Error('Name is required.')
  if (!tenantId) throw new Error('Agency is required.')
  if (!subAgentId) throw new Error('Sub agent is required.')

  if (authApiConfigured()) {
    try {
      const linkOnly = !password || password.length < 8
      const body = await apiFetch<{
        user: AuthUser
        tenantId: string
        linked?: boolean
      }>('/api/platform/auth/users', {
        method: 'POST',
        body: {
          email,
          name,
          ...(linkOnly ? { linkOnly: true } : { password }),
          tenantId,
          id,
          role: 'sub_agent',
          subAgentId,
        },
      })
      const user = coerceUser(body.user)
      if (!user) throw new Error('Create-user response was incomplete.')
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: body.tenantId || tenantId,
        subAgentId: user.subAgentId ?? subAgentId,
        linkedExisting: body.linked === true,
      }
    } catch (error) {
      if (!isNetworkFailure(error)) {
        throw new Error(apiErrorMessage(error, 'Could not create login.'))
      }
    }
  }

  const existing =
    findProvisionedAccountByEmail(email) ?? findSeededAccountByEmail(email)
  if (existing) {
    // Same email already has a login — attach sub-agent access; keep their password.
    // Do not overwrite the agency password from the sub-agent form.
    return {
      id: existing.user.id,
      email: existing.user.email,
      name: existing.user.name,
      role: existing.user.role,
      tenantId: existing.tenantId,
      subAgentId,
      linkedExisting: true,
    }
  }

  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters.')
  }

  const local = await saveProvisionedLogin({
    id,
    email,
    name,
    tenantId,
    password,
    role: 'sub_agent',
    subAgentId,
  })
  return {
    id: local.user.id,
    email: local.user.email,
    name: local.user.name,
    role: local.user.role,
    tenantId: local.tenantId,
    subAgentId: local.user.subAgentId ?? subAgentId,
  }
}

async function assertSessionAllowed(session: AuthSession): Promise<void> {
  if (session.user.role === 'platform_admin') return

  // Dynamic import avoids circular init with tenants/members stores.
  const [{ getTenantById }, { findTenantMemberForUser }] = await Promise.all([
    import('@/lib/tenantsStore'),
    import('@/lib/tenantMembersStore'),
  ])

  const tenant = getTenantById(session.tenantId)
  if (tenant?.status === 'suspended') {
    clearSession()
    throw new Error('This agency is suspended. Contact support.')
  }

  if (session.user.role === 'sub_agent') {
    const [{ findSubAgentById }, { getSubAgentLogin }] = await Promise.all([
      import('@/lib/subAgentsStore'),
      import('@/lib/subAgentLoginsStore'),
    ])
    const subAgentId = session.user.subAgentId
    if (!subAgentId) {
      clearSession()
      throw new Error('This sub-agent login is incomplete. Contact your agency.')
    }
    const subAgent = findSubAgentById(subAgentId)
    if (!subAgent || subAgent.status === 'Inactive') {
      clearSession()
      throw new Error(
        'This sub-agent account is inactive. Contact your agency.',
      )
    }
    const link = getSubAgentLogin(subAgentId, session.tenantId)
    if (link?.status === 'disabled') {
      clearSession()
      throw new Error('Your account is disabled. Contact your agency.')
    }
    return
  }

  const member = findTenantMemberForUser(
    session.tenantId,
    session.user.id,
    session.user.email,
  )
  if (member?.status === 'disabled') {
    clearSession()
    throw new Error('Your account is disabled. Contact your agency owner.')
  }
}

export type SignInOptions = {
  /** Agency vs sub-agent login — chosen on the login form. */
  intent?: import('@/lib/authWorkspaces').LoginIntent
}

/**
 * Email/password sign-in against the platform API when enabled,
 * otherwise against seeded local accounts (dev / offline).
 */
export async function signInWithPassword(
  email: string,
  password: string,
  options?: SignInOptions,
): Promise<AuthSession> {
  const normalizedEmail = normalizeLoginEmail(email)
  const rawPassword = password

  if (!normalizedEmail) {
    throw new Error('Enter your email.')
  }
  if (!rawPassword) {
    throw new Error('Enter your password.')
  }

  let session: AuthSession
  if (authApiConfigured()) {
    try {
      session = await loginViaApi(normalizedEmail, rawPassword)
    } catch (error) {
      if (isNetworkFailure(error) && allowOfflineAuthFallback()) {
        session = await loginLocally(normalizedEmail, rawPassword)
      } else if (isNetworkFailure(error)) {
        throw new Error(
          'Cannot reach the live API. Check your network, or set VITE_ALLOW_OFFLINE_AUTH=1 for demo logins only.',
        )
      } else {
        throw error
      }
    }
  } else {
    session = await loginLocally(normalizedEmail, rawPassword)
  }

  // Dynamic import avoids circular init with tenant/member stores.
  const { withResolvedWorkspaces } = await import('@/lib/authWorkspaces')
  try {
    session = withResolvedWorkspaces(session, options?.intent)
  } catch (error) {
    clearSession()
    throw error
  }
  writeSession(session)

  if (!session.workspacePending) {
    await assertSessionAllowed(session)
  }
  return session
}

/** Enter a workspace after the post-login picker (or switch later). */
export async function selectAuthWorkspace(
  workspaceId: string,
): Promise<AuthSession> {
  const current = readSession()
  if (!current) {
    throw new Error('Sign in again to choose a workspace.')
  }
  if (isViewingAsSession(current)) {
    throw new Error('Exit View as user before switching workspace.')
  }
  const { listWorkspacesForUser, applyWorkspaceToSession } = await import(
    '@/lib/authWorkspaces'
  )
  const resolved =
    current.workspaces && current.workspaces.length > 0
      ? current.workspaces
      : listWorkspacesForUser(current.user, current.tenantId)
  const workspace = resolved.find((row) => row.id === workspaceId)
  if (!workspace) {
    throw new Error('That workspace is no longer available.')
  }
  const next = applyWorkspaceToSession(
    { ...current, workspaces: resolved },
    workspace,
  )
  writeSession(next)
  return next
}

type ViewAsResponse = {
  user: AuthUser
  tenantId: string
  actor?: AuthUser
  viewingAs?: boolean
}

async function applyViewAsResponse(
  current: AuthSession,
  body: ViewAsResponse,
): Promise<AuthSession> {
  const user = coerceUser(body.user)
  if (!user) {
    throw new Error('View as response was incomplete.')
  }
  const actor = coerceUser(body.actor) ?? current.actor ?? current.user
  const { withResolvedWorkspaces } = await import('@/lib/authWorkspaces')
  let next: AuthSession = {
    ...current,
    user,
    tenantId: body.tenantId || current.tenantId,
    actor,
    workspacePending: false,
    workspaces: undefined,
    activeWorkspaceId: undefined,
  }
  next = withResolvedWorkspaces(next)
  writeSession(next)
  return next
}

/**
 * Platform admin: see the app exactly as the target agency / sub-agent user.
 * Keeps the admin Bearer token; server scopes data to the target.
 */
export async function startViewAsUser(input: {
  userId: string
  email?: string
  name?: string
  role?: AuthUser['role']
  tenantId: string
  subAgentId?: string
}): Promise<AuthSession> {
  const current = readSession()
  const actor = sessionActor(current)
  if (!current || !actor) {
    throw new Error('Sign in again to view as a user.')
  }
  if (actor.role !== 'platform_admin') {
    throw new Error('Only the platform admin can view as another user.')
  }
  if (input.userId === actor.id) {
    throw new Error('You are already signed in as yourself.')
  }

  if (authApiConfigured() && current.accessToken) {
    try {
      const body = await apiFetch<ViewAsResponse>(
        '/api/platform/auth/view-as',
        {
          method: 'POST',
          body: {
            userId: input.userId,
            email: input.email,
          },
        },
      )
      return await applyViewAsResponse(current, body)
    } catch (error) {
      if (!isNetworkFailure(error) || !allowOfflineAuthFallback()) {
        throw new Error(apiErrorMessage(error, 'Could not start View as user.'))
      }
    }
  }

  if (!allowOfflineAuthFallback() && authApiConfigured()) {
    throw new Error('Could not reach the API to start View as user.')
  }

  const email = normalizeLoginEmail(input.email || '')
  const seeded = email ? findSeededAccountByEmail(email) : null
  const provisioned = email ? findProvisionedAccountByEmail(email) : null
  const targetUser: AuthUser = seeded?.user ?? {
    id: provisioned?.user.id || input.userId,
    email: email || input.userId,
    name: (input.name || provisioned?.user.name || email || 'User').trim(),
    role: input.role === 'sub_agent' ? 'sub_agent' : 'agency_user',
    ...(input.subAgentId
      ? { subAgentId: input.subAgentId }
      : provisioned?.user.subAgentId
        ? { subAgentId: provisioned.user.subAgentId }
        : {}),
  }
  return applyViewAsResponse(current, {
    user: targetUser,
    tenantId: seeded?.tenantId || provisioned?.tenantId || input.tenantId,
    actor,
    viewingAs: true,
  })
}

/** Leave View as user and restore the platform admin session. */
export async function stopViewAsUser(): Promise<AuthSession> {
  const current = readSession()
  if (!current) {
    throw new Error('Sign in again.')
  }
  if (!isViewingAsSession(current) || !current.actor) {
    return current
  }

  const actor = current.actor

  if (authApiConfigured() && current.accessToken) {
    try {
      const body = await apiFetch<ViewAsResponse>(
        '/api/platform/auth/view-as/stop',
        {
          method: 'POST',
          body: {},
        },
      )
      const user = coerceUser(body.user) ?? actor
      const { withResolvedWorkspaces } = await import('@/lib/authWorkspaces')
      const restored: AuthSession = {
        user,
        tenantId: body.tenantId || current.tenantId,
        signedInAt: current.signedInAt,
        accessToken: current.accessToken,
      }
      const next = withResolvedWorkspaces(restored)
      writeSession(next)
      return next
    } catch (error) {
      if (!isNetworkFailure(error) || !allowOfflineAuthFallback()) {
        throw new Error(apiErrorMessage(error, 'Could not exit View as user.'))
      }
    }
  }

  const { withResolvedWorkspaces } = await import('@/lib/authWorkspaces')
  let next: AuthSession = {
    user: actor,
    tenantId: current.tenantId,
    signedInAt: current.signedInAt,
    accessToken: current.accessToken,
  }
  next = withResolvedWorkspaces(next)
  writeSession(next)
  return next
}

export async function setAgencyUserStatus(input: {
  userId: string
  email: string
  status: 'active' | 'disabled'
}): Promise<void> {
  if (authApiConfigured()) {
    try {
      await apiFetch(
        `/api/platform/auth/users/${encodeURIComponent(input.userId)}/status`,
        {
          method: 'PATCH',
          body: { status: input.status, email: input.email },
        },
      )
      return
    } catch (error) {
      if (!isNetworkFailure(error)) {
        throw new Error(apiErrorMessage(error, 'Could not update user status.'))
      }
    }
  }
  /* Local/offline: member status is the source of truth. */
}

export async function setAgencyUserPassword(input: {
  userId: string
  email: string
  password: string
  name?: string
  tenantId?: string
}): Promise<void> {
  if (!input.password || input.password.length < 4) {
    throw new Error('Password must be at least 8 characters.')
  }
  if (authApiConfigured()) {
    try {
      await apiFetch(
        `/api/platform/auth/users/${encodeURIComponent(input.userId)}/password`,
        {
          method: 'PATCH',
          body: {
            password: input.password,
            email: input.email,
            name: input.name,
            tenantId: input.tenantId,
          },
        },
      )
      return
    } catch (error) {
      if (!isNetworkFailure(error)) {
        throw new Error(apiErrorMessage(error, 'Could not update password.'))
      }
    }
  }
  const { updateProvisionedPassword } = await import('@/lib/provisionedUsers')
  try {
    await updateProvisionedPassword(input.userId, input.password, input.email)
  } catch {
    await saveProvisionedLogin({
      id: input.userId,
      email: input.email,
      name: input.name || input.email,
      tenantId: input.tenantId || DEFAULT_TENANT_ID,
      password: input.password,
    })
  }
}

export async function signOut(): Promise<void> {
  const token = getAccessToken()
  if (token && authApiConfigured()) {
    try {
      await apiFetch('/api/platform/auth/logout', {
        method: 'POST',
        body: {},
      })
    } catch {
      /* session cleared locally regardless */
    }
  }
  clearSession()
}

export type InviteCreateResult = {
  id: string
  token: string
  email: string
  name: string
  memberRole: string
  tenantId: string
  expiresAt: string
  subAgentId?: string
  role?: AuthUser['role']
}

export async function createUserInvite(input: {
  email: string
  name: string
  memberRole?: 'owner' | 'manager' | 'staff'
  tenantId?: string
  subAgentId?: string
  role?: 'agency_user' | 'sub_agent'
}): Promise<InviteCreateResult> {
  if (authApiConfigured()) {
    try {
      return await apiFetch<InviteCreateResult>('/api/platform/invites', {
        method: 'POST',
        body: {
          email: input.email,
          name: input.name,
          memberRole: input.memberRole ?? 'staff',
          tenantId: input.tenantId,
          subAgentId: input.subAgentId,
          role: input.role,
        },
      })
    } catch (error) {
      if (!isNetworkFailure(error)) {
        throw new Error(apiErrorMessage(error, 'Could not create invite.'))
      }
    }
  }

  const { createLocalInvite } = await import('@/lib/localInvitesStore')
  return createLocalInvite({
    email: input.email,
    name: input.name,
    memberRole: input.memberRole ?? 'staff',
    tenantId: input.tenantId ?? getActiveTenantId(),
    subAgentId: input.subAgentId,
    role: input.role ?? (input.subAgentId ? 'sub_agent' : 'agency_user'),
  })
}

export async function fetchInvite(token: string) {
  if (authApiConfigured()) {
    try {
      return await apiFetch<{
        email: string
        name: string
        memberRole: string
        tenantId: string
        agencyName: string
        expiresAt: string
        subAgentId?: string
        role?: AuthUser['role']
      }>(`/api/platform/public/invites/${encodeURIComponent(token)}`, {
        skipAuth: true,
      })
    } catch (error) {
      if (!isNetworkFailure(error)) throw error
    }
  }
  const { getLocalInviteView } = await import('@/lib/localInvitesStore')
  const local = getLocalInviteView(token)
  if (!local) throw new Error('Invite not found.')
  return local
}

export async function acceptUserInvite(token: string, password: string) {
  if (authApiConfigured()) {
    try {
      return await apiFetch<{
        userId: string
        email: string
        name: string
        tenantId: string
        memberRole: string
        subAgentId?: string
        role?: AuthUser['role']
      }>(`/api/platform/public/invites/${encodeURIComponent(token)}/accept`, {
        method: 'POST',
        skipAuth: true,
        body: { password },
      })
    } catch (error) {
      if (!isNetworkFailure(error)) {
        throw new Error(apiErrorMessage(error, 'Could not accept invite.'))
      }
    }
  }
  const { acceptLocalInvite } = await import('@/lib/localInvitesStore')
  return acceptLocalInvite(token, password)
}

export async function requestPasswordReset(email: string) {
  return apiFetch<{ sent: boolean }>(
    '/api/platform/auth/password-reset/request',
    {
      method: 'POST',
      skipAuth: true,
      body: { email },
    },
  )
}

export async function fetchPasswordReset(token: string) {
  return apiFetch<{
    emailMasked: string
    expiresAt: string
  }>(`/api/platform/public/password-reset/${encodeURIComponent(token)}`, {
    skipAuth: true,
  })
}

export async function confirmPasswordReset(token: string, password: string) {
  return apiFetch<{ reset: boolean; emailMasked: string }>(
    `/api/platform/public/password-reset/${encodeURIComponent(token)}/confirm`,
    {
      method: 'POST',
      skipAuth: true,
      body: { password },
    },
  )
}
