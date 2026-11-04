import { downloadDocumentPdf } from '@/lib/downloadDocumentPdf'
import {
  subAgentClientReportPdfFileName,
  type SubAgentClientReport,
} from '@/lib/subAgentClientReport'

export const SUB_AGENT_CLIENT_REPORT_SELECTOR =
  '[data-sub-agent-client-report]'

export async function downloadSubAgentClientReportPdf(
  report: Pick<SubAgentClientReport, 'subAgentId' | 'issuedOn'>,
) {
  await downloadDocumentPdf({
    selector: SUB_AGENT_CLIENT_REPORT_SELECTOR,
    fileName: subAgentClientReportPdfFileName(report),
    missingMessage: 'Client report is not on the page',
  })
}
