import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, Share2 } from 'lucide-react'
import { BusinessProfileSetupNotice } from '@/components/BusinessProfileSetupNotice'
import { InvoicePageView } from '@/components/invoices/InvoicePageView'
import { InvoicePrintActions } from '@/components/invoices/InvoicePrintActions'
import { Button } from '@/components/shadcn/button'
import { buildCaseInvoice } from '@/lib/caseInvoice'
import { getCaseById, useCases } from '@/lib/casesStore'
import { getClientById } from '@/lib/clientsStore'
import {
  copyText,
  createPublicInvoiceShare,
  invoiceForDocument,
} from '@/lib/invoiceShare'
import { workDetailPath } from '@/lib/workPaths'
import { usePaymentsByCaseId } from '@/lib/paymentsStore'
import { useAgencyProfile } from '@/layout/useAgencyProfile'
import { agencyProfileIsIncomplete } from '@/lib/agencyProfileGaps'
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
  const profileIncomplete = agencyProfileIsIncomplete(profile)

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
    if (profileIncomplete) return
    const url = await createPublicInvoiceShare({
      invoice,
      caseId: caseItem.id,
    })
    await copyText(url)
    setCopied(true)
  }

  return (
    <InvoicePageView
      invoice={invoice}
      notice={
        profileIncomplete ? (
          <BusinessProfileSetupNotice profile={profile} variant="invoice" />
        ) : null
      }
      toolbar={
        <>
          <Link
            to={workDetailPath(caseItem)}
            className="inline-flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground"
            aria-label="Back to Service"
          >
            <ArrowLeft size={18} strokeWidth={2.25} aria-hidden />
          </Link>
          <div className="pd-invoice-page__actions">
            <Button
              size="sm"
              variant="outline"
              className="h-9 rounded-lg"
              disabled={profileIncomplete}
              title={
                profileIncomplete
                  ? 'Complete Business profile before sharing'
                  : undefined
              }
              onClick={() => void handleShare()}
            >
              {copied ? (
                <Check size={14} strokeWidth={2.25} aria-hidden />
              ) : (
                <Share2 size={14} strokeWidth={2.25} aria-hidden />
              )}
              {copied ? 'Link Copied' : 'Share'}
            </Button>
            <InvoicePrintActions invoiceNumber={invoice.invoiceNumber} />
          </div>
        </>
      }
    />
  )
}
