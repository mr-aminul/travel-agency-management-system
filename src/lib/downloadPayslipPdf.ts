import { downloadDocumentPdf } from '@/lib/downloadDocumentPdf'
import { payslipPdfFileName, type EmployeePayslip } from '@/lib/payslip'

export const PAYSLIP_DOCUMENT_SELECTOR = '[data-payslip-document]'

export async function downloadPayslipPdf(
  payslip: Pick<EmployeePayslip, 'employeeId' | 'yearMonth'>,
) {
  await downloadDocumentPdf({
    selector: PAYSLIP_DOCUMENT_SELECTOR,
    fileName: payslipPdfFileName(payslip),
    missingMessage: 'Payslip document is not on the page',
  })
}
