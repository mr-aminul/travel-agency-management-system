type CountryRecord = {
  name: string
  iso: string
}

/** Destinations this agency sells most often. They stay at the top of the picker. */
const POPULAR_DESTINATIONS: CountryRecord[] = [
  { name: 'Saudi Arabia', iso: 'SA' },
  { name: 'United Arab Emirates', iso: 'AE' },
  { name: 'Qatar', iso: 'QA' },
  { name: 'Kuwait', iso: 'KW' },
  { name: 'Oman', iso: 'OM' },
  { name: 'Bahrain', iso: 'BH' },
  { name: 'Malaysia', iso: 'MY' },
  { name: 'Singapore', iso: 'SG' },
  { name: 'Thailand', iso: 'TH' },
  { name: 'Indonesia', iso: 'ID' },
  { name: 'India', iso: 'IN' },
  { name: 'Pakistan', iso: 'PK' },
  { name: 'Bangladesh', iso: 'BD' },
  { name: 'Nepal', iso: 'NP' },
  { name: 'Sri Lanka', iso: 'LK' },
  { name: 'Maldives', iso: 'MV' },
  { name: 'Turkey', iso: 'TR' },
  { name: 'Egypt', iso: 'EG' },
  { name: 'Jordan', iso: 'JO' },
  { name: 'United Kingdom', iso: 'GB' },
  { name: 'Canada', iso: 'CA' },
  { name: 'United States', iso: 'US' },
  { name: 'Australia', iso: 'AU' },
  { name: 'New Zealand', iso: 'NZ' },
  { name: 'Germany', iso: 'DE' },
  { name: 'Italy', iso: 'IT' },
  { name: 'France', iso: 'FR' },
  { name: 'Spain', iso: 'ES' },
  { name: 'Japan', iso: 'JP' },
  { name: 'South Korea', iso: 'KR' },
  { name: 'China', iso: 'CN' },
]

