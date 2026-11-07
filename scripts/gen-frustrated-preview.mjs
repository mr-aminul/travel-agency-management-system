/**
 * Unified flat-vector "agency chaos" poster for why-switch preview.
 * One authored scene — not a collage of photos on the stock man art.
 */
import sharp from 'sharp'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const out = path.join(root, 'public/images/landing/why-switch-today-frustrated-preview.png')

const W = 1440
const H = 1080

function sceneSvg() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <clipPath id="deskClip"><rect x="180" y="620" width="1080" height="320" rx="8"/></clipPath>
  </defs>

  <!-- Background -->
  <rect width="${W}" height="${H}" fill="#E31B23"/>
  <!-- subtle geometric scatter -->
  <g fill="#c41820" opacity="0.55">
    <circle cx="120" cy="90" r="6"/><circle cx="280" cy="50" r="4"/><circle cx="420" cy="120" r="5"/>
    <circle cx="980" cy="70" r="5"/><circle cx="1180" cy="110" r="4"/><circle cx="1320" cy="60" r="6"/>
    <circle cx="160" cy="220" r="3"/><circle cx="1280" cy="240" r="3"/>
    <polygon points="200,160 210,145 220,160"/><polygon points="1100,150 1112,132 1124,150"/>
    <polygon points="60,300 72,280 84,300"/><polygon points="1360,180 1370,165 1380,180"/>
    <rect x="340" y="40" width="8" height="8" transform="rotate(20 344 44)"/>
    <rect x="1240" y="200" width="7" height="7" transform="rotate(-15 1243 203)"/>
  </g>

  <!-- Floating passport (flat) — left -->
  <g transform="translate(70,140) rotate(-14)">
    <rect x="0" y="0" width="210" height="300" rx="10" fill="#0B1B3A"/>
    <rect x="10" y="10" width="190" height="280" rx="6" fill="#1B6B3A"/>
    <circle cx="105" cy="118" r="38" fill="#0B1B3A"/>
    <circle cx="105" cy="118" r="28" fill="#C9A227"/>
    <circle cx="105" cy="118" r="18" fill="#1B6B3A"/>
    <text x="105" y="200" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="15" font-weight="700" fill="#F4E8C1" letter-spacing="2">PASSPORT</text>
    <text x="105" y="228" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="11" fill="#D4E8D4">BANGLADESH</text>
    <rect x="0" y="0" width="14" height="300" rx="4" fill="#0B1B3A"/>
  </g>

  <!-- Passport bio page (flat paper) — behind left -->
  <g transform="translate(250,90) rotate(8)">
    <rect x="0" y="0" width="230" height="310" rx="6" fill="#F7F3EA"/>
    <rect x="14" y="18" width="70" height="90" fill="#C5CCD8"/>
    <circle cx="49" cy="52" r="16" fill="#4A5568"/>
    <path d="M26 100 C30 72 68 72 72 100 Z" fill="#4A5568"/>
    <text x="100" y="36" font-family="Arial,Helvetica,sans-serif" font-size="11" font-weight="700" fill="#0B1B3A">NUSRAT AKTER</text>
    <text x="100" y="56" font-family="Arial,Helvetica,sans-serif" font-size="10" fill="#5A6478">Passport No</text>
    <text x="100" y="72" font-family="Arial,Helvetica,sans-serif" font-size="12" font-weight="700" fill="#0B1B3A">A01234567</text>
    <text x="100" y="96" font-family="Arial,Helvetica,sans-serif" font-size="10" fill="#5A6478">Expiry</text>
    <text x="100" y="112" font-family="Arial,Helvetica,sans-serif" font-size="12" fill="#0B1B3A">14 JAN 2033</text>
    <line x1="14" y1="130" x2="216" y2="130" stroke="#D2CBB8" stroke-width="2"/>
    <rect x="14" y="148" width="202" height="10" rx="2" fill="#E8E1D2"/>
    <rect x="14" y="170" width="160" height="10" rx="2" fill="#E8E1D2"/>
    <rect x="14" y="192" width="180" height="10" rx="2" fill="#E8E1D2"/>
    <rect x="14" y="214" width="140" height="10" rx="2" fill="#E8E1D2"/>
    <text x="14" y="270" font-family="Arial,Helvetica,sans-serif" font-size="10" fill="#8A7F6A">BIO DATA PAGE</text>
  </g>

  <!-- WhatsApp phone (flat) — top right -->
  <g transform="translate(1120,70) rotate(9)">
    <rect x="0" y="0" width="220" height="380" rx="28" fill="#0B1B3A"/>
    <rect x="10" y="10" width="200" height="360" rx="22" fill="#0E1F18"/>
    <rect x="10" y="10" width="200" height="52" rx="22" fill="#075E54"/>
    <rect x="10" y="36" width="200" height="26" fill="#075E54"/>
    <circle cx="42" cy="36" r="14" fill="#128C7E"/>
    <text x="64" y="42" font-family="Arial,Helvetica,sans-serif" font-size="15" font-weight="700" fill="#fff">Clients</text>
    <!-- bubbles -->
    <rect x="24" y="80" width="140" height="44" rx="14" fill="#1F2C34"/>
    <text x="38" y="108" font-family="Arial,Helvetica,sans-serif" font-size="13" fill="#E9EDEF">Any update?</text>
    <rect x="56" y="138" width="140" height="44" rx="14" fill="#005C4B"/>
    <text x="70" y="166" font-family="Arial,Helvetica,sans-serif" font-size="13" fill="#E9EDEF">Who has passport?</text>
    <rect x="24" y="196" width="150" height="44" rx="14" fill="#1F2C34"/>
    <text x="38" y="224" font-family="Arial,Helvetica,sans-serif" font-size="13" fill="#E9EDEF">NID copy lagbe</text>
    <rect x="56" y="254" width="130" height="40" rx="14" fill="#005C4B"/>
    <text x="70" y="280" font-family="Arial,Helvetica,sans-serif" font-size="13" fill="#E9EDEF">Send scan asap</text>
    <circle cx="178" cy="330" r="18" fill="#25D366"/>
    <text x="178" y="336" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="15" font-weight="700" fill="#053B1A">3</text>
  </g>

  <!-- NID card (flat) — mid right -->
  <g transform="translate(1040,480) rotate(-8)">
    <rect x="0" y="0" width="320" height="200" rx="12" fill="#F4F0E6"/>
    <rect x="0" y="0" width="320" height="36" rx="12" fill="#0B1B3A"/>
    <rect x="0" y="20" width="320" height="16" fill="#0B1B3A"/>
    <text x="16" y="24" font-family="Arial,Helvetica,sans-serif" font-size="11" font-weight="700" fill="#F4E8C1">NATIONAL ID CARD</text>
    <rect x="16" y="52" width="78" height="100" fill="#C5CCD8"/>
    <circle cx="55" cy="88" r="18" fill="#4A5568"/>
    <path d="M28 144 C32 112 78 112 82 144 Z" fill="#4A5568"/>
    <text x="110" y="72" font-family="Arial,Helvetica,sans-serif" font-size="10" fill="#6B7280">Name</text>
    <text x="110" y="92" font-family="Arial,Helvetica,sans-serif" font-size="16" font-weight="700" fill="#0B1B3A">NUSRAT AKTER</text>
    <text x="110" y="118" font-family="Arial,Helvetica,sans-serif" font-size="10" fill="#6B7280">NID</text>
    <text x="110" y="138" font-family="Arial,Helvetica,sans-serif" font-size="14" font-weight="700" fill="#0B1B3A">1994123456</text>
    <text x="110" y="168" font-family="Arial,Helvetica,sans-serif" font-size="11" fill="#9A3412">Copy missing · chase client</text>
  </g>

  <!-- Desk surface -->
  <rect x="200" y="640" width="1040" height="280" rx="6" fill="#0B1B3A"/>
  <rect x="210" y="650" width="1020" height="18" fill="#152848"/>

  <!-- Laptop (flat) left on desk -->
  <g transform="translate(240,520)">
    <rect x="20" y="0" width="200" height="130" rx="6" fill="#0B1B3A"/>
    <rect x="28" y="8" width="184" height="114" rx="3" fill="#1A2F55"/>
    <rect x="70" y="50" width="100" height="8" rx="2" fill="#2A4570"/>
    <rect x="90" y="70" width="60" height="8" rx="2" fill="#2A4570"/>
    <path d="M0 130 L240 130 L220 155 L20 155 Z" fill="#152848"/>
  </g>

  <!-- Excel sheet on desk (flat, same language) -->
  <g transform="translate(480,560) rotate(-3)">
    <rect x="0" y="0" width="420" height="260" rx="8" fill="#FFFFFF"/>
    <rect x="0" y="0" width="420" height="32" rx="8" fill="#217346"/>
    <rect x="0" y="18" width="420" height="14" fill="#217346"/>
    <text x="14" y="22" font-family="Arial,Helvetica,sans-serif" font-size="14" font-weight="700" fill="#fff">Umrah_list.xlsx</text>
    <!-- col headers -->
    <rect x="0" y="32" width="420" height="28" fill="#E8F5EE"/>
    <text x="20" y="51" font-family="Arial,Helvetica,sans-serif" font-size="13" font-weight="700" fill="#217346">Name</text>
    <text x="140" y="51" font-family="Arial,Helvetica,sans-serif" font-size="13" font-weight="700" fill="#217346">Paid</text>
    <text x="240" y="51" font-family="Arial,Helvetica,sans-serif" font-size="13" font-weight="700" fill="#217346">Stage</text>
    <text x="330" y="51" font-family="Arial,Helvetica,sans-serif" font-size="13" font-weight="700" fill="#217346">Passport</text>
    <!-- rows -->
    <line x1="0" y1="60" x2="420" y2="60" stroke="#D0D0D0" stroke-width="1"/>
    <text x="20" y="88" font-family="Arial,Helvetica,sans-serif" font-size="14" fill="#1A1A1A">Rahim U.</text>
    <text x="140" y="88" font-family="Arial,Helvetica,sans-serif" font-size="14" fill="#1A1A1A">৳20k</text>
    <rect x="228" y="72" width="36" height="24" rx="4" fill="#FFF4CC"/>
    <text x="240" y="88" font-family="Arial,Helvetica,sans-serif" font-size="14" fill="#8A5A00">?</text>
    <text x="330" y="88" font-family="Arial,Helvetica,sans-serif" font-size="14" fill="#B91C1C">missing</text>
    <line x1="0" y1="108" x2="420" y2="108" stroke="#E5E5E5" stroke-width="1"/>
    <text x="20" y="136" font-family="Arial,Helvetica,sans-serif" font-size="14" fill="#1A1A1A">N. Akter</text>
    <rect x="128" y="120" width="70" height="24" rx="4" fill="#FCE4E4"/>
    <text x="140" y="136" font-family="Arial,Helvetica,sans-serif" font-size="14" fill="#B91C1C">unpaid</text>
    <text x="240" y="136" font-family="Arial,Helvetica,sans-serif" font-size="14" fill="#1A1A1A">Docs?</text>
    <text x="330" y="136" font-family="Arial,Helvetica,sans-serif" font-size="14" fill="#B91C1C">scan?</text>
    <line x1="0" y1="156" x2="420" y2="156" stroke="#E5E5E5" stroke-width="1"/>
    <text x="20" y="184" font-family="Arial,Helvetica,sans-serif" font-size="14" fill="#1A1A1A">Karim H.</text>
    <text x="140" y="184" font-family="Arial,Helvetica,sans-serif" font-size="14" fill="#1A1A1A">৳45k</text>
    <text x="240" y="184" font-family="Arial,Helvetica,sans-serif" font-size="14" fill="#1A1A1A">Visa</text>
    <text x="330" y="184" font-family="Arial,Helvetica,sans-serif" font-size="14" fill="#217346">ok</text>
    <line x1="0" y1="204" x2="420" y2="204" stroke="#E5E5E5" stroke-width="1"/>
    <text x="20" y="232" font-family="Arial,Helvetica,sans-serif" font-size="14" fill="#1A1A1A">Sultana</text>
    <rect x="128" y="216" width="70" height="24" rx="4" fill="#FCE4E4"/>
    <text x="140" y="232" font-family="Arial,Helvetica,sans-serif" font-size="14" fill="#B91C1C">unpaid</text>
    <rect x="228" y="216" width="60" height="24" rx="4" fill="#FFF4CC"/>
    <text x="240" y="232" font-family="Arial,Helvetica,sans-serif" font-size="14" fill="#8A5A00">blank</text>
    <text x="330" y="232" font-family="Arial,Helvetica,sans-serif" font-size="14" fill="#B91C1C">?</text>
  </g>

  <!-- Small passport on desk right of sheet -->
  <g transform="translate(920,600) rotate(12)">
    <rect x="0" y="0" width="120" height="170" rx="6" fill="#1B6B3A"/>
    <circle cx="60" cy="70" r="22" fill="#0B1B3A"/>
    <circle cx="60" cy="70" r="14" fill="#C9A227"/>
    <text x="60" y="120" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="10" font-weight="700" fill="#F4E8C1">PASSPORT</text>
  </g>

  <!-- Mug -->
  <g transform="translate(1060,620)">
    <rect x="0" y="20" width="54" height="62" rx="6" fill="#E31B23"/>
    <rect x="8" y="28" width="38" height="46" rx="3" fill="#C41820"/>
    <path d="M54 34 Q72 40 72 52 Q72 64 54 68" fill="none" stroke="#0B1B3A" stroke-width="6" stroke-linecap="round"/>
    <path d="M16 8 Q22 0 28 8" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity="0.7"/>
    <path d="M30 6 Q36 -2 42 6" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity="0.55"/>
  </g>

  <!-- Pen + paper stack -->
  <rect x="1120" y="700" width="70" height="10" rx="2" fill="#FFFFFF" opacity="0.9"/>
  <rect x="1125" y="712" width="70" height="10" rx="2" fill="#F0EDE6"/>
  <rect x="1130" y="724" width="70" height="10" rx="2" fill="#FFFFFF" opacity="0.85"/>
  <g transform="translate(1200,680) rotate(35)">
    <rect x="0" y="0" width="10" height="90" rx="3" fill="#E31B23"/>
    <rect x="1" y="0" width="8" height="14" rx="2" fill="#0B1B3A"/>
  </g>

  <!-- Man: flat silhouette, navy suit, red tie — center, hands on head -->
  <g transform="translate(620,180)">
    <!-- head (faceless oval) -->
    <ellipse cx="100" cy="70" rx="52" ry="58" fill="#2A1F1A"/>
    <!-- hair / crown shadow -->
    <ellipse cx="100" cy="42" rx="48" ry="28" fill="#1A1410"/>
    <!-- hands gripping head -->
    <ellipse cx="42" cy="78" rx="22" ry="28" fill="#2A1F1A" transform="rotate(-18 42 78)"/>
    <ellipse cx="158" cy="78" rx="22" ry="28" fill="#2A1F1A" transform="rotate(18 158 78)"/>
    <!-- forearms -->
    <rect x="18" y="100" width="28" height="90" rx="12" fill="#2A1F1A" transform="rotate(-12 32 145)"/>
    <rect x="154" y="100" width="28" height="90" rx="12" fill="#2A1F1A" transform="rotate(12 168 145)"/>
    <!-- torso / suit -->
    <path d="M30 160
      C20 220, 18 300, 28 380
      L172 380
      C182 300, 180 220, 170 160
      C150 148, 50 148, 30 160 Z" fill="#0B1B3A"/>
    <!-- shirt V -->
    <path d="M88 168 L100 230 L112 168 Z" fill="#F5F5F5"/>
    <!-- red tie -->
    <path d="M100 175 L92 210 L100 320 L108 210 Z" fill="#E31B23"/>
    <path d="M92 175 L100 188 L108 175 Z" fill="#C41820"/>
    <!-- shoulders / sleeves -->
    <ellipse cx="18" cy="200" rx="28" ry="40" fill="#0B1B3A"/>
    <ellipse cx="182" cy="200" rx="28" ry="40" fill="#0B1B3A"/>
    <!-- jacket bottom over desk -->
    <rect x="28" y="360" width="144" height="40" fill="#0B1B3A"/>
  </g>

  <!-- Alert pills — bottom, same flat language -->
  <g transform="translate(420,900)">
    <rect x="0" y="0" width="260" height="70" rx="35" fill="#0B1B3A"/>
    <circle cx="40" cy="35" r="20" fill="#FFB000"/>
    <path d="M32 30 C36 24 46 24 50 32 C48 42 42 48 34 48 C28 42 28 34 32 30 Z" fill="#8F1F16"/>
    <text x="72" y="30" font-family="Arial,Helvetica,sans-serif" font-size="16" font-weight="700" fill="#FFF7F4">Missed calls</text>
    <text x="72" y="52" font-family="Arial,Helvetica,sans-serif" font-size="14" fill="#FFCFB8">Client · 7 today</text>
  </g>

  <g transform="translate(720,910)">
    <rect x="0" y="0" width="300" height="70" rx="35" fill="#FFF1EC"/>
    <circle cx="40" cy="35" r="20" fill="#FFE1D8"/>
    <circle cx="33" cy="30" r="2.5" fill="#C2410C"/>
    <circle cx="47" cy="30" r="2.5" fill="#C2410C"/>
    <path d="M30 44 Q40 36 50 44" stroke="#C2410C" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <text x="72" y="30" font-family="Arial,Helvetica,sans-serif" font-size="16" font-weight="700" fill="#9F1239">Dissatisfied clients</text>
    <text x="72" y="52" font-family="Arial,Helvetica,sans-serif" font-size="14" fill="#C2410C">Waiting on updates</text>
  </g>

  <!-- Tiny sticky note on sheet corner -->
  <g transform="translate(820,548) rotate(8)">
    <rect x="0" y="0" width="70" height="48" rx="3" fill="#E31B23"/>
    <text x="35" y="30" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="13" font-weight="700" fill="#fff">CHAOS</text>
  </g>
</svg>`
}

async function main() {
  await sharp(Buffer.from(sceneSvg())).png().toFile(out)
  console.log('wrote', out)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
