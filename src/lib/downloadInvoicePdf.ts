export const INVOICE_DOCUMENT_SELECTOR = '[data-invoice-document]'

export function invoicePdfFileName(invoiceNumber: string) {
  const safe = invoiceNumber.replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '')
  return `${safe || 'invoice'}.pdf`
}

export async function downloadInvoicePdf(invoiceNumber: string) {
  const source = document.querySelector(INVOICE_DOCUMENT_SELECTOR)
  if (!(source instanceof HTMLElement)) {
    throw new Error('Invoice document is not on the page')
  }

  const host = document.createElement('div')
  host.setAttribute('aria-hidden', 'true')
  Object.assign(host.style, {
    position: 'fixed',
    left: '-10000px',
    top: '0',
    width: '210mm',
    background: '#ffffff',
  })

  const clone = source.cloneNode(true) as HTMLElement
  clone.style.zoom = '1'
  clone.style.width = '210mm'
  clone.style.minHeight = '297mm'
  clone.style.boxShadow = 'none'
  host.appendChild(clone)
  document.body.appendChild(host)

  try {
    const html2canvas = (await import('html2canvas')).default
    const { jsPDF } = await import('jspdf')
    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    })
    const image = canvas.toDataURL('image/png')
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const imageHeight = (canvas.height * pageWidth) / canvas.width

    let remaining = imageHeight
    let offset = 0
    pdf.addImage(image, 'PNG', 0, offset, pageWidth, imageHeight)
    remaining -= pageHeight

    while (remaining > 0) {
      offset -= pageHeight
      pdf.addPage()
      pdf.addImage(image, 'PNG', 0, offset, pageWidth, imageHeight)
      remaining -= pageHeight
    }

    pdf.save(invoicePdfFileName(invoiceNumber))
  } finally {
    host.remove()
  }
}