/** Every other country, plus visa destinations that are not UN member states. */
const OTHER_DESTINATIONS: CountryRecord[] = [
  { name: 'Afghanistan', iso: 'AF' },
  { name: 'Albania', iso: 'AL' },
  { name: 'Algeria', iso: 'DZ' },
  { name: 'Andorra', iso: 'AD' },
  { name: 'Angola', iso: 'AO' },
  { name: 'Antigua and Barbuda', iso: 'AG' },
  { name: 'Argentina', iso: 'AR' },
  { name: 'Armenia', iso: 'AM' },
  { name: 'Austria', iso: 'AT' },
  { name: 'Azerbaijan', iso: 'AZ' },
  { name: 'Bahamas', iso: 'BS' },
  { name: 'Barbados', iso: 'BB' },
  { name: 'Belarus', iso: 'BY' },
  { name: 'Belgium', iso: 'BE' },
  { name: 'Belize', iso: 'BZ' },
  { name: 'Benin', iso: 'BJ' },
  { name: 'Bhutan', iso: 'BT' },
  { name: 'Bolivia', iso: 'BO' },
  { name: 'Bosnia and Herzegovina', iso: 'BA' },
  { name: 'Botswana', iso: 'BW' },
  { name: 'Brazil', iso: 'BR' },
  { name: 'Brunei', iso: 'BN' },
  { name: 'Bulgaria', iso: 'BG' },
  { name: 'Burkina Faso', iso: 'BF' },
  { name: 'Burundi', iso: 'BI' },
  { name: 'Cabo Verde', iso: 'CV' },
  { name: 'Cambodia', iso: 'KH' },
  { name: 'Cameroon', iso: 'CM' },
  { name: 'Central African Republic', iso: 'CF' },
  { name: 'Chad', iso: 'TD' },
  { name: 'Chile', iso: 'CL' },
  { name: 'Colombia', iso: 'CO' },
  { name: 'Comoros', iso: 'KM' },
  { name: 'Costa Rica', iso: 'CR' },
  { name: "Côte d'Ivoire", iso: 'CI' },
  { name: 'Croatia', iso: 'HR' },
  { name: 'Cuba', iso: 'CU' },
  { name: 'Cyprus', iso: 'CY' },
  { name: 'Czech Republic', iso: 'CZ' },
  { name: 'Democratic Republic of the Congo', iso: 'CD' },
  { name: 'Denmark', iso: 'DK' },
  { name: 'Djibouti', iso: 'DJ' },
  { name: 'Dominica', iso: 'DM' },
  { name: 'Dominican Republic', iso: 'DO' },
  { name: 'Ecuador', iso: 'EC' },
  { name: 'El Salvador', iso: 'SV' },
  { name: 'Equatorial Guinea', iso: 'GQ' },
  { name: 'Eritrea', iso: 'ER' },
  { name: 'Estonia', iso: 'EE' },
  { name: 'Eswatini', iso: 'SZ' },
  { name: 'Ethiopia', iso: 'ET' },
  { name: 'Fiji', iso: 'FJ' },
  { name: 'Finland', iso: 'FI' },
  { name: 'Gabon', iso: 'GA' },
  { name: 'Gambia', iso: 'GM' },
  { name: 'Georgia', iso: 'GE' },
  { name: 'Ghana', iso: 'GH' },
  { name: 'Greece', iso: 'GR' },
  { name: 'Grenada', iso: 'GD' },
  { name: 'Guatemala', iso: 'GT' },
  { name: 'Guinea', iso: 'GN' },
  { name: 'Guinea-Bissau', iso: 'GW' },
  { name: 'Guyana', iso: 'GY' },
  { name: 'Haiti', iso: 'HT' },
  { name: 'Honduras', iso: 'HN' },
  { name: 'Hong Kong', iso: 'HK' },
  { name: 'Hungary', iso: 'HU' },
  { name: 'Iceland', iso: 'IS' },
  { name: 'Iran', iso: 'IR' },
  { name: 'Iraq', iso: 'IQ' },
  { name: 'Ireland', iso: 'IE' },
  { name: 'Israel', iso: 'IL' },
  { name: 'Jamaica', iso: 'JM' },
  { name: 'Kazakhstan', iso: 'KZ' },
  { name: 'Kenya', iso: 'KE' },
  { name: 'Kiribati', iso: 'KI' },
  { name: 'Kosovo', iso: 'XK' },
  { name: 'Kyrgyzstan', iso: 'KG' },
  { name: 'Laos', iso: 'LA' },
  { name: 'Latvia', iso: 'LV' },
  { name: 'Lebanon', iso: 'LB' },
  { name: 'Lesotho', iso: 'LS' },
  { name: 'Liberia', iso: 'LR' },
  { name: 'Libya', iso: 'LY' },
  { name: 'Liechtenstein', iso: 'LI' },
  { name: 'Lithuania', iso: 'LT' },
  { name: 'Luxembourg', iso: 'LU' },
  { name: 'Macao', iso: 'MO' },
  { name: 'Madagascar', iso: 'MG' },
  { name: 'Malawi', iso: 'MW' },
  { name: 'Mali', iso: 'ML' },
  { name: 'Malta', iso: 'MT' },
  { name: 'Marshall Islands', iso: 'MH' },
  { name: 'Mauritania', iso: 'MR' },
  { name: 'Mauritius', iso: 'MU' },
  { name: 'Mexico', iso: 'MX' },
  { name: 'Micronesia', iso: 'FM' },
  { name: 'Moldova', iso: 'MD' },
  { name: 'Monaco', iso: 'MC' },
  { name: 'Mongolia', iso: 'MN' },
  { name: 'Montenegro', iso: 'ME' },
  { name: 'Morocco', iso: 'MA' },
  { name: 'Mozambique', iso: 'MZ' },
  { name: 'Myanmar', iso: 'MM' },
  { name: 'Namibia', iso: 'NA' },
  { name: 'Nauru', iso: 'NR' },
  { name: 'Netherlands', iso: 'NL' },
  { name: 'Nicaragua', iso: 'NI' },
  { name: 'Niger', iso: 'NE' },
  { name: 'Nigeria', iso: 'NG' },
  { name: 'North Korea', iso: 'KP' },
  { name: 'North Macedonia', iso: 'MK' },
  { name: 'Norway', iso: 'NO' },
  { name: 'Palau', iso: 'PW' },
  { name: 'Palestine', iso: 'PS' },
  { name: 'Panama', iso: 'PA' },
  { name: 'Papua New Guinea', iso: 'PG' },
  { name: 'Paraguay', iso: 'PY' },
  { name: 'Peru', iso: 'PE' },
  { name: 'Philippines', iso: 'PH' },
  { name: 'Poland', iso: 'PL' },
  { name: 'Portugal', iso: 'PT' },
  { name: 'Republic of the Congo', iso: 'CG' },
  { name: 'Romania', iso: 'RO' },
  { name: 'Russia', iso: 'RU' },
  { name: 'Rwanda', iso: 'RW' },
  { name: 'Saint Kitts and Nevis', iso: 'KN' },
  { name: 'Saint Lucia', iso: 'LC' },
  { name: 'Saint Vincent and the Grenadines', iso: 'VC' },
  { name: 'Samoa', iso: 'WS' },
  { name: 'San Marino', iso: 'SM' },
  { name: 'Sao Tome and Principe', iso: 'ST' },
  { name: 'Senegal', iso: 'SN' },
  { name: 'Serbia', iso: 'RS' },
  { name: 'Seychelles', iso: 'SC' },
  { name: 'Sierra Leone', iso: 'SL' },
  { name: 'Slovakia', iso: 'SK' },
  { name: 'Slovenia', iso: 'SI' },
  { name: 'Solomon Islands', iso: 'SB' },
  { name: 'Somalia', iso: 'SO' },
  { name: 'South Africa', iso: 'ZA' },
  { name: 'South Sudan', iso: 'SS' },
  { name: 'Sudan', iso: 'SD' },
  { name: 'Suriname', iso: 'SR' },
  { name: 'Sweden', iso: 'SE' },
  { name: 'Switzerland', iso: 'CH' },
  { name: 'Syria', iso: 'SY' },
  { name: 'Taiwan', iso: 'TW' },
  { name: 'Tajikistan', iso: 'TJ' },
  { name: 'Tanzania', iso: 'TZ' },
  { name: 'Timor-Leste', iso: 'TL' },
  { name: 'Togo', iso: 'TG' },
  { name: 'Tonga', iso: 'TO' },
  { name: 'Trinidad and Tobago', iso: 'TT' },
  { name: 'Tunisia', iso: 'TN' },
  { name: 'Turkmenistan', iso: 'TM' },
  { name: 'Tuvalu', iso: 'TV' },
  { name: 'Uganda', iso: 'UG' },
  { name: 'Ukraine', iso: 'UA' },
  { name: 'Uruguay', iso: 'UY' },
  { name: 'Uzbekistan', iso: 'UZ' },
  { name: 'Vanuatu', iso: 'VU' },
  { name: 'Vatican City', iso: 'VA' },
  { name: 'Venezuela', iso: 'VE' },
  { name: 'Vietnam', iso: 'VN' },
  { name: 'Yemen', iso: 'YE' },
  { name: 'Zambia', iso: 'ZM' },
  { name: 'Zimbabwe', iso: 'ZW' },
]

