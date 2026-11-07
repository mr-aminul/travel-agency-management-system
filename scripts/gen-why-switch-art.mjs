/**
 * High-fidelity BD passport + NID art for landing "Why agencies switch".
 * Layouts follow public Wikimedia specimens (e-passport bio page + NID front).
 * All personal data is fictional.
 */
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const root = path.resolve(import.meta.dirname, '..')
const refs = path.join(root, 'tmp/id-refs')
const outDir = path.join(root, 'public/images/landing')

const govSealB64 = fs.readFileSync(path.join(refs, 'gov-seal.png')).toString('base64')
const emblemB64 = fs.readFileSync(path.join(refs, 'national-emblem.png')).toString('base64')
const bioPatternB64 = fs.readFileSync(path.join(refs, 'bio-pattern-tile.png')).toString('base64')

const PERSON = {
  nameBn: 'নুসরাত আক্তার',
  nameEn: 'NUSRAT AKTER',
  fatherBn: 'আবদুল করিম',
  motherBn: 'সালমা বেগম',
  surname: 'AKTER',
  given: 'NUSRAT',
  dob: '12 MAR 1994',
  dobIso: '12 Mar 1994',
  pob: 'DHAKA',
  sex: 'F',
  nid: '1994123456',
  passportNo: 'A01234567',
  issue: '15 JAN 2023',
  expiry: '14 JAN 2033',
  personalNo: '1994123456789',
}

function guillochePattern() {
  return `
    <pattern id="guilloche" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M0 24 Q12 0 24 24 Q36 48 48 24" stroke="#9bb7d8" stroke-width="0.6" fill="none" opacity="0.55"/>
      <path d="M0 0 Q24 24 48 0" stroke="#d7a0b0" stroke-width="0.45" fill="none" opacity="0.4"/>
      <circle cx="24" cy="24" r="10" stroke="#a8c4e0" stroke-width="0.4" fill="none" opacity="0.35"/>
    </pattern>
    <pattern id="fineLines" width="6" height="6" patternUnits="userSpaceOnUse">
      <path d="M0 6 L6 0" stroke="#8fa9c8" stroke-width="0.35" opacity="0.25"/>
    </pattern>
  `
}

function silhouettePhoto(x, y, w, h, { tone = '#4a5568' } = {}) {
  const headR = w * 0.22
  const cx = x + w / 2
  const hy = y + h * 0.38
  return `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#d7dde8"/>
    <circle cx="${cx}" cy="${hy}" r="${headR}" fill="${tone}"/>
    <path d="M${x + w * 0.18} ${y + h * 0.98}
      C${x + w * 0.22} ${y + h * 0.62}, ${x + w * 0.78} ${y + h * 0.62}, ${x + w * 0.82} ${y + h * 0.98} Z"
      fill="${tone}"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#1f2a44" stroke-width="1.2"/>
  `
}

function govSealImage(cx, cy, size) {
  const half = size / 2
  return `<image href="data:image/png;base64,${govSealB64}" x="${cx - half}" y="${cy - half}" width="${size}" height="${size}"/>`
}

function emblemImage(cx, cy, size, opacity = 1) {
  const half = size / 2
  return `<image href="data:image/png;base64,${emblemB64}" x="${cx - half}" y="${cy - half}" width="${size}" height="${size}" opacity="${opacity}"/>`
}

