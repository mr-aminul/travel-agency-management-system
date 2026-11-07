import { useState } from 'react'
import { Download } from 'lucide-react'
import { downloadPayslipPdf } from '@/lib/downloadPayslipPdf'
import type { EmployeePayslip } from '@/lib/payslip'
import { Button } from '@/components/shadcn/button'

type PayslipDownloadButtonProps = {
  payslip: Pick<EmployeePayslip, 'employeeId' | 'yearMonth'>
  size?: 'sm' | 'default'
}

export function PayslipDownloadButton({
  payslip,
  size = 'sm',
}: PayslipDownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      await downloadPayslipPdf(payslip)
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <Button
      type="button"
      size={size}
      variant="secondary"
      className="h-9 rounded-lg"
      disabled={isDownloading}
      onClick={() => void handleDownload()}
    >
      <Download size={14} strokeWidth={2.25} aria-hidden />
      {isDownloading ? 'Downloading…' : 'Download PDF'}
    </Button>
  )
}
