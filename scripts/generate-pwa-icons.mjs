#!/usr/bin/env node
/**
 * Rasterize the brand mark into PWA icon sizes.
 * Maskable icons keep a 20% safe zone on the theme field.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = path.join(root, 'public/images/logo.svg')
const outDir = path.join(root, 'public/images')
const svg = fs.readFileSync(src)

async function writeAny(size, name) {
  await sharp(svg)
    .resize(size, size, { fit: 'cover' })
    .png({ compressionLevel: 9 })
    .toFile(path.join(outDir, name))
}

async function writeMaskable(size, name) {
  const inner = Math.round(size * 0.72)
  const mark = await sharp(svg)
    .resize(inner, inner, { fit: 'contain', background: { r: 12, g: 45, b: 121, alpha: 1 } })
    .png()
    .toBuffer()
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 12, g: 45, b: 121, alpha: 1 },
    },
  })
    .composite([{ input: mark, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(outDir, name))
}

await writeAny(192, 'pwa-192.png')
await writeAny(512, 'pwa-512.png')
await writeAny(180, 'apple-touch-icon.png')
await writeMaskable(192, 'pwa-maskable-192.png')
await writeMaskable(512, 'pwa-maskable-512.png')
console.log('[pwa-icons] wrote 192 / 512 / apple-touch / maskable')