function passportBioSvg() {
  const W = 700
  const H = 980
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    ${guillochePattern()}
    <pattern id="realPaper" width="160" height="160" patternUnits="userSpaceOnUse">
      <image href="data:image/png;base64,${bioPatternB64}" width="160" height="160"/>
    </pattern>
    <linearGradient id="holo" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#7dd3fc"/>
      <stop offset="25%" stop-color="#c4b5fd"/>
      <stop offset="50%" stop-color="#f9a8d4"/>
      <stop offset="75%" stop-color="#fde68a"/>
      <stop offset="100%" stop-color="#86efac"/>
    </linearGradient>
    <radialGradient id="paperGlow" cx="50%" cy="40%" r="70%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="#eaf1f8"/>
  <rect width="${W}" height="${H}" fill="url(#realPaper)" opacity="0.85"/>
  <rect width="${W}" height="${H}" fill="url(#guilloche)" opacity="0.35"/>
  <rect width="${W}" height="${H}" fill="url(#fineLines)"/>
  <rect width="${W}" height="${H}" fill="url(#paperGlow)"/>

  ${emblemImage(380, 430, 260, 0.1)}

  <!-- header -->
  <text x="36" y="42" font-family="Arial, Helvetica, sans-serif" font-size="15" font-weight="700" fill="#1b4d3e">পাসপোর্ট / PASSPORT</text>
  <text x="350" y="34" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="700" fill="#7a1f2b">গণপ্রজাতন্ত্রী বাংলাদেশ</text>
  <text x="350" y="54" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="700" fill="#7a1f2b">PEOPLE'S REPUBLIC OF BANGLADESH</text>

  ${silhouettePhoto(36, 78, 168, 210, { tone: '#5b6578' })}

  <!-- type / code / no -->
  <g font-family="Arial, Helvetica, sans-serif" fill="#1a2744">
    <text x="230" y="98" font-size="11" font-style="italic" opacity="0.75">Type / শ্রেণী</text>
    <text x="230" y="118" font-size="18" font-weight="700">P</text>

    <text x="310" y="98" font-size="11" font-style="italic" opacity="0.75">Country code / দেশ কোড</text>
    <text x="310" y="118" font-size="18" font-weight="700">BGD</text>

    <text x="460" y="98" font-size="11" font-style="italic" opacity="0.75">Passport No. / পাসপোর্ট নং</text>
    <text x="460" y="118" font-size="18" font-weight="700" fill="#9f1239">${PERSON.passportNo}</text>

    <text x="230" y="152" font-size="11" font-style="italic" opacity="0.75">Surname / বংশগত নাম</text>
    <text x="230" y="174" font-size="20" font-weight="700">${PERSON.surname}</text>

    <text x="230" y="208" font-size="11" font-style="italic" opacity="0.75">Given Name / প্রদত্ত নাম</text>
    <text x="230" y="230" font-size="20" font-weight="700">${PERSON.given}</text>

    <text x="230" y="264" font-size="11" font-style="italic" opacity="0.75">Nationality / জাতীয়তা</text>
    <text x="230" y="286" font-size="18" font-weight="700">BANGLADESHI</text>

    <text x="460" y="264" font-size="11" font-style="italic" opacity="0.75">Personal No. / ব্যক্তিগত নং</text>
    <text x="460" y="286" font-size="15" font-weight="700">${PERSON.personalNo}</text>
  </g>

  <!-- ghost image + flag -->
  <g opacity="0.35">${silhouettePhoto(560, 150, 86, 108, { tone: '#6b7280' })}</g>
  <g transform="translate(580 88)">
    <rect width="52" height="34" rx="3" fill="#006a4e"/>
    <circle cx="28" cy="17" r="10" fill="#f42a41"/>
  </g>

  <!-- lower fields -->
  <g font-family="Arial, Helvetica, sans-serif" fill="#1a2744">
    <text x="36" y="340" font-size="11" font-style="italic" opacity="0.75">Date of birth / জন্ম তারিখ</text>
    <text x="36" y="362" font-size="17" font-weight="700">${PERSON.dob}</text>

    <text x="250" y="340" font-size="11" font-style="italic" opacity="0.75">Sex / লিঙ্গ</text>
    <text x="250" y="362" font-size="17" font-weight="700">${PERSON.sex}</text>

    <text x="340" y="340" font-size="11" font-style="italic" opacity="0.75">Place of birth / জন্মস্থান</text>
    <text x="340" y="362" font-size="17" font-weight="700">${PERSON.pob}</text>

    <text x="36" y="410" font-size="11" font-style="italic" opacity="0.75">Date of issue / প্রদানের তারিখ</text>
    <text x="36" y="432" font-size="17" font-weight="700">${PERSON.issue}</text>

    <text x="280" y="410" font-size="11" font-style="italic" opacity="0.75">Issuing authority</text>
    <text x="280" y="432" font-size="15" font-weight="700">DIP / DHAKA</text>

    <text x="480" y="410" font-size="11" font-style="italic" opacity="0.75">Date of expiry</text>
    <text x="480" y="432" font-size="17" font-weight="700" fill="#9f1239">${PERSON.expiry}</text>
  </g>

  <!-- signature line -->
  <path d="M420 470 C440 450, 480 490, 520 460 C545 445, 560 470, 575 465" stroke="#1a2744" stroke-width="2" fill="none"/>
  <text x="420" y="498" font-family="Arial, Helvetica, sans-serif" font-size="11" fill="#1a2744" opacity="0.7">Holder's signature / স্বাক্ষর</text>

  <!-- holo strip -->
  <rect x="36" y="530" width="628" height="28" fill="url(#holo)" opacity="0.85"/>
  <g fill="#0c2d79" opacity="0.35">
    ${Array.from({ length: 14 }, (_, i) => `<circle cx="${60 + i * 44}" cy="544" r="7"/>`).join('')}
  </g>

  <!-- secondary page cue -->
  <rect x="36" y="580" width="628" height="170" rx="8" fill="#f7fbff" fill-opacity="0.55" stroke="#9bb7d8" stroke-opacity="0.5"/>
  <text x="56" y="612" font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="700" fill="#1b4d3e">PERSONAL DATA AND EMERGENCY CONTACT</text>
  <g font-family="Arial, Helvetica, sans-serif" font-size="13" fill="#1a2744">
    <text x="56" y="648">Father's Name: ${PERSON.fatherBn}</text>
    <text x="56" y="676">Mother's Name: ${PERSON.motherBn}</text>
    <text x="56" y="704">Present Address: DHAKA, BANGLADESH</text>
    <text x="56" y="732">Emergency Contact: +880 17XX-XXXXXX</text>
  </g>
  ${govSealImage(600, 680, 78)}

  <!-- MRZ -->
  <rect x="24" y="780" width="652" height="170" fill="#f4f7fb"/>
  <g font-family="Courier New, monospace" font-size="18" font-weight="700" fill="#111827">
    <text x="40" y="830">P&lt;BGD${PERSON.surname}&lt;&lt;${PERSON.given}&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</text>
    <text x="40" y="868">${PERSON.passportNo}4BGD9403124F3301148${PERSON.nid}&lt;&lt;&lt;84</text>
    <text x="40" y="906">BANGLADESHI&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</text>
  </g>
</svg>`
}

function nidFrontSvg() {
  const W = 1013
  const H = 641
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <pattern id="nidGrain" width="80" height="80" patternUnits="userSpaceOnUse">
      <circle cx="10" cy="12" r="0.8" fill="#000" opacity="0.04"/>
      <circle cx="40" cy="36" r="0.7" fill="#000" opacity="0.03"/>
      <circle cx="66" cy="18" r="0.8" fill="#000" opacity="0.035"/>
    </pattern>
    <linearGradient id="poly" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f7fbf8"/>
      <stop offset="100%" stop-color="#eef6f1"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" rx="18" fill="url(#poly)"/>
  <rect width="${W}" height="${H}" rx="18" fill="url(#nidGrain)"/>
  <rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="16" fill="none" stroke="#1f2937" stroke-width="3"/>

  ${emblemImage(640, 360, 300, 0.08)}

  <!-- header -->
  <line x1="24" y1="126" x2="${W - 24}" y2="126" stroke="#111" stroke-width="2"/>
  ${govSealImage(78, 64, 88)}
  <text x="140" y="48" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="700" fill="#111">গণপ্রজাতন্ত্রী বাংলাদেশ সরকার</text>
  <text x="140" y="78" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700" fill="#006a4e">Government of the People's Republic of Bangladesh</text>
  <text x="140" y="108" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="700">
    <tspan fill="#f42a41">National ID Card</tspan>
    <tspan fill="#111"> / জাতীয় পরিচয় পত্র</tspan>
  </text>

  <!-- gold chip (smart card cue) -->
  <g transform="translate(870 36)">
    <rect width="96" height="72" rx="8" fill="#d4a017" stroke="#8a6a0b" stroke-width="2"/>
    <rect x="10" y="12" width="76" height="48" rx="4" fill="#f0d36a" opacity="0.85"/>
    <path d="M18 24 H78 M18 36 H78 M18 48 H78 M34 12 V60 M58 12 V60" stroke="#8a6a0b" stroke-width="1.5" opacity="0.55"/>
  </g>

  ${silhouettePhoto(48, 160, 210, 250, { tone: '#4b5563' })}
  <path d="M70 470 C95 450, 140 490, 175 455 C195 438, 215 470, 230 462" stroke="#111" stroke-width="2.4" fill="none"/>
  <text x="70" y="500" font-family="Arial, Helvetica, sans-serif" font-size="14" fill="#333">Signature / স্বাক্ষর</text>

  <g font-family="Arial, Helvetica, sans-serif" fill="#111">
    <text x="300" y="190" font-size="22"><tspan font-weight="700">নাম:</tspan> ${PERSON.nameBn}</text>
    <text x="300" y="232" font-size="22"><tspan font-weight="700">Name:</tspan> ${PERSON.nameEn}</text>
    <text x="300" y="286" font-size="20"><tspan font-weight="700">পিতা:</tspan> ${PERSON.fatherBn}</text>
    <text x="300" y="330" font-size="20"><tspan font-weight="700">মাতা:</tspan> ${PERSON.motherBn}</text>
    <text x="300" y="390" font-size="22"><tspan font-weight="700">Date of Birth:</tspan> <tspan fill="#f42a41" font-weight="700">${PERSON.dobIso}</tspan></text>
    <text x="300" y="450" font-size="24"><tspan font-weight="700">ID NO:</tspan> <tspan fill="#f42a41" font-weight="700">${PERSON.nid}</tspan></text>
  </g>

  <!-- subtle hologram corner -->
  <rect x="820" y="500" width="140" height="90" rx="8" fill="#93c5fd" opacity="0.18" stroke="#60a5fa" stroke-opacity="0.4"/>
  <text x="890" y="552" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="14" fill="#1d4ed8" opacity="0.55">BGD</text>
</svg>`
}

