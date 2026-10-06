import { describe, expect, it } from 'vitest'
import { invoicePdfFileName } from '@/lib/downloadInvoicePdf'

describe('invoice PDF file name', () => {
  it('keeps invoice numbers that are already file-safe', () => {
    expect(invoicePdfFileName('INV-SR-00101')).toBe('INV-SR-00101.pdf')
  })

  it('strips characters that are unsafe in a file name', () => {
    expect(invoicePdfFileName('INV/SR:00101')).toBe('INV-SR-00101.pdf')
  })
})
