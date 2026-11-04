import { describe, expect, it } from 'vitest'
import {
  planPdfPageSlices,
  snapBreakBeforeBands,
} from '@/lib/downloadDocumentPdf'

describe('planPdfPageSlices', () => {
  it('keeps a short document on one page', () => {
    expect(
      planPdfPageSlices({
        imageHeightMm: 200,
        pageHeightMm: 297,
        marginMm: 12,
      }),
    ).toEqual([{ sourceYmm: 0, heightMm: 200, marginTopMm: 0 }])
  })

  it('adds top margin on the second page', () => {
    const slices = planPdfPageSlices({
      imageHeightMm: 500,
      pageHeightMm: 297,
      marginMm: 12,
    })

    expect(slices.length).toBeGreaterThan(1)
    expect(slices[0]).toEqual({
      sourceYmm: 0,
      heightMm: 297 - 12,
      marginTopMm: 0,
    })
    expect(slices[1]?.marginTopMm).toBe(12)
    expect(slices[1]?.heightMm).toBeLessThanOrEqual(297 - 12 - 12)

    const covered = slices.reduce((sum, slice) => sum + slice.heightMm, 0)
    expect(covered).toBeCloseTo(500, 1)
  })

  it('snaps page cuts before table rows instead of splitting them', () => {
    // Force a cut that would land inside a tall row near the page bottom.
    const slices = planPdfPageSlices({
      imageHeightMm: 400,
      pageHeightMm: 282,
      marginMm: 12,
      keepBandsMm: [
        { startMm: 240, endMm: 252 },
        { startMm: 252, endMm: 264 },
        { startMm: 268, endMm: 278 },
      ],
    })

    // Ideal end = 282 - 12 = 270, which splits 268–278 → snap to 268.
    expect(slices[0]?.heightMm).toBe(268)
    expect(slices[1]?.sourceYmm).toBe(268)
    expect(slices[1]?.marginTopMm).toBe(12)
  })
})

describe('snapBreakBeforeBands', () => {
  it('moves the cut to the start of a straddling row', () => {
    expect(
      snapBreakBeforeBands(0, 275, [{ startMm: 270, endMm: 282 }]),
    ).toBe(270)
  })

  it('keeps the ideal cut when no band is crossed', () => {
    expect(
      snapBreakBeforeBands(0, 250, [{ startMm: 270, endMm: 282 }]),
    ).toBe(250)
  })
})