async function softShadow(width, height, { blur = 28, opacity = 0.35 } = {}) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect x="12" y="16" width="${width - 24}" height="${height - 28}" rx="18" fill="rgba(0,0,0,${opacity})"/>
  </svg>`
  return sharp(Buffer.from(svg)).blur(blur).png().toBuffer()
}

async function hardenAlpha(rgba, width, height, { cut = 140, dilate = 0 } = {}) {
  // Soft AA edges wash to a pale halo on the red scene — snap to hard cut.
  for (let i = 0; i < rgba.length; i += 4) {
    const a = rgba[i + 3]
    if (a < cut) {
      rgba[i] = 0
      rgba[i + 1] = 0
      rgba[i + 2] = 0
      rgba[i + 3] = 0
      continue
    }
    rgba[i + 3] = 255
  }

  // After rotation, 1px gaps can let a light page show through as a white rim.
  // Grow the opaque green edge outward to seal those gaps.
  if (dilate > 0) {
    const src = Buffer.from(rgba)
    for (let pass = 0; pass < dilate; pass += 1) {
      const snap = Buffer.from(rgba)
      for (let y = 1; y < height - 1; y += 1) {
        for (let x = 1; x < width - 1; x += 1) {
          const i = (y * width + x) * 4
          if (snap[i + 3] !== 0) continue
          let sample = null
          for (const [dx, dy] of [
            [-1, 0],
            [1, 0],
            [0, -1],
            [0, 1],
          ]) {
            const ni = ((y + dy) * width + (x + dx)) * 4
            if (snap[ni + 3] === 255) {
              sample = ni
              break
            }
          }
          if (sample == null) continue
          rgba[i] = src[sample]
          rgba[i + 1] = src[sample + 1]
          rgba[i + 2] = src[sample + 2]
          rgba[i + 3] = 255
        }
      }
    }
  }
  return rgba
}

async function texturedPassportCover() {
  // Use the clean official cover (no studio white fringe), then add leather grain.
  const vectorPath = path.join(refs, 'passport-cover-clean.png')
  const { data, info } = await sharp(vectorPath)
    .ensureAlpha()
    .resize(420, 600, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true })

  const hard = await hardenAlpha(Buffer.from(data), info.width, info.height)
  const base = await sharp(hard, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer()

  const grain = Buffer.from(`<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" width="420" height="600">
  <defs>
    <pattern id="leather" width="7" height="7" patternUnits="userSpaceOnUse">
      <circle cx="1" cy="2" r="0.65" fill="#000" opacity="0.22"/>
      <circle cx="4.5" cy="5.5" r="0.55" fill="#fff" opacity="0.07"/>
    </pattern>
    <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fff" stop-opacity="0.08"/>
      <stop offset="40%" stop-color="#fff" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0.14"/>
    </linearGradient>
    <mask id="book">
      <rect width="420" height="600" fill="#000"/>
      <rect x="2" y="2" width="416" height="596" rx="8" fill="#fff"/>
    </mask>
  </defs>
  <g mask="url(#book)">
    <rect width="420" height="600" fill="url(#leather)"/>
    <rect width="420" height="600" fill="url(#sheen)"/>
  </g>
