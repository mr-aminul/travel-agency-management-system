import { useSyncExternalStore } from 'react'
import {
  DEMO_USER,
  LEISURE_USER,
  MANPOWER_USER,
} from '@/lib/authApi'
import { TENANT_IDS, type TenantMember } from '@/types/tenant'

type Listener = () => void

const SEED_MEMBERS: TenantMember[] = [
  {
    id: 'member-leisure-owner',
    tenantId: TENANT_IDS.leisure,
    name: LEISURE_USER.name,
    email: LEISURE_USER.email,
    role: 'owner',
    status: 'active',
  },
  {
    id: 'member-leisure-manager',
    tenantId: TENANT_IDS.leisure,
    name: 'Farzana Rahman',
    email: 'farzana@coastal-leisure.example',
    role: 'manager',
    status: 'active',
  },
  {
    id: 'member-leisure-staff',
    tenantId: TENANT_IDS.leisure,
    name: 'Imran Chowdhury',
    email: 'imran@coastal-leisure.example',
    role: 'staff',
    status: 'invited',
  },
  {
    id: 'member-manpower-owner',
    tenantId: TENANT_IDS.manpower,
    name: MANPOWER_USER.name,
    email: MANPOWER_USER.email,
    role: 'owner',
    status: 'active',
  },
  {
    id: 'member-manpower-manager',
    tenantId: TENANT_IDS.manpower,
    name: 'Nadia Sultana',
    email: 'nadia@horizon-manpower.example',
    role: 'manager',
    status: 'active',
  },
  {
    id: 'member-manpower-staff',
    tenantId: TENANT_IDS.manpower,
    name: 'Rafiq Hasan',
    email: 'rafiq@horizon-manpower.example',
    role: 'staff',
    status: 'disabled',
  },
  {
    id: 'member-full-owner',
    tenantId: TENANT_IDS.full,
    name: DEMO_USER.name,
    email: DEMO_USER.email,
    role: 'owner',
    status: 'active',
  },
  {
    id: 'member-full-manager',
    tenantId: TENANT_IDS.full,
    name: 'Shila Akter',
    email: 'shila@onetrack-demo.example',
    role: 'manager',
    status: 'active',
  },
  {
    id: 'member-full-staff',
    tenantId: TENANT_IDS.full,
    name: 'Tanvir Ahmed',
    email: 'tanvir@onetrack-demo.example',
    role: 'staff',
    status: 'active',
  },
]

const listeners = new Set<Listener>()
let members: TenantMember[] = SEED_MEMBERS.map((member) => ({ ...member }))

function emit() {
  listeners.forEach((listener) => listener())
}

function subscribe(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  return members
}

export function useTenantMembers(): TenantMember[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function getTenantMembers(tenantId: string): TenantMember[] {
  return members.filter((member) => member.tenantId === tenantId)
}

export function useTenantMembersByTenantId(tenantId: string): TenantMember[] {
  return useTenantMembers().filter((member) => member.tenantId === tenantId)
}

export function memberCountByTenantId(tenantId: string): number {
  return members.filter((member) => member.tenantId === tenantId).length
}

export function resetTenantMembers() {
  members = SEED_MEMBERS.map((member) => ({ ...member }))
  emit()
}
