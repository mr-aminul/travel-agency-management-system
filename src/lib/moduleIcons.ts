import type { LucideIcon } from 'lucide-react'
import { Boxes, FileText, Handshake, UsersRound, Wallet } from 'lucide-react'
import { MODULE_CATALOG, SERVICE_MODULE } from '@/lib/modules'
import { iconForService } from '@/lib/serviceIcons'
import type { BuiltinServiceType } from '@/types/case'
import type { ModuleId } from '@/types/tenant'

const SERVICE_FOR_MODULE = Object.fromEntries(
  (Object.entries(SERVICE_MODULE) as [BuiltinServiceType, ModuleId][]).map(
    ([service, moduleId]) => [moduleId, service],
  ),
) as Partial<Record<ModuleId, BuiltinServiceType>>

const WORKSPACE_ICONS: Partial<Record<ModuleId, LucideIcon>> = {
  finance: Wallet,
  documents: FileText,
  subAgents: Handshake,
  hr: UsersRound,
}

export function iconForModule(moduleId: ModuleId): LucideIcon {
  const service = SERVICE_FOR_MODULE[moduleId]
  if (service) return iconForService(service)
  return WORKSPACE_ICONS[moduleId] ?? Boxes
}

export function labelForModule(moduleId: ModuleId): string {
  return MODULE_CATALOG.find((item) => item.id === moduleId)?.label ?? moduleId
}
