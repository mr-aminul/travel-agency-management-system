/** Outer page margins for sliced multi-page PDFs (mm). */
export const PDF_PAGE_MARGIN_MM = 12

/** Prefer not to leave a page shorter than this when snapping before a row. */
const MIN_PAGE_CONTENT_MM = 48

export type PdfKeepBand = {
  /** Inclusive start of an unbreakable block, in mm from document top. */
  startMm: number
  /** Exclusive-ish end of the block, in mm from document top. */
  endMm: number
}

type PageSlice = {
  /** Y offset of this slice in the full image, in mm. */
  sourceYmm: number
  /** Height of this slice in mm. */
  heightMm: number
  /** Top margin where the slice is placed on the PDF page. */
  marginTopMm: number
}

/**
 * Move a proposed page cut upward when it would slice through a keep-together
 * band (table row, header block, etc.).
 */
export function snapBreakBeforeBands(
  sourceStartMm: number,
  idealEndMm: number,
  bands: PdfKeepBand[],
  minContentMm = MIN_PAGE_CONTENT_MM,
): number {
  let endMm = idealEndMm
  for (const band of bands) {
    const straddles =
      band.startMm < endMm - 0.15 && band.endMm > endMm + 0.15
    if (!straddles) continue
    const snapped = band.startMm
    if (snapped - sourceStartMm >= minContentMm) {
      endMm = snapped
    }
    break
  }
  return Math.max(sourceStartMm + 1, Math.min(endMm, idealEndMm))
}

/**
 * Plan how a tall image is split across A4 pages with margins.
 * Page 1 keeps flush top (HTML docs already have padding). Later pages
 * get a top margin so content is not stuck to the edge.
 * Optional keep-together bands snap cuts between table rows.
 */
export function planPdfPageSlices(input: {
  imageHeightMm: number
  pageHeightMm: number
  marginMm?: number
  keepBandsMm?: PdfKeepBand[]
}): PageSlice[] {
  const marginMm = input.marginMm ?? PDF_PAGE_MARGIN_MM
  const pageHeightMm = input.pageHeightMm
  const imageHeightMm = input.imageHeightMm
  const bands = input.keepBandsMm ?? []
  if (imageHeightMm <= 0 || pageHeightMm <= 0) return []

  const slices: PageSlice[] = []
  let sourceYmm = 0
  let pageIndex = 0

  while (sourceYmm < imageHeightMm - 0.05) {
    const marginTopMm = pageIndex === 0 ? 0 : marginMm
    const availableMm = Math.max(
      1,
      pageHeightMm - marginTopMm - marginMm,
    )
    const idealEndMm = Math.min(sourceYmm + availableMm, imageHeightMm)
    const endMm =
      idealEndMm >= imageHeightMm - 0.05
        ? imageHeightMm
        : snapBreakBeforeBands(sourceYmm, idealEndMm, bands)
    const heightMm = Math.max(1, endMm - sourceYmm)
    slices.push({ sourceYmm, heightMm, marginTopMm })
    sourceYmm += heightMm
    pageIndex += 1
    if (pageIndex > 200) break
  }

  return slices
}

/** Measure table rows / key blocks so PDF cuts do not split them. */
export function measurePdfKeepBandsMm(
  root: HTMLElement,
  imageHeightMm: number,
): PdfKeepBand[] {
  const rootRect = root.getBoundingClientRect()
  const rootHeight = rootRect.height || 1
  const nodes = root.querySelectorAll(
    'tr, thead, .pd-invoice__header, .pd-invoice__parties, .pd-sub-agent-report__note, .pd-invoice__footer, .pd-payslip__note',
  )
  const bands: PdfKeepBand[] = []

  nodes.forEach((node) => {
    if (!(node instanceof HTMLElement)) return
    const rect = node.getBoundingClientRect()
    if (rect.height < 1) return
    const startMm = ((rect.top - rootRect.top) / rootHeight) * imageHeightMm
    const endMm = ((rect.bottom - rootRect.top) / rootHeight) * imageHeightMm
    if (endMm - startMm < 0.4) return
    bands.push({ startMm, endMm })
  })

  return bands.sort((a, b) => a.startMm - b.startMm)
}

function drawCanvasSlice(
  source: HTMLCanvasElement,
  sourceYpx: number,
  sliceHeightPx: number,
): HTMLCanvasElement {
  const pageCanvas = document.createElement('canvas')
  pageCanvas.width = source.width
  pageCanvas.height = Math.max(1, Math.ceil(sliceHeightPx))
  const context = pageCanvas.getContext('2d')
  if (!context) {
    throw new Error('Could not prepare PDF page image')
  }
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, pageCanvas.width, pageCanvas.height)
  context.drawImage(
    source,
    0,
    sourceYpx,
    source.width,
    sliceHeightPx,
    0,
    0,
    source.width,
    sliceHeightPx,
  )
  return pageCanvas
}

export async function downloadDocumentPdf(options: {
  selector: string
  fileName: string
  missingMessage?: string
  /** Override page margin in mm (default 12). */
  marginMm?: number
}) {
  const source = document.querySelector(options.selector)
  if (!(source instanceof HTMLElement)) {
    throw new Error(options.missingMessage ?? 'Document is not on the page')
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
  clone.style.setProperty('--invoice-scale', '1')
  clone.style.width = '210mm'
  clone.style.minHeight = '297mm'
  clone.style.boxShadow = 'none'
  host.appendChild(clone)
  document.body.appendChild(host)

  try {
    // html2canvas-pro supports modern CSS colors (oklch / color-mix) used by the theme.
    const html2canvas = (await import('html2canvas-pro')).default
    const { jsPDF } = await import('jspdf')
    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    })

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const imageWidthMm = pageWidth
    const imageHeightMm = (canvas.height * imageWidthMm) / canvas.width
    const pxPerMm = canvas.width / imageWidthMm
    const keepBandsMm = measurePdfKeepBandsMm(clone, imageHeightMm)

    const slices = planPdfPageSlices({
      imageHeightMm,
      pageHeightMm: pageHeight,
      marginMm: options.marginMm ?? PDF_PAGE_MARGIN_MM,
      keepBandsMm,
    })

    slices.forEach((slice, index) => {
      if (index > 0) pdf.addPage()

      const sourceYpx = Math.round(slice.sourceYmm * pxPerMm)
      const endYpx = Math.min(
        canvas.height,
        Math.round((slice.sourceYmm + slice.heightMm) * pxPerMm),
      )
      const sliceHeightPx = Math.max(1, endYpx - sourceYpx)
      const pageCanvas = drawCanvasSlice(canvas, sourceYpx, sliceHeightPx)
      const sliceHeightMm = sliceHeightPx / pxPerMm

      pdf.addImage(
        pageCanvas.toDataURL('image/png'),
        'PNG',
        0,
        slice.marginTopMm,
        imageWidthMm,
        sliceHeightMm,
      )
    })

    pdf.save(options.fileName)
  } finally {
    host.remove()
  }
}
