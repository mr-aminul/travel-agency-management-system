import { clientPath } from '@/lib/workPaths'
import { normalizePhone } from '@/lib/clientsStore'
import type { Client } from '@/types/client'
import type { Partner } from '@/types/partner'

export type GlobalSearchHitKind = 'client' | 'partner'

export type GlobalSearchHit = {
  key: string
  kind: GlobalSearchHitKind
  id: string
  title: string
  subtitle: string
  href: string
  matchLabel: string
  score: number
}

const MAX_HITS = 8

function compact(value?: string | null): string {
  return (value ?? '').trim()
}

function lower(value?: string | null): string {
  return compact(value).toLowerCase()
}

function scoreField(
  value: string,
  query: string,
  weight: number,
): number | null {
  if (!value || !query) return null
  if (value === query) return weight + 40
  if (value.startsWith(query)) return weight + 20
  if (value.includes(query)) return weight
  return null
}

function clientSubtitle(client: Client, matchLabel: string): string {
  const bits = [matchLabel]
  if (client.passport) bits.push(`Passport ${client.passport}`)
  else if (client.nid) bits.push(`NID ${client.nid}`)
  else if (client.phone) bits.push(client.phone)
  return bits.join(' · ')
}

function searchClients(query: string, clients: Client[]): GlobalSearchHit[] {
  const q = lower(query)
  const qDigits = normalizePhone(query)
  const hits: GlobalSearchHit[] = []

  for (const client of clients) {
    const id = lower(client.id)
    const passport = lower(client.passport)
    const nid = lower(client.nid)
    const phone = lower(client.phone)
    const phoneDigits = normalizePhone(client.phone)
    const name = lower(client.name)

    const fields = [
      { label: 'Client ID', score: scoreField(id, q, 90) },
      { label: 'Passport', score: scoreField(passport, q, 85) },
      { label: 'NID', score: scoreField(nid, q, 80) },
      {
        label: 'Mobile',
        score:
          scoreField(phone, q, 75) ??
          (qDigits.length >= 3 ? scoreField(phoneDigits, qDigits, 75) : null),
      },
      { label: 'Name', score: scoreField(name, q, 40) },
    ]
    const match = fields
      .filter((field): field is { label: string; score: number } => field.score !== null)
      .sort((a, b) => b.score - a.score)[0]

    if (!match) continue

    hits.push({
      key: `client:${client.id}`,
      kind: 'client',
      id: client.id,
      title: client.name,
      subtitle: clientSubtitle(client, match.label),
      href: clientPath(client.id),
      matchLabel: match.label,
      score: match.score,
    })
  }

  return hits
}

function searchPartners(
  query: string,
  partners: Partner[],
): GlobalSearchHit[] {
  const q = lower(query)
  const qDigits = normalizePhone(query)
  const hits: GlobalSearchHit[] = []

  for (const partner of partners) {
    const id = lower(partner.id)
    const name = lower(partner.name)
    const phone = lower(partner.phone)
    const phoneDigits = normalizePhone(partner.phone)
    const license = lower(partner.licenseNumber)

    const fields = [
      { label: 'Sub Agent ID', score: scoreField(id, q, 95) },
      { label: 'License', score: scoreField(license, q, 70) },
      {
        label: 'Mobile',
        score:
          scoreField(phone, q, 60) ??
          (qDigits.length >= 3 ? scoreField(phoneDigits, qDigits, 60) : null),
      },
      { label: 'Sub Agent', score: scoreField(name, q, 45) },
    ]
    const match = fields
      .filter((field): field is { label: string; score: number } => field.score !== null)
      .sort((a, b) => b.score - a.score)[0]

    if (!match) continue

    hits.push({
      key: `partner:${partner.id}`,
      kind: 'partner',
      id: partner.id,
      title: partner.name,
      subtitle: `${match.label} · ${partner.id}`,
      href: `/partners/${partner.id}`,
      matchLabel: match.label,
      score: match.score,
    })
  }

  return hits
}

export function searchWorkspace(
  query: string,
  sources: {
    clients: Client[]
    partners?: Partner[]
  },
): GlobalSearchHit[] {
  const trimmed = compact(query)
  if (trimmed.length < 2) return []

  return [...searchClients(trimmed, sources.clients), ...searchPartners(trimmed, sources.partners ?? [])]
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, MAX_HITS)
}