</svg>`)

  const grainBuf = await sharp(grain).png().toBuffer()
  const textured = await sharp(base)
    .composite([{ input: grainBuf, blend: 'soft-light' }])
    .raw()
    .toBuffer({ resolveWithObject: true })

  const final = await hardenAlpha(
    Buffer.from(textured.data),
    textured.info.width,
    textured.info.height,
    { cut: 160 },
  )

  return sharp(final, {
    raw: {
      width: textured.info.width,
      height: textured.info.height,
      channels: 4,
    },
  })
    .png()
    .toBuffer()
}

async function buildDocs() {
  const bio = await sharp(Buffer.from(passportBioSvg()), { density: 180 })
    .resize(520, 728, { fit: 'fill' })
    .png()
    .toBuffer()
  const nid = await sharp(Buffer.from(nidFrontSvg()), { density: 180 })
    .resize(460, 291, { fit: 'fill' })
    .png()
    .toBuffer()
  const cover = await texturedPassportCover()
  return { bio, nid, cover }
}

async function sceneToday(docs) {
  const W = 1440
  const H = 1080
  const bg = Buffer.from(`<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#4a1410"/>
      <stop offset="55%" stop-color="#8f2418"/>
      <stop offset="100%" stop-color="#b45309"/>
    </linearGradient>
    <pattern id="desk" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M0 40 L40 0" stroke="#000" stroke-opacity="0.05" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <rect width="${W}" height="${H}" fill="url(#desk)"/>
  <ellipse cx="720" cy="900" rx="520" ry="90" fill="#000" opacity="0.22"/>
</svg>`)

  const phone = Buffer.from(`<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" width="240" height="420">
  <rect width="240" height="420" rx="28" fill="#111"/>
  <rect x="10" y="10" width="220" height="400" rx="22" fill="#0b1410"/>
  <rect x="10" y="10" width="220" height="54" rx="22" fill="#075e54"/>
  <rect x="10" y="42" width="220" height="22" fill="#075e54"/>
  <text x="28" y="44" font-family="Arial" font-size="16" fill="#fff" font-weight="700">WhatsApp</text>
  <rect x="24" y="84" width="150" height="46" rx="12" fill="#202c33"/>
  <text x="36" y="112" font-family="Arial" font-size="13" fill="#e9edef">Any update on Rahim?</text>
  <rect x="66" y="146" width="150" height="46" rx="12" fill="#005c4b"/>
  <text x="78" y="174" font-family="Arial" font-size="13" fill="#e9edef">Who has passport?</text>
  <rect x="24" y="210" width="170" height="46" rx="12" fill="#202c33"/>
  <text x="36" y="238" font-family="Arial" font-size="13" fill="#e9edef">NID copy lagbe asap</text>
  <circle cx="198" cy="360" r="18" fill="#25d366"/>
  <text x="198" y="366" text-anchor="middle" font-family="Arial" font-size="14" fill="#053" font-weight="700">3</text>
