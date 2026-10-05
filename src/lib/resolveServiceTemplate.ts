import { getBuiltinStepDefs } from '@/lib/caseChecklist'
import { getDefaultDocumentConfigs } from '@/lib/caseDocuments'
import {
  getServiceTemplateOverride,
  listServiceCountries,
  resolveServiceTemplateOverride,
} from '@/lib/serviceTemplatesStore'
import { withRequiredDocumentIds } from '@/lib/stepDocumentLinks'
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
  const documents = getDefaultDocumentConfigs(service)
  const steps = withRequiredDocumentIds(
    getBuiltinStepDefs(service).map((step) => ({
      id: step.id,
      label: step.label,
    })),
    documents,
  )
  return { steps, documents }
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
  const documents = override?.documents ?? fallback.documents
  const steps = withRequiredDocumentIds(
    override?.steps ?? fallback.steps,
    documents,
  )
  return {
    steps,
    documents,
    isCustomized: Boolean(exact),
    countryCount: listServiceCountries(service).length,
  }
}
