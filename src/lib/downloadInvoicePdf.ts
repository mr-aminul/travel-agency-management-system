import { downloadDocumentPdf } from '@/lib/downloadDocumentPdf'

export const INVOICE_DOCUMENT_SELECTOR = '[data-invoice-document]'

export function invoicePdfFileName(invoiceNumber: string) {
  const safe = invoiceNumber.replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '')
  return `${safe || 'invoice'}.pdf`
}

export async function downloadInvoicePdf(invoiceNumber: string) {
  await downloadDocumentPdf({
    selector: INVOICE_DOCUMENT_SELECTOR,
    fileName: invoicePdfFileName(invoiceNumber),
    missingMessage: 'Invoice document is not on the page',
  })
}