</svg>`)

  const sheet = Buffer.from(`<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" width="360" height="250">
  <defs>
    <filter id="ss" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="#000" flood-opacity="0.28"/>
    </filter>
  </defs>
  <rect width="360" height="250" rx="6" fill="#fff" filter="url(#ss)"/>
  <!-- Excel title bar -->
  <rect width="360" height="28" rx="6" fill="#217346"/>
  <rect y="14" width="360" height="14" fill="#217346"/>
  <circle cx="14" cy="14" r="4" fill="#fff" opacity="0.85"/>
  <text x="28" y="18" font-family="Arial" font-size="12" font-weight="700" fill="#fff">Umrah_list.xlsx</text>
  <!-- formula bar -->
  <rect y="28" width="360" height="22" fill="#f3f3f3" stroke="#d0d0d0" stroke-width="1"/>
  <text x="10" y="43" font-family="Arial" font-size="11" fill="#666">fx</text>
  <text x="32" y="43" font-family="Arial" font-size="11" fill="#333">Unpaid · stage blank</text>
  <!-- corner + col headers -->
  <rect x="0" y="50" width="28" height="22" fill="#e7e6e6" stroke="#b1b1b1" stroke-width="0.75"/>
  <rect x="28" y="50" width="110" height="22" fill="#e7e6e6" stroke="#b1b1b1" stroke-width="0.75"/>
  <rect x="138" y="50" width="74" height="22" fill="#e7e6e6" stroke="#b1b1b1" stroke-width="0.75"/>
  <rect x="212" y="50" width="74" height="22" fill="#e7e6e6" stroke="#b1b1b1" stroke-width="0.75"/>
  <rect x="286" y="50" width="74" height="22" fill="#e7e6e6" stroke="#b1b1b1" stroke-width="0.75"/>
  <text x="72" y="65" text-anchor="middle" font-family="Arial" font-size="11" font-weight="700" fill="#444">A</text>
  <text x="175" y="65" text-anchor="middle" font-family="Arial" font-size="11" font-weight="700" fill="#444">B</text>
  <text x="249" y="65" text-anchor="middle" font-family="Arial" font-size="11" font-weight="700" fill="#444">C</text>
  <text x="323" y="65" text-anchor="middle" font-family="Arial" font-size="11" font-weight="700" fill="#444">D</text>
  <!-- rows -->
  ${[0, 1, 2, 3, 4, 5]
    .map((row) => {
      const y = 72 + row * 28
      const n = row + 1
      const zebra = row % 2 === 0 ? '#fff' : '#fafafa'
      const payFill = row === 2 || row === 4 ? '#fce4e4' : zebra
      const stageFill = row === 1 || row === 4 ? '#fff4cc' : zebra
      return `
      <rect x="0" y="${y}" width="28" height="28" fill="#e7e6e6" stroke="#b1b1b1" stroke-width="0.75"/>
      <text x="14" y="${y + 18}" text-anchor="middle" font-family="Arial" font-size="11" fill="#555">${n}</text>
      <rect x="28" y="${y}" width="110" height="28" fill="${zebra}" stroke="#d0d0d0" stroke-width="0.75"/>
      <rect x="138" y="${y}" width="74" height="28" fill="${payFill}" stroke="#d0d0d0" stroke-width="0.75"/>
      <rect x="212" y="${y}" width="74" height="28" fill="${stageFill}" stroke="#d0d0d0" stroke-width="0.75"/>
      <rect x="286" y="${y}" width="74" height="28" fill="${zebra}" stroke="#d0d0d0" stroke-width="0.75"/>
      `
    })
    .join('')}
  <text x="36" y="90" font-family="Arial" font-size="11" font-weight="700" fill="#217346">Name</text>
  <text x="146" y="90" font-family="Arial" font-size="11" font-weight="700" fill="#217346">Paid</text>
  <text x="220" y="90" font-family="Arial" font-size="11" font-weight="700" fill="#217346">Stage</text>
  <text x="294" y="90" font-family="Arial" font-size="11" font-weight="700" fill="#217346">Passport</text>
  <text x="36" y="118" font-family="Arial" font-size="11" fill="#222">Rahim U.</text>
  <text x="146" y="118" font-family="Arial" font-size="11" fill="#222">৳20k</text>
  <text x="220" y="118" font-family="Arial" font-size="11" fill="#8a5a00">?</text>
  <text x="294" y="118" font-family="Arial" font-size="11" fill="#222">missing</text>
  <text x="36" y="146" font-family="Arial" font-size="11" fill="#222">N. Akter</text>
  <text x="146" y="146" font-family="Arial" font-size="11" fill="#b91c1c">unpaid</text>
  <text x="220" y="146" font-family="Arial" font-size="11" fill="#222">Docs?</text>
  <text x="294" y="146" font-family="Arial" font-size="11" fill="#222">scan?</text>
  <text x="36" y="174" font-family="Arial" font-size="11" fill="#222">Karim H.</text>
  <text x="146" y="174" font-family="Arial" font-size="11" fill="#222">৳45k</text>
  <text x="220" y="174" font-family="Arial" font-size="11" fill="#222">Visa</text>
  <text x="294" y="174" font-family="Arial" font-size="11" fill="#222">ok</text>
  <text x="36" y="202" font-family="Arial" font-size="11" fill="#222">Sultana</text>
  <text x="146" y="202" font-family="Arial" font-size="11" fill="#b91c1c">unpaid</text>
  <text x="220" y="202" font-family="Arial" font-size="11" fill="#8a5a00">blank</text>
  <text x="294" y="202" font-family="Arial" font-size="11" fill="#222">?</text>
