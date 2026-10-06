import { useState } from 'react'
import { Download, Printer } from 'lucide-react'
import { Button } from '@/components/ui'
import { downloadInvoicePdf } from '@/lib/downloadInvoicePdf'

type InvoicePrintActionsProps = {
  invoiceNumber: string
}

export function InvoicePrintActions({ invoiceNumber }: InvoicePrintActionsProps) {
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      await downloadInvoicePdf(invoiceNumber)
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => window.print()}
      >
        <Printer size={14} strokeWidth={2.25} aria-hidden />
        Print invoice
      </Button>
      <Button
        size="sm"
        variant="secondary"
        loading={isDownloading}
        onClick={() => void handleDownload()}
      >
        <Download size={14} strokeWidth={2.25} aria-hidden />
        {isDownloading ? 'Downloading…' : 'Download PDF'}
      </Button>
    </>
  )
}
