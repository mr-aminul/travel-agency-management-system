/** Same gate as auth/data platform API. */
export function authApiConfigured(): boolean {
  const flag = import.meta.env.VITE_USE_PLATFORM_API as string | undefined
  if (flag === '0' || flag === 'false') return false
  if (flag === '1' || flag === 'true') return true
  return import.meta.env.PROD === true
}
