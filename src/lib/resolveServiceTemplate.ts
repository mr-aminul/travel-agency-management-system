import { getBuiltinStepDefs } from '@/lib/caseChecklist'
import { getDefaultDocumentConfigs } from '@/lib/caseDocuments'
import {
  getServiceTemplateOverride,
  listServiceCountries,
  resolveServiceTemplateOverride,
} from '@/lib/serviceTemplatesStore'
import type { ServiceType } from '@/types/case'
import type {
  ServiceDocumentConfig,
  ServiceStepConfig,
} from '@/types/serviceTemplate'

const ALL_COUNTRIES = ''

function defaultsFor(service: ServiceType): {
  steps: ServiceStepConfig[]
  documents: ServiceDocumentConfig[]
} {
  return {
    steps: getBuiltinStepDefs(service).map((step) => ({
      id: step.id,
      label: step.label,
    })),
    documents: getDefaultDocumentConfigs(service),
  }
}

export function resolveServiceTemplate(
  service: ServiceType,
  country = ALL_COUNTRIES,
): {
  steps: ServiceStepConfig[]
  documents: ServiceDocumentConfig[]
  isCustomized: boolean
  countryCount: number
} {
  const fallback = defaultsFor(service)
  const override = country
    ? resolveServiceTemplateOverride(service, country)
    : getServiceTemplateOverride(service)
  const exact = getServiceTemplateOverride(service, country)
  return {
    steps: override?.steps ?? fallback.steps,
    documents: override?.documents ?? fallback.documents,
    isCustomized: Boolean(exact),
    countryCount: listServiceCountries(service).length,
  }
}
