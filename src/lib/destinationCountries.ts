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

export function normalizeCountryName(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
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
    options.push({ value: country, label: country })
  }
  return options
}