const COUNTRY_RECORDS: CountryRecord[] = [
  ...POPULAR_DESTINATIONS,
  ...[...OTHER_DESTINATIONS].sort((left, right) =>
    left.name.localeCompare(right.name, 'en'),
  ),
]

export const DESTINATION_COUNTRIES: readonly string[] = COUNTRY_RECORDS.map(
  (country) => country.name,
)

/** Short names and spellings that should resolve to the same flag. */
const COUNTRY_ALIASES: Record<string, string> = {
  uae: 'AE',
  uk: 'GB',
  'united states of america': 'US',
  usa: 'US',
  korea: 'KR',
  'viet nam': 'VN',
  burma: 'MM',
  swaziland: 'SZ',
  'cape verde': 'CV',
  'east timor': 'TL',
  macau: 'MO',
  'ivory coast': 'CI',
  "cote d'ivoire": 'CI',
  czechia: 'CZ',
  'dr congo': 'CD',
  drc: 'CD',
  'russian federation': 'RU',
}

/** ISO 3166-1 alpha-2 codes for known destination names and common aliases. */
const COUNTRY_ISO_BY_NAME: Record<string, string> = {
  ...COUNTRY_ALIASES,
}

for (const country of COUNTRY_RECORDS) {
  COUNTRY_ISO_BY_NAME[country.name.toLowerCase()] = country.iso
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
