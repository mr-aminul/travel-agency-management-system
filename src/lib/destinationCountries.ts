export const DESTINATION_COUNTRIES = [
  'Saudi Arabia',
  'United Arab Emirates',
  'Qatar',
  'Kuwait',
  'Oman',
  'Bahrain',
  'Malaysia',
  'Singapore',
  'Thailand',
  'Indonesia',
  'India',
  'Pakistan',
  'Bangladesh',
  'Nepal',
  'Sri Lanka',
  'Maldives',
  'Turkey',
  'Egypt',
  'Jordan',
  'United Kingdom',
  'Canada',
  'United States',
  'Australia',
  'New Zealand',
  'Germany',
  'Italy',
  'France',
  'Spain',
  'Japan',
  'South Korea',
  'China',
] as const

/** ISO 3166-1 alpha-2 codes for known destination names and common aliases. */
const COUNTRY_ISO_BY_NAME: Record<string, string> = {
  'saudi arabia': 'SA',
  'united arab emirates': 'AE',
  uae: 'AE',
  qatar: 'QA',
  kuwait: 'KW',
  oman: 'OM',
  bahrain: 'BH',
  malaysia: 'MY',
  singapore: 'SG',
  thailand: 'TH',
  indonesia: 'ID',
  india: 'IN',
  pakistan: 'PK',
  bangladesh: 'BD',
  nepal: 'NP',
  'sri lanka': 'LK',
  maldives: 'MV',
  turkey: 'TR',
  egypt: 'EG',
  jordan: 'JO',
  'united kingdom': 'GB',
  uk: 'GB',
  canada: 'CA',
  'united states': 'US',
  'united states of america': 'US',
  usa: 'US',
  australia: 'AU',
  'new zealand': 'NZ',
  germany: 'DE',
  italy: 'IT',
  france: 'FR',
  spain: 'ES',
  japan: 'JP',
  'south korea': 'KR',
  korea: 'KR',
  china: 'CN',
}

export function normalizeCountryName(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function flagEmojiFromIso(iso: string): string {
  const code = iso.toUpperCase()
  if (!/^[A-Z]{2}$/.test(code)) return ''
  return String.fromCodePoint(
    ...[...code].map((char) => 0x1f1e6 - 65 + char.charCodeAt(0)),
  )
}

/** Flag emoji for a known country name, or empty string when unknown. */
export function countryFlagEmoji(country: string): string {
  const key = normalizeCountryName(country).toLowerCase()
  if (!key) return ''
  const iso = COUNTRY_ISO_BY_NAME[key]
  return iso ? flagEmojiFromIso(iso) : ''
}

/** Display label with flag prefix when a flag is known. */
export function formatCountryLabel(country: string): string {
  const name = normalizeCountryName(country)
  if (!name) return ''
  const flag = countryFlagEmoji(name)
  return flag ? `${flag} ${name}` : name
}

/** Whether a destination string refers to this country. */
export function destinationMentionsCountry(
  destination: string | undefined,
  country: string,
): boolean {
  const haystack = (destination ?? '').trim().toLowerCase()
  const needle = normalizeCountryName(country).toLowerCase()
  if (!haystack || !needle) return false
  if (haystack === needle) return true
  const parts = haystack.split(/[,/|]/).map((part) => part.trim())
  if (parts.some((part) => part === needle)) return true
  return (
    haystack.endsWith(`, ${needle}`) ||
    haystack.startsWith(`${needle},`) ||
    haystack.endsWith(` ${needle}`)
  )
}

/** Pick the longest matching country name from a destination or country string. */
export function matchCountryFromDestination(
  destination: string | undefined,
  countries: string[],
): string | undefined {
  const ranked = countries
    .map(normalizeCountryName)
    .filter(Boolean)
    .sort((left, right) => right.length - left.length)
  for (const country of ranked) {
    if (destinationMentionsCountry(destination, country)) return country
  }
  return undefined
}

export function formatDestination(city: string, country: string): string {
  const place = city.trim()
  const dest = normalizeCountryName(country)
  if (place && dest) {
    if (destinationMentionsCountry(place, dest)) return place
    return `${place}, ${dest}`
  }
  return place || dest
}

export function destinationCountryOptions(extra: string[] = []) {
  const seen = new Set<string>()
  const options: { value: string; label: string }[] = []
  for (const name of [...extra, ...DESTINATION_COUNTRIES]) {
    const country = normalizeCountryName(name)
    if (!country) continue
    const key = country.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    options.push({ value: country, label: formatCountryLabel(country) })
  }
  return options
}
