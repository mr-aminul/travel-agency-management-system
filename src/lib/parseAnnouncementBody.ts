export type AnnouncementBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'bullets'; items: string[] }
  | { type: 'steps'; items: string[] }

const BULLET_RE = /^\s*(?:[•\-*]|–)\s+(.+)$/
const STEP_RE = /^\s*(\d+)[.)]\s+(.+)$/
const HEADING_RE = /^([A-Za-z][A-Za-z0-9 /&'-]{1,48}):\s*$/

/**
 * Turn plain announcement copy into boxed sections for the agency popup.
 * Supports headings ending with `:`, `•` bullets, and `1.` numbered steps.
 */
export function parseAnnouncementBody(body: string): AnnouncementBlock[] {
  const lines = String(body ?? '')
    .replace(/\r\n/g, '\n')
    .split('\n')
  const blocks: AnnouncementBlock[] = []
  let paragraph: string[] = []
  let bullets: string[] = []
  let steps: string[] = []

  const flushParagraph = () => {
    const text = paragraph.join(' ').trim()
    paragraph = []
    if (text) blocks.push({ type: 'paragraph', text })
  }

  const flushBullets = () => {
    if (!bullets.length) return
    blocks.push({ type: 'bullets', items: bullets })
    bullets = []
  }

  const flushSteps = () => {
    if (!steps.length) return
    blocks.push({ type: 'steps', items: steps })
    steps = []
  }

  for (const raw of lines) {
    const line = raw.trimEnd()
    if (!line.trim()) {
      flushParagraph()
      flushBullets()
      flushSteps()
      continue
    }

    const heading = line.trim().match(HEADING_RE)
    if (heading) {
      flushParagraph()
      flushBullets()
      flushSteps()
      blocks.push({ type: 'heading', text: heading[1].trim() })
      continue
    }

    const bullet = line.match(BULLET_RE)
    if (bullet) {
      flushParagraph()
      flushSteps()
      bullets.push(bullet[1].trim())
      continue
    }

    const step = line.match(STEP_RE)
    if (step) {
      flushParagraph()
      flushBullets()
      steps.push(step[2].trim())
      continue
    }

    flushBullets()
    flushSteps()
    paragraph.push(line.trim())
  }

  flushParagraph()
  flushBullets()
  flushSteps()
  return blocks
}