</svg>`)

  const missedCall = Buffer.from(`<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="64">
  <rect width="200" height="64" rx="32" fill="#1a0706" fill-opacity="0.55"/>
  <circle cx="34" cy="32" r="16" fill="#ffb000"/>
  <path d="M27 28 C30 23, 39 23, 42 29 C40 37, 36 41, 30 42 C26 38, 25 33, 27 28 Z" fill="#8f1f16"/>
  <text x="60" y="28" font-family="Arial" font-size="14" font-weight="700" fill="#fff7f4">Missed calls</text>
  <text x="60" y="46" font-family="Arial" font-size="12" fill="#ffcfb8">Client · 7 today</text>
</svg>`)

  const unhappy = Buffer.from(`<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" width="230" height="64">
  <rect width="230" height="64" rx="32" fill="#fff1ec"/>
  <circle cx="34" cy="32" r="16" fill="#ffe1d8"/>
  <circle cx="28" cy="28" r="2" fill="#c2410c"/>
  <circle cx="40" cy="28" r="2" fill="#c2410c"/>
  <path d="M27 40 Q34 34 41 40" stroke="#c2410c" stroke-width="2" fill="none" stroke-linecap="round"/>
  <text x="60" y="28" font-family="Arial" font-size="14" font-weight="700" fill="#9f1239">Dissatisfied clients</text>
  <text x="60" y="46" font-family="Arial" font-size="12" fill="#c2410c">Waiting on updates</text>
</svg>`)

  const bioRot = await sharp(docs.bio).rotate(-8, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()
  const coverRotRaw = await sharp(docs.cover)
    .rotate(14, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const coverRotHard = await hardenAlpha(
    Buffer.from(coverRotRaw.data),
    coverRotRaw.info.width,
    coverRotRaw.info.height,
    { cut: 160, dilate: 4 },
  )
  const coverRot = await sharp(coverRotHard, {
    raw: {
      width: coverRotRaw.info.width,
      height: coverRotRaw.info.height,
      channels: 4,
    },
  })
    .png()
    .toBuffer()
  const nidRot = await sharp(docs.nid).rotate(-4, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()
  const phoneBuf = await sharp(phone).rotate(7, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()
  const sheetBuf = await sharp(sheet).rotate(-10, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()
  const missedBuf = await sharp(missedCall)
    .rotate(6, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()
  const unhappyBuf = await sharp(unhappy)
    .rotate(-5, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()

  const bioMeta = await sharp(bioRot).metadata()
  const coverMeta = await sharp(coverRot).metadata()
  const nidMeta = await sharp(nidRot).metadata()
  const phoneMeta = await sharp(phoneBuf).metadata()
  const sheetMeta = await sharp(sheetBuf).metadata()
  const missedMeta = await sharp(missedBuf).metadata()
  const unhappyMeta = await sharp(unhappyBuf).metadata()

  return sharp(bg)
    .composite([
      { input: await softShadow(bioMeta.width, bioMeta.height), left: 390, top: 150 },
      { input: bioRot, left: 380, top: 130 },
      { input: await softShadow(coverMeta.width, coverMeta.height, { opacity: 0.4 }), left: 70, top: 170 },
      { input: coverRot, left: 60, top: 150 },
      { input: await softShadow(nidMeta.width, nidMeta.height), left: 820, top: 470 },
      { input: nidRot, left: 810, top: 455 },
      { input: await softShadow(phoneMeta.width, phoneMeta.height, { blur: 18 }), left: 1080, top: 120 },
      { input: phoneBuf, left: 1070, top: 110 },
      { input: await softShadow(sheetMeta.width, sheetMeta.height, { blur: 16 }), left: 90, top: 670 },
      { input: sheetBuf, left: 80, top: 660 },
      { input: await softShadow(missedMeta.width, missedMeta.height, { blur: 14, opacity: 0.3 }), left: 480, top: 780 },
      { input: missedBuf, left: 470, top: 770 },
      { input: await softShadow(unhappyMeta.width, unhappyMeta.height, { blur: 14, opacity: 0.28 }), left: 720, top: 820 },
      { input: unhappyBuf, left: 710, top: 810 },
    ])
    .png()
    .toBuffer()
}

async function hardenPng(buf, opts) {
  const raw = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const hard = await hardenAlpha(Buffer.from(raw.data), raw.info.width, raw.info.height, opts)
  return sharp(hard, {
    raw: { width: raw.info.width, height: raw.info.height, channels: 4 },
  })
    .png()
    .toBuffer()
}

async function sceneOneTrack(docs) {
  const W = 1440
  const H = 1080

  // Clean file card again, plus small perk previews around it.
  const bg = Buffer.from(`<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0.2" y2="1">
      <stop offset="0%" stop-color="#050d22"/>
      <stop offset="60%" stop-color="#0c2d79"/>
      <stop offset="100%" stop-color="#1d4ed8"/>
    </linearGradient>
    <radialGradient id="glow" cx="58%" cy="36%" r="46%">
      <stop offset="0%" stop-color="#ffb000" stop-opacity="0.26"/>
      <stop offset="100%" stop-color="#ffb000" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#sky)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  ${Array.from({ length: 36 }, (_, i) => {
    const x = (i * 97) % W
    const y = (i * 53) % 520
    return `<circle cx="${x}" cy="${y}" r="${i % 3 === 0 ? 1.5 : 1}" fill="#fff" opacity="${0.18 + (i % 5) * 0.04}"/>`
  }).join('')}
