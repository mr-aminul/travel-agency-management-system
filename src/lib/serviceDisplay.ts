import { getCurrentStepLabel } from '@/lib/caseChecklist'
import type { Case } from '@/types/case'

export function serviceTypeHasSiblings(
  services: Pick<Case, 'service'>[],
  serviceType: string,
): boolean {
  return services.filter((item) => item.service === serviceType).length > 1
}

/** Extra line on the client service switcher when two files share a type. */
export function serviceSwitcherMeta(
  item: Case,
  services: Pick<Case, 'service'>[],
): string | null {
  if (!serviceTypeHasSiblings(services, item.service)) return null
  const destination = item.destination?.trim()
  const detail = destination || getCurrentStepLabel(item)
  return `${item.caseId} · ${detail}`
}

export function serviceSwitcherAriaLabel(
  item: Case,
  services: Pick<Case, 'service'>[],
): string {
  const meta = serviceSwitcherMeta(item, services)
  return meta ? `${item.service}, ${meta}` : item.service
}

export function serviceDetailAriaLabel(item: Pick<Case, 'service' | 'caseId'>): string {
  return `${item.service} (${item.caseId})`
}
