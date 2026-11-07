import { useState } from 'react'
import { Download, Printer } from 'lucide-react'
import { downloadInvoicePdf } from '@/lib/downloadInvoicePdf'
import { Button } from '@/components/shadcn/button'

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
        variant="outline"
        className="h-9 rounded-lg"
        onClick={() => window.print()}
      >
        <Printer size={14} strokeWidth={2.25} aria-hidden />
        Print Invoice
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-9 rounded-lg"
        disabled={isDownloading}
        onClick={() => void handleDownload()}
      >
        <Download size={14} strokeWidth={2.25} aria-hidden />
        {isDownloading ? 'Downloading…' : 'Download PDF'}
      </Button>
    </>
  )
}