</svg>`)

  const fileChrome = Buffer.from(`<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="700">
  <defs>
    <filter id="s" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="22" stdDeviation="24" flood-color="#020617" flood-opacity="0.45"/>
    </filter>
  </defs>
  <rect width="900" height="700" rx="28" fill="#fbf8f1" filter="url(#s)"/>
  <rect width="900" height="88" rx="28" fill="#0c2d79"/>
  <rect y="56" width="900" height="32" fill="#0c2d79"/>
  <circle cx="52" cy="44" r="20" fill="#ffb000"/>
  <text x="52" y="50" text-anchor="middle" font-family="Arial" font-size="13" font-weight="700" fill="#0c2d79">NA</text>
  <text x="86" y="40" font-family="Arial" font-size="20" font-weight="700" fill="#f2ecdf">N. Akter · Umrah</text>
  <text x="86" y="64" font-family="Arial" font-size="13" fill="#8fb4ff">Passport · NID · payments on one file</text>
  <rect x="720" y="26" width="148" height="34" rx="17" fill="#ffb000"/>
  <text x="794" y="48" text-anchor="middle" font-family="Arial" font-size="13" font-weight="700" fill="#0c2d79">DOCS IN</text>

  <rect x="28" y="116" width="150" height="9" rx="4.5" fill="#0c2d79"/>
  <rect x="190" y="116" width="150" height="9" rx="4.5" fill="#0c2d79"/>
  <rect x="352" y="116" width="150" height="9" rx="4.5" fill="#ffb000"/>
  <rect x="514" y="116" width="150" height="9" rx="4.5" fill="#d1d5db"/>
  <rect x="676" y="116" width="150" height="9" rx="4.5" fill="#d1d5db"/>

  <rect x="28" y="150" width="844" height="50" rx="14" fill="#fff" stroke="#e5e7eb"/>
  <circle cx="56" cy="175" r="11" fill="#0c2d79"/>
  <path d="M50 175 L54 179 L64 168" stroke="#ffb000" stroke-width="2.4" fill="none"/>
  <text x="80" y="181" font-family="Arial" font-size="16" fill="#111" font-weight="600">Passport on file</text>

  <rect x="28" y="212" width="844" height="50" rx="14" fill="#fff" stroke="#e5e7eb"/>
  <circle cx="56" cy="237" r="11" fill="#0c2d79"/>
  <path d="M50 237 L54 241 L64 230" stroke="#ffb000" stroke-width="2.4" fill="none"/>
  <text x="80" y="243" font-family="Arial" font-size="16" fill="#111" font-weight="600">NID verified</text>

  <rect x="28" y="274" width="844" height="50" rx="14" fill="#fff8e8" stroke="#ffb000" stroke-opacity="0.4"/>
  <circle cx="56" cy="299" r="11" fill="#ffb000"/>
  <circle cx="56" cy="299" r="4" fill="#0c2d79"/>
  <text x="80" y="305" font-family="Arial" font-size="16" fill="#8a5a00" font-weight="600">Balance due ৳65,000</text>

  <text x="28" y="360" font-family="Arial" font-size="12" font-weight="700" fill="#6b7280" letter-spacing="0.08em">DOCUMENTS ON THIS FILE</text>
