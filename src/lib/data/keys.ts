/**
 * Storage keys for core records.
 * Keep stable — renaming breaks existing browser data.
 */
export const DATA_KEYS = {
  clientsCreated: 'pd-clients-created',
  clientsTrash: 'pd-clients-trash',
  clientsRemoved: 'pd-clients-removed',
  subAgentsCreated: 'pd-sub-agents-created',
  /** Pre–Sub Agent rename. */
  subAgentsCreatedLegacy: 'pd-partners-created',
  casesCreated: 'pd-cases-created',
  tenantEntitlements: 'pd-tenant-entitlements',
  tenantsCreated: 'pd-tenants-created',
  tenantMembersCreated: 'pd-tenant-members-created',
} as const

export type DataKey = (typeof DATA_KEYS)[keyof typeof DATA_KEYS]
