import type { ParsedSearchQuery, SearchScope } from './types'

const PREFIXES: Array<{ pattern: RegExp; scope: SearchScope }> = [
  { pattern: /^@\s*/, scope: 'clients' },
  { pattern: /^(client:|clients:)\s*/i, scope: 'clients' },
  { pattern: /^(service:|services:|file:|files:|s:)\s*/i, scope: 'services' },
  { pattern: /^(partner:|partners:|agent:|agents:)\s*/i, scope: 'partners' },
  { pattern: /^(employee:|employees:|emp:|hr:|e:)\s*/i, scope: 'employees' },
  { pattern: /^(page:|pages:|#)\s*/i, scope: 'pages' },
  { pattern: /^(action:|actions:|>)\s*/i, scope: 'actions' },
]

/** Pull a typed scope off the front of the query (`@rahim`, `s:`, `>`). */
export function parseSearchQuery(raw: string): ParsedSearchQuery {
  const trimmed = raw.trim()
  if (!trimmed) return { scope: 'all', text: '' }

  for (const prefix of PREFIXES) {
    const match = prefix.pattern.exec(trimmed)
    if (!match) continue
    return {
      scope: prefix.scope,
      text: trimmed.slice(match[0].length).trim(),
    }
  }

  return { scope: 'all', text: trimmed }
}

export function resolveSearchScope(
  parsed: ParsedSearchQuery,
  chipScope: SearchScope,
): SearchScope {
  return parsed.scope === 'all' ? chipScope : parsed.scope
}
