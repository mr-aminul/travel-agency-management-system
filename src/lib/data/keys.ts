/**
 * Storage keys for core records.
 * Keep stable — renaming breaks existing browser/API data.
 * Every key listed here is synced to the platform API when enabled.
 */
export const DATA_KEYS = {
  clientsCreated: 'pd-clients-created',
  clientsTrash: 'pd-clients-trash',
  clientsRemoved: 'pd-clients-removed',
  subAgentsCreated: 'pd-sub-agents-created',
  /** Legacy storage key (pre–sub-agent rename). Do not use in new code. */
  subAgentsCreatedLegacy: 'pd-partners-created',
  casesCreated: 'pd-cases-created',
  paymentsCreated: 'pd-payments-created',
  employeesCreated: 'pd-employees-created',
  attendanceCreated: 'pd-attendance-created',
  requestsCreated: 'pd-requests-created',
  clientMessages: 'pd-client-messages',
  serviceTemplates: 'pd-service-templates',
  documentTemplates: 'pd-document-print-templates',
  clientProfileFields: 'pd-client-profile-fields',
  customServices: 'pd-custom-services',
  hiddenServices: 'pd-hidden-services',
  serviceIconOverrides: 'pd-service-icon-overrides',
  commissionsCreated: 'pd-commissions-created',
  commissionSettlements: 'pd-commission-settlements',
  auditLog: 'pd-audit-log',
  onboardingState: 'pd-onboarding-state',
  tenantEntitlements: 'pd-tenant-entitlements',
  /** Display-name overrides for seeded tenants (created tenants store name inline). */
  tenantNames: 'pd-tenant-names',
  /** Status overrides for seeded tenants (created tenants store status inline). */
  tenantStatuses: 'pd-tenant-statuses',
  tenantsCreated: 'pd-tenants-created',
  tenantMembersCreated: 'pd-tenant-members-created',
  /** Local-only login rows for users provisioned when the API is offline. */
  provisionedLogins: 'pd-provisioned-logins',
  /** Per-tenant business profiles (contact + logo), keyed by tenant id. */
  agencyProfiles: 'pd-agency-profiles',
  /** Per-member page access matrix. */
  userPageAccess: 'pd-user-page-access',
  /** Per-tenant sub-agent approval settings. */
  subAgentAccessSettings: 'pd-sub-agent-access-settings',
  /** Pending creates/updates submitted by logged-in sub-agents. */
  subAgentPendingChanges: 'pd-sub-agent-pending-changes',
  /** Login links: sub-agent CRM id ↔ auth user. */
  subAgentLogins: 'pd-sub-agent-logins',
  /** Local invite tokens when the platform API is offline. */
  localInvites: 'pd-local-invites',
} as const

export type DataKey = (typeof DATA_KEYS)[keyof typeof DATA_KEYS]
