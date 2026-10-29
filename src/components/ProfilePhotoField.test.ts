import { describe, expect, it } from 'vitest'
import {
  normalizeProfilePhotoUrl,
  PROFILE_PHOTO_MAX_BYTES,
  validateProfilePhotoFile,
} from '@/components/ProfilePhotoField'

describe('validateProfilePhotoFile', () => {
  it('rejects non-image files', () => {
    const file = new File(['x'], 'notes.txt', { type: 'text/plain' })
    expect(validateProfilePhotoFile(file)).toBe(
      'Please choose a JPG, PNG, or WebP image.',
    )
  })

  it('rejects files over 10 MB', () => {
    const file = new File(
      [new Uint8Array(PROFILE_PHOTO_MAX_BYTES + 1)],
      'big.jpg',
      { type: 'image/jpeg' },
    )
    expect(validateProfilePhotoFile(file)).toBe(
      'Please choose an image under 10 MB.',
    )
  })

  it('accepts images within the limit', () => {
    const file = new File(['tiny'], 'face.png', { type: 'image/png' })
    expect(validateProfilePhotoFile(file)).toBeUndefined()
  })
})

describe('normalizeProfilePhotoUrl', () => {
  it('keeps http(s) and data image URLs', () => {
    expect(normalizeProfilePhotoUrl(' https://cdn.example/a.jpg ')).toBe(
      'https://cdn.example/a.jpg',
    )
    expect(normalizeProfilePhotoUrl('data:image/png;base64,abc')).toBe(
      'data:image/png;base64,abc',
    )
  })

  it('rejects empty and non-http schemes', () => {
    expect(normalizeProfilePhotoUrl('')).toBeUndefined()
    expect(normalizeProfilePhotoUrl('ftp://cdn.example/a.jpg')).toBeUndefined()
    expect(normalizeProfilePhotoUrl('not a url')).toBeUndefined()
  })
})