</svg>`)

  // Perk 1: automatic status SMS
  const smsPerk = Buffer.from(`<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" width="280" height="210">
  <defs>
    <filter id="ps" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="14" stdDeviation="12" flood-color="#020617" flood-opacity="0.4"/>
    </filter>
  </defs>
  <rect width="280" height="210" rx="22" fill="#0b1410" filter="url(#ps)"/>
  <rect width="280" height="46" rx="22" fill="#075e54"/>
  <rect y="28" width="280" height="18" fill="#075e54"/>
  <text x="18" y="30" font-family="Arial" font-size="14" font-weight="700" fill="#fff">SMS to client</text>
  <rect x="18" y="66" width="200" height="58" rx="14" fill="#005c4b"/>
  <text x="32" y="90" font-family="Arial" font-size="13" fill="#e9edef">Nusrat, your Umrah file</text>
  <text x="32" y="110" font-family="Arial" font-size="13" fill="#e9edef">is now Docs in.</text>
  <rect x="18" y="140" width="170" height="36" rx="18" fill="#12271f"/>
  <circle cx="38" cy="158" r="8" fill="#25d366"/>
  <path d="M34 158 L37 161 L43 154" stroke="#053" stroke-width="2" fill="none"/>
  <text x="54" y="163" font-family="Arial" font-size="13" font-weight="700" fill="#9ae6b4">Sent automatically</text>
</svg>`)

  // Perk 2: payment logged
  const payPerk = Buffer.from(`<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" width="230" height="96">
  <defs>
    <filter id="ps2" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="10" flood-color="#020617" flood-opacity="0.35"/>
    </filter>
  </defs>
  <rect width="230" height="96" rx="18" fill="#fbf8f1" filter="url(#ps2)"/>
  <circle cx="36" cy="48" r="16" fill="#0c2d79"/>
  <text x="36" y="53" text-anchor="middle" font-family="Arial" font-size="14" font-weight="700" fill="#ffb000">৳</text>
  <text x="64" y="42" font-family="Arial" font-size="14" font-weight="700" fill="#0c2d79">Advance logged</text>
  <text x="64" y="64" font-family="Arial" font-size="13" fill="#6b7280">৳35,000 · just now</text>
</svg>`)

  // Perk 3: stage move
  const stagePerk = Buffer.from(`<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" width="220" height="88">
  <defs>
    <filter id="ps3" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="10" flood-color="#020617" flood-opacity="0.35"/>
    </filter>
  </defs>
  <rect width="220" height="88" rx="18" fill="#0c2d79" filter="url(#ps3)"/>
  <text x="18" y="34" font-family="Arial" font-size="12" fill="#8fb4ff">Stage updated</text>
  <text x="18" y="60" font-family="Arial" font-size="16" font-weight="700" fill="#ffb000">Intake → Docs in</text>
</svg>`)

  const bioSmall = await sharp(docs.bio).resize(168, 236).png().toBuffer()
  const nidSmall = await hardenPng(
    await sharp(docs.nid).resize(220, 140).png().toBuffer(),
    { cut: 140, dilate: 2 },
  )
  const coverSmall = await hardenPng(
    await sharp(docs.cover).resize(120, 172).png().toBuffer(),
    { cut: 140, dilate: 4 },
  )

  const smsBuf = await sharp(smsPerk)
    .rotate(4, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()
  const payBuf = await sharp(payPerk)
    .rotate(-5, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()
  const stageBuf = await sharp(stagePerk)
    .rotate(3, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()

  return sharp(bg)
    .composite([
      { input: await sharp(fileChrome).png().toBuffer(), left: 270, top: 160 },
      // documents row inside the file
      { input: await softShadow(168, 236, { blur: 14, opacity: 0.28 }), left: 320, top: 540 },
      { input: bioSmall, left: 310, top: 530 },
      { input: await softShadow(220, 140, { blur: 14, opacity: 0.26 }), left: 520, top: 590 },
      { input: nidSmall, left: 510, top: 580 },
      { input: await softShadow(120, 172, { blur: 14, opacity: 0.26 }), left: 780, top: 570 },
      { input: coverSmall, left: 770, top: 560 },
      // perk previews
      { input: await softShadow(300, 230, { blur: 16, opacity: 0.3 }), left: 1060, top: 210 },
      { input: smsBuf, left: 1050, top: 200 },
      { input: await softShadow(250, 110, { blur: 14, opacity: 0.28 }), left: 70, top: 430 },
      { input: payBuf, left: 60, top: 420 },
      { input: await softShadow(240, 100, { blur: 14, opacity: 0.28 }), left: 90, top: 200 },
      { input: stageBuf, left: 80, top: 190 },
    ])
    .png()
    .toBuffer()
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true })
  const docs = await buildDocs()
  // also keep isolated doc previews for review
  await sharp(docs.bio).toFile(path.join(outDir, 'doc-passport-bio.png'))
  await sharp(docs.nid).toFile(path.join(outDir, 'doc-nid-front.png'))
  await sharp(docs.cover).toFile(path.join(outDir, 'doc-passport-cover.png'))

  const today = await sceneToday(docs)
  const onetrack = await sceneOneTrack(docs)
  await sharp(today).toFile(path.join(outDir, 'why-switch-today.png'))
  await sharp(onetrack).toFile(path.join(outDir, 'why-switch-onetrack.png'))
  // keep SVG sources archived as generated docs only (png is what we show)
  console.log('wrote why-switch-today.png, why-switch-onetrack.png + doc previews')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
