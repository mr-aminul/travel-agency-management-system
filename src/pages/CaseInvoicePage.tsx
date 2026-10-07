import { useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { Check, Share2 } from 'lucide-react'
import { InvoicePageView } from '@/components/invoices/InvoicePageView'
import { InvoicePrintActions } from '@/components/invoices/InvoicePrintActions'
import { buildCaseInvoice } from '@/lib/caseInvoice'
import { getCaseById, useCases } from '@/lib/casesStore'
import { getClientById } from '@/lib/clientsStore'
import { BackButton, Button } from '@/components/ui'
import {
  copyText,
  invoiceForDocument,
  publicInvoiceUrl,
} from '@/lib/invoiceShare'
import { workDetailPath } from '@/lib/workPaths'
import { usePaymentsByCaseId } from '@/lib/paymentsStore'
import { useAgencyProfile } from '@/layout/useAgencyProfile'
import { layoutConfig } from '@/config/layout'

export default function CaseInvoicePage() {
  const { id = '', caseId = '' } = useParams()
  const [copied, setCopied] = useState(false)
  useCases()
  const recordId = caseId || id
  const caseItem = getCaseById(recordId)
  const payments = usePaymentsByCaseId(recordId)
  const client = caseItem ? getClientById(caseItem.clientId) : undefined
  const profile = useAgencyProfile()

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 1500)
    return () => window.clearTimeout(timer)
  }, [copied])

  if (!caseItem) {
    return <Navigate to="/services" replace />
  }

  const defaultLogoUrl = layoutConfig.brand.logoUrl ?? ''
  const invoice = invoiceForDocument(
    buildCaseInvoice({
      caseItem,
      payments,
      client,
      profile,
      defaultLogoUrl,
    }),
    defaultLogoUrl,
  )

  const handleShare = async () => {
    await copyText(publicInvoiceUrl(invoice))
    setCopied(true)
  }

  return (
    <InvoicePageView
      invoice={invoice}
      toolbar={
        <>
          <BackButton to={workDetailPath(caseItem)} label="Service" />
          <div className="pd-invoice-page__actions">
            <Button size="sm" variant="secondary" onClick={() => void handleShare()}>
              {copied ? (
                <Check size={14} strokeWidth={2.25} aria-hidden />
              ) : (
                <Share2 size={14} strokeWidth={2.25} aria-hidden />
              )}
              {copied ? 'Link copied' : 'Share'}
            </Button>
            <InvoicePrintActions invoiceNumber={invoice.invoiceNumber} />
          </div>
        </>
      }
    />
  )
}
