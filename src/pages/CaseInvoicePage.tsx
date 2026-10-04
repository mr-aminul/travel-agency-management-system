import { useEffect, useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Check, Printer, Share2 } from 'lucide-react'
import { Button } from '@/components/ui'
import { InvoiceDocument } from '@/components/invoices/InvoiceDocument'
import { buildCaseInvoice } from '@/lib/caseInvoice'
import { getCaseById, useCases } from '@/lib/casesStore'
import { getClientById } from '@/lib/clientsStore'
import { copyText, publicInvoiceUrl } from '@/lib/invoiceShare'
import { workDetailPath } from '@/lib/workPaths'
import { usePaymentsByCaseId } from '@/lib/paymentsStore'
import { useAgencyProfile } from '@/layout/useAgencyProfile'
import { layoutConfig } from '@/config/layout'
import '@/styles/layout-invoice.css'

export default function CaseInvoicePage() {
  const { id = '', caseId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const highlightedPaymentId = searchParams.get('payment') ?? undefined
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

  const invoice = buildCaseInvoice({
    caseItem,
    payments,
    client,
    profile,
    defaultLogoUrl: layoutConfig.brand.logoUrl,
  })

  const handleShare = async () => {
    await copyText(publicInvoiceUrl(invoice))
    setCopied(true)
  }

  return (
    <div className="pd-page pd-invoice-page" aria-label={`Invoice ${invoice.invoiceNumber}`}>
      <div className="pd-invoice-page__toolbar">
        <Link to={workDetailPath(caseItem)} className="pd-case-detail__back">
          <ArrowLeft size={14} strokeWidth={2.25} aria-hidden />
          Back to service
        </Link>
        <div className="pd-invoice-page__actions">
          <Button size="sm" variant="secondary" onClick={() => void handleShare()}>
            {copied ? (
              <Check size={14} strokeWidth={2.25} aria-hidden />
            ) : (
              <Share2 size={14} strokeWidth={2.25} aria-hidden />
            )}
            {copied ? 'Link copied' : 'Share'}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => window.print()}
          >
            <Printer size={14} strokeWidth={2.25} aria-hidden />
            Print invoice
          </Button>
        </div>
      </div>

      <div className="pd-invoice-page__stage">
        <InvoiceDocument
          invoice={invoice}
          highlightedPaymentId={highlightedPaymentId}
        />
      </div>
    </div>
  )
}
