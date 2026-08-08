/**
 * Compatibility re-export — compliance docs now live in caseDocuments.ts
 * and are persisted on each Case.
 */
export {
  complianceStatusMeta,
  getCaseComplianceDocuments,
  type ComplianceDocument,
} from '@/lib/caseDocuments'
export type { CaseDocumentStatus as ComplianceDocStatus } from '@/types/case'
