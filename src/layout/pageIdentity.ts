/**
 * Stable page key for remounting route content on navigation.
 * Nested URLs that only open in-page panels keep the parent mounted.
 */
export function pageIdentity(pathname: string): string {
  // Nested case detail renders inside client detail — keep parent mounted.
  // Invoice is a separate route and should remount normally.
  const clientService = pathname.match(
    /^(\/clients\/[^/]+)\/services\/[^/]+$/,
  )
  if (clientService) return clientService[1]

  // Tenant admin shell owns tabs via nested Outlet.
  const tenantAdmin = pathname.match(/^(\/admin\/tenants\/[^/]+)/)
  if (tenantAdmin) return tenantAdmin[1]

  return pathname
}
